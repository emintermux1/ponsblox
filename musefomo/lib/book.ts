import { cacheDelete, cacheDeletePrefix, cacheWrap } from "@/lib/cache";
import { SOL_MINT, SOL_DECIMALS } from "@/lib/constants";
import { heliusGetAsset } from "@/lib/helius";
import {
  agentOpenMints,
  averageEntryLamportsPerRaw,
  confirmedFillsFromTrades,
  markValueLamports,
  openPnlLamports,
  POSITION_METHOD,
  replayFills,
  roiBps,
  winRateBps,
  type AgentLedger,
  type MintLedger,
} from "@/lib/ledger";
import { getSolUsdString, getTokenMarkUsdString } from "@/lib/market";
import { isUsableDecimals } from "@/lib/money";
import type { BookPosition, BookSnapshot, Trade } from "@/lib/types";

export function forgetBookCaches(agentId?: string, wallet?: string) {
  cacheDeletePrefix("book:");
  if (agentId) cacheDelete(`book:agent:${agentId}`);
  if (wallet) cacheDelete(`book:wallet:${wallet}`);
}

export function bookFromConfirmedTrades(
  trades: Trade[],
  marks: {
    solUsd: string | null;
    decimals: Map<string, number | null>;
    markUsd: Map<string, string | null>;
  },
  agentId?: string,
): BookSnapshot {
  const fills = confirmedFillsFromTrades(trades);
  const replay = replayFills(fills);
  const agent =
    (agentId ? replay.agents.get(agentId) : undefined) ??
    [...replay.agents.values()][0] ??
    null;
  return serializeAgentBook(agent, marks, fills.length);
}

function serializeAgentBook(
  agent: AgentLedger | null,
  marks: {
    solUsd: string | null;
    decimals: Map<string, number | null>;
    markUsd: Map<string, string | null>;
  },
  fillCount: number,
): BookSnapshot {
  const open = agent ? agentOpenMints(agent) : [];
  const positions = open.map((mint) => serializeMint(mint, marks));
  const realizedPnlLamports = (agent?.realizedLamports ?? 0n).toString();
  const volumeLamports = (agent?.volumeLamports ?? 0n).toString();
  const closedCount = agent?.closed.length ?? 0;
  const win = agent ? winRateBps(agent.closed) : null;

  let openKnown = true;
  let openSum = 0n;
  let valueKnown = true;
  let valueSum = 0n;
  let remainingCost = 0n;
  for (const position of positions) {
    remainingCost += BigInt(position.costBasisLamports);
    if (position.openPnlLamports == null) openKnown = false;
    else openSum += BigInt(position.openPnlLamports);
    if (position.markValueLamports == null) valueKnown = false;
    else valueSum += BigInt(position.markValueLamports);
  }
  if (open.length === 0) {
    openKnown = true;
    valueKnown = true;
  }

  const openPnlLamportsText = openKnown ? openSum.toString() : null;
  const totalPnlLamports =
    openPnlLamportsText == null
      ? null
      : (BigInt(realizedPnlLamports) + BigInt(openPnlLamportsText)).toString();
  const invested = agent?.buyVolumeLamports ?? 0n;
  const roi = totalPnlLamports == null ? null : roiBps(BigInt(totalPnlLamports), invested);

  return {
    method: POSITION_METHOD,
    fillCount,
    realizedPnlLamports,
    openPnlLamports: openPnlLamportsText,
    totalPnlLamports,
    portfolioValueLamports: valueKnown ? valueSum.toString() : null,
    costBasisLamports: remainingCost.toString(),
    volumeLamports,
    roiBps: roi?.toString() ?? null,
    winRateBps: win?.toString() ?? null,
    closedCount,
    positions,
  };
}

function serializeMint(
  mint: MintLedger,
  marks: {
    solUsd: string | null;
    decimals: Map<string, number | null>;
    markUsd: Map<string, string | null>;
  },
): BookPosition {
  const decimals = marks.decimals.get(mint.mint) ?? null;
  const markUsd = marks.markUsd.get(mint.mint) ?? null;
  const avg = averageEntryLamportsPerRaw({ qty: mint.qty, costLamports: mint.costLamports });
  const open = openPnlLamports({
    qty: mint.qty,
    costLamports: mint.costLamports,
    decimals,
    markUsd,
    solUsd: marks.solUsd,
  });
  const marked = markValueLamports({
    qty: mint.qty,
    decimals,
    markUsd,
    solUsd: marks.solUsd,
  });
  const positionRoi =
    open == null ? null : roiBps(open, mint.costLamports);
  return {
    mint: mint.mint,
    tokenBalanceRaw: mint.qty.toString(),
    decimals: isUsableDecimals(decimals) ? decimals : null,
    costBasisLamports: mint.costLamports.toString(),
    averageEntryLamportsPerRaw: avg?.toString() ?? null,
    realizedPnlLamports: mint.realizedLamports.toString(),
    openPnlLamports: open?.toString() ?? null,
    markValueLamports: marked?.toString() ?? null,
    markUsd,
    roiBps: positionRoi?.toString() ?? null,
  };
}

export async function loadMarksForMints(mints: string[]): Promise<{
  solUsd: string | null;
  decimals: Map<string, number | null>;
  markUsd: Map<string, string | null>;
}> {
  const unique = [...new Set(mints)];
  const [solUsd, decimalsRows, markRows] = await Promise.all([
    getSolUsdString(),
    Promise.all(unique.map(async (mint) => [mint, await resolveMintDecimals(mint)] as const)),
    Promise.all(unique.map(async (mint) => [mint, await getTokenMarkUsdString(mint)] as const)),
  ]);
  return {
    solUsd,
    decimals: new Map(decimalsRows),
    markUsd: new Map(markRows),
  };
}

export async function resolveMintDecimals(mint: string): Promise<number | null> {
  if (mint === SOL_MINT) return SOL_DECIMALS;
  const asset = await heliusGetAsset(mint).catch(() => null);
  return isUsableDecimals(asset?.decimals) ? asset.decimals : null;
}

export async function buildBook(trades: Trade[], agentId?: string): Promise<BookSnapshot> {
  const fills = confirmedFillsFromTrades(trades);
  const scoped = agentId ? fills.filter((fill) => fill.agentId === agentId) : fills;
  const replay = replayFills(scoped);
  const agent =
    (agentId ? replay.agents.get(agentId) : undefined) ??
    [...replay.agents.values()][0] ??
    null;
  const openMints = agent ? agentOpenMints(agent).map((row) => row.mint) : [];
  const marks = await loadMarksForMints(openMints);
  return serializeAgentBook(agent, marks, scoped.length);
}

export async function loadAgentBook(agentId: string, trades: Trade[]): Promise<BookSnapshot> {
  return cacheWrap(`book:agent:${agentId}`, 8_000, () => buildBook(trades, agentId));
}

export async function loadWalletBook(address: string, trades: Trade[]): Promise<BookSnapshot> {
  return cacheWrap(`book:wallet:${address}`, 8_000, () => buildBook(trades));
}
