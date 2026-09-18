import { VersionedTransaction } from "@solana/web3.js";

import { AgentError } from "@/lib/agent-errors";
import { SOL_MINT } from "@/lib/constants";
import { dflowOrder, type DflowOrder } from "@/lib/dflow";
import { nextConfirmIntent, scopedIdempotencyKey } from "@/lib/confirm-machine";
import { executionFromFill, tokenMintForTrade } from "@/lib/confirmed-execution";
import {
  addDailyVolume,
  findAgentById,
  findTradeById,
  findTradeByIdempotency,
  findTradeBySignature,
  insertConfirmedExecution,
  insertTrade,
  insertTradeFeedEvent,
  markTradeConfirmed,
  markTradeConfirming,
  markTradeExpired,
  markTradeFailed,
  updateTrade,
} from "@/lib/db";
import { forgetBookCaches } from "@/lib/book";
import { forgetMuseBoards } from "@/lib/muse-board";
import {
  currentBlockHeight,
  heliusCurrentSlot,
  heliusParsedFill,
  heliusTokenHolding,
  heliusWalletBalances,
  sendSignedTransaction,
  signatureStatus,
} from "@/lib/helius";
import { logInfo, logWarn } from "@/lib/log";
import { usdToSolLamports } from "@/lib/format";
import { getSolUsd, getTokenMarket } from "@/lib/market";
import { assertNever } from "@/lib/never";
import { assertTradeAllowed } from "@/lib/permissions";
import { forgetTapeCaches } from "@/lib/tape";
import type { Agent, Trade, TradeSide, TradeStatus } from "@/lib/types";
import { forgetWalletSnapshot } from "@/lib/wallet";

function tokenMintForSide(side: TradeSide, mint: string): string {
  switch (side) {
    case "buy":
      return mint;
    case "sell":
      return mint;
    default:
      return assertNever(side, "side");
  }
}

export function legsForSide(side: TradeSide, mint: string): { inputMint: string; outputMint: string } {
  switch (side) {
    case "buy":
      return { inputMint: SOL_MINT, outputMint: mint };
    case "sell":
      return { inputMint: mint, outputMint: SOL_MINT };
    default:
      return assertNever(side, "side");
  }
}

export async function quoteTrade(input: {
  mint: string;
  side: TradeSide;
  amount: string;
  userPublicKey?: string;
  slippageBps?: number;
}) {
  const legs = legsForSide(input.side, input.mint);
  return dflowOrder({
    inputMint: legs.inputMint,
    outputMint: legs.outputMint,
    amount: input.amount,
    userPublicKey: input.userPublicKey,
    slippageBps: input.slippageBps,
  });
}

export async function openTrade(input: {
  agent: Agent;
  side: TradeSide;
  mint: string;
  amount: string;
  slippageBps?: number;
  thesisId?: string | null;
  idempotencyKey?: string | null;
  humanPrivyUserId?: string | null;
}): Promise<
  | { ok: true; trade: Trade; transaction: string | null; lastValidBlockHeight: number | null }
  | { ok: false; status: number; code: string; message: string }
