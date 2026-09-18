import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";

import { cacheDelete, cacheWrap } from "@/lib/cache";
import { USDC_MINT } from "@/lib/constants";
import { serverEnv } from "@/lib/env";

const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const TOKEN_2022_PROGRAM = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

export type HeliusTokenBalance = {
  mint: string;
  symbol: string | null;
  name: string | null;
  amount: number;
  rawAmount: string;
  decimals: number;
  imageUrl: string | null;
  usd: number | null;
};

export type HeliusSwapPrint = {
  id: string;
  side: "buy" | "sell";
  usd: number;
  mint: string;
  symbol: string | null;
  at: number | null;
};

export type HeliusWalletBalances = {
  address: string;
  solLamports: number;
  tokens: HeliusTokenBalance[];
};

export function heliusRpcUrl(): string {
  return `https://mainnet.helius-rpc.com/?api-key=${serverEnv().heliusApiKey}`;
}

export function heliusConnection(): Connection {
  return new Connection(heliusRpcUrl(), "confirmed");
}

export async function heliusGetAsset(mint: string): Promise<{
  mint: string;
  name: string | null;
  symbol: string | null;
  imageUrl: string | null;
  decimals: number | null;
} | null> {
  return cacheWrap(`helius:asset:${mint}`, 60_000, async () => {
    const response = await fetch(heliusRpcUrl(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "musefomo-asset",
        method: "getAsset",
        params: { id: mint },
      }),
      cache: "no-store",
    });
    const body = (await response.json()) as {
      result?: {
        id?: string;
        content?: {
          metadata?: { name?: string; symbol?: string };
          links?: { image?: string };
          files?: Array<{ uri?: string }>;
        };
        token_info?: { decimals?: number };
      };
    };
    const result = body.result;
    if (!result?.id) return null;
    const decimals = result.token_info?.decimals;
    return {
      mint: result.id,
      name: result.content?.metadata?.name ?? null,
      symbol: result.content?.metadata?.symbol ?? null,
      imageUrl: result.content?.links?.image ?? result.content?.files?.[0]?.uri ?? null,
      decimals: typeof decimals === "number" && Number.isFinite(decimals) ? decimals : null,
    };
  });
}

export async function sendSignedTransaction(base64Tx: string): Promise<string> {
  const tx = VersionedTransaction.deserialize(Buffer.from(base64Tx, "base64"));
  const connection = heliusConnection();
  return connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    maxRetries: 3,
  });
}

export async function signatureStatus(signature: string): Promise<{
  confirmationStatus: string | null;
  err: unknown;
  slot: number | null;
}> {
  const connection = heliusConnection();
  const { value } = await connection.getSignatureStatuses([signature], {
    searchTransactionHistory: true,
  });
  const status = value[0];
  return {
    confirmationStatus: status?.confirmationStatus ?? null,
    err: status?.err ?? null,
    slot: status?.slot ?? null,
  };
}

export function isConfirmedStatus(status: string | null): boolean {
  return status === "confirmed" || status === "finalized";
}

export async function heliusCurrentSlot(): Promise<number | null> {
  try {
    return await heliusConnection().getSlot("confirmed");
  } catch {
    return null;
  }
}

export type HeliusFill = {
  tokenAmountRaw: string;
  tokenDecimals: number;
  quoteAmountRaw: string;
  quoteDecimals: number;
  feeLamports: string | null;
  slot: number | null;
  err: unknown;
};

function accountKeyStrings(tx: {
  transaction: {
    message: {
      accountKeys?: Array<string | { pubkey?: { toBase58?: () => string; toString?: () => string } | string }>;
    };
  };
}): string[] {
  return (tx.transaction.message.accountKeys ?? []).map((key) => {
    if (typeof key === "string") return key;
    const pubkey = key.pubkey;
    if (typeof pubkey === "string") return pubkey;
    return pubkey?.toBase58?.() ?? pubkey?.toString?.() ?? "";
  });
}