> {
  if (!input.idempotencyKey) {
    return {
      ok: false,
      status: 400,
      code: AgentError.IDEMPOTENCY_REQUIRED,
      message: "Idempotency-Key header is required.",
    };
  }
  const agent = await findAgentById(input.agent.id);
  if (!agent || agent.status !== "claimed" || !agent.walletAddress) {
    return {
      ok: false,
      status: 409,
      code: AgentError.AGENT_NOT_CLAIMED,
      message: "Server requires an active claimed agent with a wallet.",
    };
  }
  const idempotencyKey = scopedIdempotencyKey(agent.id, input.idempotencyKey);
  const existing = await findTradeByIdempotency(idempotencyKey, agent.id);
  if (existing) {
    const quote = existing.dflowQuote as { transaction?: string; lastValidBlockHeight?: number } | null;
    return {
      ok: true,
      trade: existing,
      transaction: quote?.transaction ?? null,
      lastValidBlockHeight: quote?.lastValidBlockHeight ?? null,
    };
  }
  const amount = BigInt(input.amount);
  if (amount <= 0n) {
    return { ok: false, status: 400, code: AgentError.INVALID_AMOUNT, message: "Amount must be > 0." };
  }
  const sellEstimate = input.side === "sell" ? await sellNotionalLamports(input.mint, amount) : null;
  const preNotional = input.side === "buy" ? amount : sellEstimate;
  const allowed = await assertTradeAllowed({
    agent,
    mint: tokenMintForSide(input.side, input.mint),
    amountLamports: preNotional ?? 0n,
    enforceVolumeCaps: preNotional != null,
  });
  if (!allowed.ok) {
    return { ok: false, status: 403, code: allowed.denial.code, message: allowed.denial.message };
  }
  const funded = await assertSufficientBalance({
    walletAddress: agent.walletAddress,
    side: input.side,
    mint: input.mint,
    amount,
  });
  if (!funded.ok) return funded;
  const quoted = await quoteTrade({
    mint: input.mint,
    side: input.side,
    amount: input.amount,
    userPublicKey: agent.walletAddress,
    slippageBps: input.slippageBps,
  });
  if (!quoted.ok) {
    return {
      ok: false,
      status: 502,
      code: mapQuoteFailure(quoted.message, quoted.body),
      message: quoted.message,
    };
  }
  const notional = quoteSolNotional(input.side, amount, quoted.order);
  if (notional == null) {
    return {
      ok: false,
      status: 403,
      code: AgentError.MAX_PER_TRADE,
      message: "Could not size this sell against the trade cap.",
    };
  }
  const capped = await assertTradeAllowed({
    agent,
    mint: tokenMintForSide(input.side, input.mint),
    amountLamports: notional,
  });
  if (!capped.ok) {
    return { ok: false, status: 403, code: capped.denial.code, message: capped.denial.message };
  }
  try {
    const trade = await insertTrade({
      idempotencyKey,
      agentId: agent.id,
      humanPrivyUserId: input.humanPrivyUserId ?? agent.ownerPrivyUserId,
      walletAddress: agent.walletAddress,
      side: input.side,
      inputMint: quoted.order.inputMint,
      outputMint: quoted.order.outputMint,
      requestedAmount: input.amount,
      quoteOutAmount: quoted.order.outAmount,
      price: quoted.order.outAmount,
      slippageBps: quoted.order.slippageBps,
      thesisId: input.thesisId ?? null,
      dflowQuote: quoted.order,
      status: "awaiting_signature",
    });
    return {
      ok: true,
      trade,
      transaction: quoted.order.transaction ?? null,
      lastValidBlockHeight: quoted.order.lastValidBlockHeight ?? null,
    };
  } catch {
    const replay = await findTradeByIdempotency(idempotencyKey, agent.id);
    if (replay) {
      const quote = replay.dflowQuote as { transaction?: string; lastValidBlockHeight?: number } | null;
      return {
        ok: true,
        trade: replay,
        transaction: quote?.transaction ?? null,
        lastValidBlockHeight: quote?.lastValidBlockHeight ?? null,
      };
    }
    return { ok: false, status: 500, code: AgentError.TRANSACTION_FAILED, message: "Trade insert failed." };
  }
}

export async function submitSignedTrade(input: {
  trade: Trade;
  signedTransaction: string;
}): Promise<{ ok: true; trade: Trade } | { ok: false; status: number; code: string; message: string }> {
  switch (input.trade.status) {
    case "confirmed":
    case "submitted":
    case "confirming":
      return { ok: true, trade: input.trade };
    case "failed":
      return { ok: false, status: 409, code: AgentError.TRANSACTION_FAILED, message: "This trade is closed." };
    case "expired":
      return { ok: false, status: 409, code: AgentError.QUOTE_EXPIRED, message: "This quote expired. Request a new one." };
    case "quoted":
    case "awaiting_signature":
      break;
    default:
      return assertNever(input.trade.status, "trade.status");
  }
  if (await quoteIsExpired(input.trade)) {
    const expired = await updateTrade(input.trade.id, {
      status: "expired",
      failReason: "Quote expired.",
    });
    return {
      ok: false,
      status: 409,
      code: AgentError.QUOTE_EXPIRED,
      message: expired.failReason ?? "Quote expired. Request a new one.",
    };
  }
  const storedTx = dflowTransaction(input.trade.dflowQuote);
  if (!storedTx) {
    return {
      ok: false,
      status: 409,
      code: AgentError.NO_UNSIGNED_TX,
      message: "No stored DFlow transaction for this trade.",
    };
  }
  if (!signedMatchesDflow(input.signedTransaction, storedTx, input.trade.walletAddress)) {
    return {
      ok: false,
      status: 400,
      code: AgentError.TX_MISMATCH,
      message: "Signed transaction does not match the DFlow order for this wallet.",
    };
  }
  try {
    const signature = await sendSignedTransaction(input.signedTransaction);
    const next = await updateTrade(input.trade.id, {
      status: "submitted",
      signature,
      submittedAt: new Date().toISOString(),
    });
    return { ok: true, trade: next };
  } catch (error) {
    const message = error instanceof Error ? error.message : "submit failed";
    const expired = /blockhash|expired|lastValidBlockHeight/i.test(message);
    const failed = await updateTrade(input.trade.id, {
      status: expired ? "expired" : "failed",
      failReason: message,
    });
    return {
      ok: false,
      status: expired ? 409 : 502,
      code: expired ? AgentError.QUOTE_EXPIRED : AgentError.TRANSACTION_FAILED,
      message: failed.failReason ?? message,
    };
  }
}

export async function refreshTrade(trade: Trade): Promise<Trade> {
  if (trade.status === "confirmed") {
    await persistConfirmedExecution(trade);
    return trade;
  }
  if (!trade.signature) {
    if (
      (trade.status === "quoted" || trade.status === "awaiting_signature") &&
      (await quoteIsExpired(trade))
    ) {
      return (await markTradeExpired(trade.id, "Quote expired.")) ?? trade;
    }
    return trade;
  }
  const status = await signatureStatus(trade.signature);
  const height = await currentBlockHeight();
  const lastValid = lastValidBlockHeight(trade.dflowQuote);
  const blockExpired = lastValid != null && height != null && height > lastValid;
  const intent = nextConfirmIntent({
    status: trade.status,
    confirmationStatus: status.confirmationStatus,
    err: status.err,
    seen: Boolean(status.confirmationStatus || status.slot),
    blockExpired,
  });
  switch (intent) {
    case "noop":
      return trade;
    case "confirming":
      return (await markTradeConfirming(trade.id)) ?? trade;
    case "fail": {
      const failed = await markTradeFailed(trade.id, JSON.stringify(status.err));
      logWarn("trade.failed", { tradeId: trade.id, signature: trade.signature });
      return failed ?? (await findTradeById(trade.id)) ?? trade;
    }
    case "expire":
      return (await markTradeExpired(trade.id, "Blockhash expired before confirmation.")) ?? trade;
    case "confirm":
      return finalizeConfirmed(trade);
    default:
      return assertNever(intent, "confirm.intent");
  }
}

async function finalizeConfirmed(trade: Trade): Promise<Trade> {
  if (!trade.signature) return trade;
  const mint = tokenMintForTrade(trade.side, trade.inputMint, trade.outputMint);
  const fill = await heliusParsedFill({
    signature: trade.signature,
    wallet: trade.walletAddress,
    mint,
  });
  if (fill?.err) {
    const failed = await markTradeFailed(trade.id, JSON.stringify(fill.err));
    logWarn("trade.failed", { tradeId: trade.id, signature: trade.signature, source: "parsed_tx" });
    return failed ?? trade;
  }
  const actualIn =
    trade.side === "buy"
      ? nonzeroRaw(fill?.quoteAmountRaw, trade.requestedAmount)
      : nonzeroRaw(fill?.tokenAmountRaw, trade.requestedAmount);
  const actualOut =
    trade.side === "buy"
      ? nonzeroRaw(fill?.tokenAmountRaw, trade.quoteOutAmount)
      : nonzeroRaw(fill?.quoteAmountRaw, trade.quoteOutAmount);
  const confirmedAt = new Date().toISOString();
  const next = await markTradeConfirmed(trade.id, {
    confirmedAt,
    actualInAmount: actualIn,
    actualOutAmount: actualOut,
    feeLamports: fill?.feeLamports ?? null,
  });
  const confirmed = next ?? (await findTradeById(trade.id)) ?? trade;
  if (confirmed.status !== "confirmed") return confirmed;
  await persistConfirmedExecution(confirmed, fill);
  if (next) {
    const volumeLamports = BigInt(trade.side === "buy" ? actualIn : actualOut);
    if (volumeLamports > 0n) await addDailyVolume(trade.agentId, volumeLamports);
    await insertTradeFeedEvent(trade.agentId, trade.id);
    forgetWalletSnapshot(trade.walletAddress);
    forgetBookCaches(trade.agentId, trade.walletAddress);
    forgetMuseBoards();
    forgetTapeCaches();
    logInfo("trade.confirmed", {
      tradeId: trade.id,
      signature: trade.signature,
      slot: fill?.slot ?? null,
    });
  }
  return confirmed;
}