function absRaw(value: bigint): string {
  return (value < 0n ? -value : value).toString();
}

export async function heliusParsedFill(input: {
  signature: string;
  wallet: string;
  mint: string;
}): Promise<HeliusFill | null> {
  try {
    const tx = await heliusConnection().getParsedTransaction(input.signature, {
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed",
    });
    if (!tx?.meta) return null;
    const keys = accountKeyStrings(tx);
    const walletIndex = keys.findIndex((key) => key === input.wallet);
    const solIndex = walletIndex >= 0 ? walletIndex : 0;
    const preSol = tx.meta.preBalances[solIndex] ?? 0;
    const postSol = tx.meta.postBalances[solIndex] ?? 0;
    const solDelta = BigInt(postSol - preSol);
    const preTok = tx.meta.preTokenBalances?.find(
      (row) => row.mint === input.mint && row.owner === input.wallet,
    );
    const postTok = tx.meta.postTokenBalances?.find(
      (row) => row.mint === input.mint && row.owner === input.wallet,
    );
    const preAmt = BigInt(preTok?.uiTokenAmount.amount ?? "0");
    const postAmt = BigInt(postTok?.uiTokenAmount.amount ?? "0");
    const tokenDecimals = postTok?.uiTokenAmount.decimals ?? preTok?.uiTokenAmount.decimals ?? 0;
    return {
      tokenAmountRaw: absRaw(postAmt - preAmt),
      tokenDecimals,
      quoteAmountRaw: absRaw(solDelta),
      quoteDecimals: 9,
      feeLamports: tx.meta.fee != null ? String(tx.meta.fee) : null,
      slot: tx.slot ?? null,
      err: tx.meta.err ?? null,
    };
  } catch {
    return null;
  }
}

export async function currentBlockHeight(): Promise<number | null> {
  try {
    return await heliusConnection().getBlockHeight("confirmed");
  } catch {
    return null;
  }
}

export async function heliusWalletBalances(address: string): Promise<HeliusWalletBalances> {
  return cacheWrap(`helius:wallet:${address}`, 12_000, async () => {
    const owner = new PublicKey(address);
    const connection = heliusConnection();
    const [lamports, das, parsed] = await Promise.all([
      connection.getBalance(owner),
      heliusSearchFungibles(address).catch(() => []),
      parsedTokenAccounts(connection, owner).catch(() => []),
    ]);
    return { address, solLamports: lamports, tokens: mergeAtaHoldings(parsed, das) };
  });
}

export async function heliusTokenHolding(owner: string, mint: string): Promise<HeliusTokenBalance | null> {
  const connection = heliusConnection();
  const accounts = await connection.getParsedTokenAccountsByOwner(new PublicKey(owner), {
    mint: new PublicKey(mint),
  });
  let raw = 0n;
  let decimals = 0;
  for (const row of accounts.value) {
    const tokenAmount = row.account.data.parsed?.info?.tokenAmount as
      | { amount?: string; decimals?: number }
      | undefined;
    if (tokenAmount?.decimals != null) decimals = tokenAmount.decimals;
    try {
      raw += BigInt(tokenAmount?.amount ?? "0");
    } catch {
      continue;
    }
  }
  if (raw <= 0n) return null;
  const amount = decimals ? Number(raw) / 10 ** decimals : Number(raw);
  return {
    mint,
    symbol: null,
    name: null,
    amount,
    rawAmount: raw.toString(),
    decimals,
    imageUrl: null,
    usd: null,
  };
}

function mergeAtaHoldings(parsed: HeliusTokenBalance[], das: HeliusTokenBalance[]): HeliusTokenBalance[] {
  const meta = new Map(das.map((row) => [row.mint, row]));
  return parsed.map((row) => {
    const prior = meta.get(row.mint);
    return {
      ...row,
      symbol: prior?.symbol ?? row.symbol,
      name: prior?.name ?? row.name,
      imageUrl: prior?.imageUrl ?? row.imageUrl,
      usd: null,
    };
  });
}

async function heliusSearchFungibles(address: string): Promise<HeliusTokenBalance[]> {
  const response = await fetch(heliusRpcUrl(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "musefomo-das",
      method: "searchAssets",
      params: {
        ownerAddress: address,
        tokenType: "fungible",
        page: 1,
        limit: 50,
        displayOptions: { showFungible: true },
      },
    }),
    cache: "no-store",
  });
  const body = (await response.json()) as {
    result?: {
      items?: Array<{
        id?: string;
        content?: {
          metadata?: { name?: string; symbol?: string };
          links?: { image?: string };
        };
        token_info?: {
          symbol?: string;
          balance?: number;
          decimals?: number;
          price_info?: { price_per_token?: number };
        };
      }>;
    };
  };
  return (body.result?.items ?? [])
    .map((item) => {
      const decimals = item.token_info?.decimals ?? 0;
      const raw = item.token_info?.balance ?? 0;
      const amount = decimals ? raw / 10 ** decimals : raw;
      return {
        mint: item.id ?? "",
        symbol: item.token_info?.symbol ?? item.content?.metadata?.symbol ?? null,
        name: item.content?.metadata?.name ?? null,
        amount,
        rawAmount: String(raw),
        decimals,
        imageUrl: item.content?.links?.image ?? null,
        usd: null,
      };
    })
    .filter((row) => row.mint && row.amount > 0);
}

async function parsedTokenAccounts(
  connection: Connection,
  owner: PublicKey,
): Promise<HeliusTokenBalance[]> {
  const [legacy, token2022] = await Promise.all([
    connection.getParsedTokenAccountsByOwner(owner, { programId: TOKEN_PROGRAM }),
    connection.getParsedTokenAccountsByOwner(owner, { programId: TOKEN_2022_PROGRAM }),
  ]);
  return [...legacy.value, ...token2022.value]
    .map((row) => {
      const info = row.account.data.parsed?.info as
        | {
            mint?: string;
            tokenAmount?: { uiAmount?: number; uiAmountString?: string };
          }
        | undefined;
      const parsedAmount = info?.tokenAmount as
        | { amount?: string; uiAmount?: number; uiAmountString?: string; decimals?: number }
        | undefined;
      const amount = parsedAmount?.uiAmount ?? Number(parsedAmount?.uiAmountString ?? 0);
      return {
        mint: info?.mint ?? "",
        symbol: null,
        name: null,
        amount,
        rawAmount: parsedAmount?.amount ?? "0",
        decimals: parsedAmount?.decimals ?? 0,
        imageUrl: null,
        usd: null,
      };
    })
    .filter((row) => row.mint && row.amount > 0);
}

export function forgetHeliusWallet(address: string) {
  cacheDelete(`helius:wallet:${address}`);
}

function heliusEnhancedUrl(address: string, limit: number) {
  return `https://api.helius.xyz/v0/addresses/${address}/transactions?api-key=${serverEnv().heliusApiKey}&limit=${limit}`;
}

type EnhancedSwap = {
  signature?: string;
  timestamp?: number;
  feePayer?: string;
  events?: {
    swap?: {
      nativeInput?: { amount?: string | number };
      nativeOutput?: { amount?: string | number };
      tokenInputs?: Array<{
        mint?: string;
        tokenAmount?: number;
        rawTokenAmount?: { tokenAmount?: string; decimals?: number };
      }>;
      tokenOutputs?: Array<{
        mint?: string;
        tokenAmount?: number;
        rawTokenAmount?: { tokenAmount?: string; decimals?: number };
      }>;
    };
  };
  tokenTransfers?: Array<{
    mint?: string;
    tokenAmount?: number;
    fromUserAccount?: string;
    toUserAccount?: string;
  }>;
  nativeTransfers?: Array<{
    amount?: number;
    fromUserAccount?: string;
    toUserAccount?: string;
  }>;
};