async function persistConfirmedExecution(
  trade: Trade,
  fill?: Awaited<ReturnType<typeof heliusParsedFill>>,
) {
  if (!trade.signature || !trade.confirmedAt) return;
  const mint = tokenMintForTrade(trade.side, trade.inputMint, trade.outputMint);
  const parsed = fill ?? (await heliusParsedFill({
    signature: trade.signature,
    wallet: trade.walletAddress,
    mint,
  }));
  const execution = executionFromFill({
    tradeId: trade.id,
    agentId: trade.agentId,
    walletAddress: trade.walletAddress,
    side: trade.side,
    mint,
    signature: trade.signature,
    tokenAmountRaw: nonzeroRaw(
      parsed?.tokenAmountRaw,
      trade.side === "buy" ? trade.actualOutAmount ?? trade.quoteOutAmount : trade.actualInAmount ?? trade.requestedAmount,
    ),
    tokenDecimals: parsed?.tokenDecimals ?? 0,
    quoteAmountRaw: nonzeroRaw(
      parsed?.quoteAmountRaw,
      trade.side === "buy" ? trade.actualInAmount ?? trade.requestedAmount : trade.actualOutAmount ?? trade.quoteOutAmount,
    ),
    quoteDecimals: parsed?.quoteDecimals,
    slot: parsed?.slot ?? null,
    ts: trade.confirmedAt,
  });
  await insertConfirmedExecution({
    tradeId: execution.tradeId,
    signature: execution.signature,
    agentId: execution.agentId,
    walletAddress: execution.walletAddress,
    mint: execution.mint,
    side: execution.side,
    tokenAmountRaw: execution.tokenAmountRaw,
    tokenDecimals: execution.tokenDecimals,
    quoteAmountRaw: execution.quoteAmountRaw,
    quoteDecimals: execution.quoteDecimals,
    quoteMint: execution.quoteMint,
    slot: execution.slot,
    confirmedAt: execution.ts,
  });
}

function nonzeroRaw(value: string | null | undefined, fallback: string | null | undefined): string {
  if (value && value !== "0") return value;
  return fallback && fallback !== "0" ? fallback : value ?? fallback ?? "0";
}