export async function heliusPairSwaps(input: {
  pairAddress: string;
  mint: string;
  symbol: string | null;
  priceUsd: number | null;
  solUsd: number | null;
  limit?: number;
}): Promise<HeliusSwapPrint[]> {
  return cacheWrap(`helius:swaps:${input.pairAddress}`, 8_000, async () => {
    const response = await fetch(heliusEnhancedUrl(input.pairAddress, input.limit ?? 50), {
      cache: "no-store",
    });
    if (!response.ok) return [];
    const rows = (await response.json()) as EnhancedSwap[];
    if (!Array.isArray(rows)) return [];
    return rows
      .map((tx) => printFromEnhanced(tx, input))
      .filter((row): row is HeliusSwapPrint => row != null);
  });
}

function tokenQty(
  row:
    | {
        mint?: string;
        tokenAmount?: number;
        rawTokenAmount?: { tokenAmount?: string; decimals?: number };
      }
    | undefined,
) {
  if (!row) return 0;
  if (typeof row.tokenAmount === "number" && Number.isFinite(row.tokenAmount)) return row.tokenAmount;
  const raw = Number(row.rawTokenAmount?.tokenAmount ?? 0);
  const decimals = row.rawTokenAmount?.decimals ?? 0;
  return decimals ? raw / 10 ** decimals : raw;
}

function printFromEnhanced(
  tx: EnhancedSwap,
  input: {
    mint: string;
    symbol: string | null;
    priceUsd: number | null;
    solUsd: number | null;
  },
): HeliusSwapPrint | null {
  const payer = tx.feePayer;
  const swap = tx.events?.swap;
  const nativeIn = Number(swap?.nativeInput?.amount ?? 0) / 1e9;
  const nativeOut = Number(swap?.nativeOutput?.amount ?? 0) / 1e9;
  const tokenOut = (swap?.tokenOutputs ?? []).find((row) => row.mint === input.mint);
  const tokenIn = (swap?.tokenInputs ?? []).find((row) => row.mint === input.mint);
  const received = (tx.tokenTransfers ?? [])
    .filter((row) => row.mint === input.mint && row.toUserAccount === payer)
    .reduce((sum, row) => sum + Number(row.tokenAmount ?? 0), 0);
  const sent = (tx.tokenTransfers ?? [])
    .filter((row) => row.mint === input.mint && row.fromUserAccount === payer)
    .reduce((sum, row) => sum + Number(row.tokenAmount ?? 0), 0);
  const usdcIn = (tx.tokenTransfers ?? [])
    .filter((row) => row.mint === USDC_MINT && row.fromUserAccount === payer)
    .reduce((sum, row) => sum + Number(row.tokenAmount ?? 0), 0);
  const usdcOut = (tx.tokenTransfers ?? [])
    .filter((row) => row.mint === USDC_MINT && row.toUserAccount === payer)
    .reduce((sum, row) => sum + Number(row.tokenAmount ?? 0), 0);
  const outQty = tokenQty(tokenOut) || received;
  const inQty = tokenQty(tokenIn) || sent;
  const tokenMove = Math.max(outQty, inQty, received, sent);
  if (tokenMove <= 0) return null;
  const quoteUsd = Math.max(usdcIn, usdcOut);
  if (!swap && quoteUsd <= 0) return null;
  const swapSol = Math.max(nativeIn, nativeOut);
  const usd = Math.max(
    quoteUsd,
    input.solUsd && swapSol > 0 ? swapSol * input.solUsd : 0,
    input.priceUsd ? tokenMove * input.priceUsd : 0,
  );
  if (!Number.isFinite(usd) || usd <= 0) return null;
  const bought = outQty > inQty || received > sent || nativeIn > nativeOut;
  const side = bought ? "buy" : "sell";
  const at = tx.timestamp ? (tx.timestamp > 1e12 ? tx.timestamp : tx.timestamp * 1000) : null;
  return {
    id: tx.signature ?? `${input.mint}:${at}:${usd}`,
    side,
    usd,
    mint: input.mint,
    symbol: input.symbol,
    at,
  };
}