function lastValidBlockHeight(quote: unknown): number | null {
  if (!quote || typeof quote !== "object") return null;
  const value = (quote as { lastValidBlockHeight?: unknown }).lastValidBlockHeight;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function applySignatureConfirmation(signature: string): Promise<Trade | null> {
  const trade = await findTradeBySignature(signature);
  if (!trade) return null;
  return refreshTrade(trade);
}

export function publicTrade(trade: Trade) {
  return {
    id: trade.id,
    agentId: trade.agentId,
    side: trade.side,
    inputMint: trade.inputMint,
    outputMint: trade.outputMint,
    requestedAmount: trade.requestedAmount,
    actualInAmount: trade.actualInAmount,
    actualOutAmount: trade.actualOutAmount,
    quoteOutAmount: trade.quoteOutAmount,
    price: trade.price,
    slippageBps: trade.slippageBps,
    feeLamports: trade.feeLamports,
    thesisId: trade.thesisId,
    signature: trade.signature,
    status: trade.status,
    failReason: trade.failReason,
    createdAt: trade.createdAt,
    submittedAt: trade.submittedAt,
    confirmedAt: trade.confirmedAt,
  };
}

export async function getTradeOrRefresh(id: string): Promise<Trade | null> {
  const trade = await findTradeById(id);
  if (!trade) return null;
  return refreshTrade(trade);
}

function dflowTransaction(quote: unknown): string | null {
  if (!quote || typeof quote !== "object") return null;
  const transaction = (quote as { transaction?: unknown }).transaction;
  return typeof transaction === "string" && transaction.length > 0 ? transaction : null;
}

function signedMatchesDflow(signedB64: string, storedB64: string, wallet: string): boolean {
  try {
    const signed = VersionedTransaction.deserialize(Buffer.from(signedB64, "base64"));
    const stored = VersionedTransaction.deserialize(Buffer.from(storedB64, "base64"));
    const signedMsg = Buffer.from(signed.message.serialize());
    const storedMsg = Buffer.from(stored.message.serialize());
    if (!signedMsg.equals(storedMsg)) return false;
    const payer = feePayerAddress(signed);
    return !payer || payer === wallet;
  } catch {
    return false;
  }
}

async function sellNotionalLamports(mint: string, tokenAmount: bigint): Promise<bigint | null> {
  const [market, solUsd] = await Promise.all([getTokenMarket(mint), getSolUsd()]);
  if (
    market.priceUsd == null ||
    market.priceUsd <= 0 ||
    solUsd == null ||
    solUsd <= 0 ||
    market.decimals == null ||
    market.decimals < 0
  ) {
    return null;
  }
  const ui = Number(tokenAmount) / 10 ** market.decimals;
  if (!Number.isFinite(ui) || ui <= 0) return null;
  const lamports = usdToSolLamports(ui * market.priceUsd, solUsd);
  return lamports > 0n ? lamports : null;
}

function quoteSolNotional(side: TradeSide, requested: bigint, order: DflowOrder): bigint | null {
  switch (side) {
    case "buy": {
      try {
        const wired = BigInt(order.inAmount);
        return wired > requested ? wired : requested;
      } catch {
        return requested;
      }
    }
    case "sell": {
      try {
        const out = BigInt(order.outAmount);
        return out > 0n ? out : null;
      } catch {
        return null;
      }
    }
    default:
      return assertNever(side, "side");
  }
}

async function assertSufficientBalance(input: {
  walletAddress: string;
  side: TradeSide;
  mint: string;
  amount: bigint;
}): Promise<{ ok: true } | { ok: false; status: number; code: string; message: string }> {
  if (input.side === "buy") {
    const balances = await heliusWalletBalances(input.walletAddress);
    if (BigInt(balances.solLamports) < input.amount) {
      return {
        ok: false,
        status: 403,
        code: AgentError.INSUFFICIENT_BALANCE,
        message: "Helius shows insufficient SOL for this buy.",
      };
    }
    return { ok: true };
  }
  const held = await heliusTokenHolding(input.walletAddress, input.mint);
  const raw = BigInt(held?.rawAmount ?? "0");
  if (raw < input.amount) {
    return {
      ok: false,
      status: 403,
      code: AgentError.INSUFFICIENT_BALANCE,
      message: "Helius shows insufficient token balance for this sell.",
    };
  }
  return { ok: true };
}

function mapQuoteFailure(message: string, _body: unknown): string {
  if (/expired|blockhash/i.test(message)) return AgentError.QUOTE_EXPIRED;
  return AgentError.QUOTE_FAILED;
}

async function quoteIsExpired(trade: Trade): Promise<boolean> {
  const quote = trade.dflowQuote as { lastValidBlockHeight?: number } | null;
  const last = quote?.lastValidBlockHeight;
  if (typeof last !== "number" || !Number.isFinite(last)) return false;
  const slot = await heliusCurrentSlot().catch(() => null);
  return slot != null && slot > last;
}

function feePayerAddress(tx: VersionedTransaction): string | null {
  const message = tx.message as {
    staticAccountKeys?: Array<{ toBase58(): string }>;
    accountKeys?: Array<{ toBase58(): string }>;
  };
  const key = message.staticAccountKeys?.[0] ?? message.accountKeys?.[0];
  return key ? key.toBase58() : null;
}
