import { LEADERBOARD_WINDOWS, SOL_DECIMALS } from "@/lib/constants";
import {
  isUsableDecimals,
  mulDiv,
  parseInteger,
  pow10,
  PRICE_SCALE,
  parseDecimal,
  ratioFloor,
} from "@/lib/money";
import { assertNever } from "@/lib/never";
import type { LeaderboardWindow, Trade, TradeSide } from "@/lib/types";

/**
 * Position accounting method: continuing VWAP.
 *
 * Buys add token qty and SOL cost. Average entry is remainingCost / remainingQty.
 * A partial sell realizes PnL on the sold slice:
 *   costOfSold = floor(remainingCost * soldQty / remainingQty)
 *   realized   = proceeds - costOfSold
 * Remaining cost stays with remaining qty (the floor remainder stays in the book).
 * A complete exit realizes against the entire remaining cost (no leftover basis).
 * A buy after a partial sell continues the same weighted average on remaining + new.
 * Pending / unconfirmed trades are never fills.
 */
export const POSITION_METHOD = "continuing-vwap" as const;

export type ConfirmedFill = {
  id: string;
  agentId: string;
  mint: string;
  side: TradeSide;
  tokenQty: bigint;
  solLamports: bigint;
  atMs: number;
};

export type LotPosition = {
  qty: bigint;
  costLamports: bigint;
};

export type FillApplyResult = {
  position: LotPosition;
  realizedLamports: bigint;
  closed: boolean;
};

export type ClosedCycle = {
  mint: string;
  realizedLamports: bigint;
  atMs: number;
};

export type RealizedEvent = {
  agentId: string;
  mint: string;
  realizedLamports: bigint;
  atMs: number;
};

export type MintLedger = {
  mint: string;
  qty: bigint;
  costLamports: bigint;
  realizedLamports: bigint;
  volumeLamports: bigint;
  fillCount: number;
};

export type AgentLedger = {
  agentId: string;
  mints: Map<string, MintLedger>;
  realizedLamports: bigint;
  volumeLamports: bigint;
  buyVolumeLamports: bigint;
  fillCount: number;
  closed: ClosedCycle[];
  realizedEvents: RealizedEvent[];
};

export type ReplaySnapshot = {
  method: typeof POSITION_METHOD;
  agents: Map<string, AgentLedger>;
  fills: ConfirmedFill[];
};

export function emptyPosition(): LotPosition {
  return { qty: 0n, costLamports: 0n };
}

export function applyFill(
  position: LotPosition,
  side: TradeSide,
  tokenQty: bigint,
  solLamports: bigint,
): FillApplyResult {
  if (tokenQty <= 0n || solLamports < 0n) {
    return { position, realizedLamports: 0n, closed: false };
  }
  switch (side) {
    case "buy":
      return {
        position: {
          qty: position.qty + tokenQty,
          costLamports: position.costLamports + solLamports,
        },
        realizedLamports: 0n,
        closed: false,
      };
    case "sell":
      return applySell(position, tokenQty, solLamports);
    default:
      return assertNever(side, "fill.side");
  }
}

function applySell(position: LotPosition, sellQty: bigint, proceeds: bigint): FillApplyResult {
  if (position.qty <= 0n) {
    return { position: emptyPosition(), realizedLamports: 0n, closed: false };
  }
  if (sellQty >= position.qty) {
    const sliceProceeds =
      sellQty === position.qty ? proceeds : mulDiv(proceeds, position.qty, sellQty);
    return {
      position: emptyPosition(),
      realizedLamports: sliceProceeds - position.costLamports,
      closed: true,
    };
  }
  const costOfSold = mulDiv(position.costLamports, sellQty, position.qty);
  return {
    position: {
      qty: position.qty - sellQty,
      costLamports: position.costLamports - costOfSold,
    },
    realizedLamports: proceeds - costOfSold,
    closed: false,
  };
}

export function confirmedFillFromTrade(trade: Trade): ConfirmedFill | null {
  if (trade.status !== "confirmed") return null;
  const tokenRaw = trade.side === "buy" ? trade.actualOutAmount : trade.actualInAmount;
  const solRaw = trade.side === "buy" ? trade.actualInAmount : trade.actualOutAmount;
  const tokenQty = parseInteger(tokenRaw);
  const solLamports = parseInteger(solRaw);
  if (tokenQty == null || solLamports == null || tokenQty <= 0n || solLamports < 0n) return null;
  const mint = trade.side === "buy" ? trade.outputMint : trade.inputMint;
  const at = trade.confirmedAt ?? trade.createdAt;
  const atMs = Date.parse(at);
  if (!Number.isFinite(atMs)) return null;
  return {
    id: trade.id,
    agentId: trade.agentId,
    mint,
    side: trade.side,
    tokenQty,
    solLamports,
    atMs,
  };
}

export function confirmedFillsFromTrades(trades: Trade[]): ConfirmedFill[] {
  const fills: ConfirmedFill[] = [];
  for (const trade of trades) {
    const fill = confirmedFillFromTrade(trade);
    if (fill) fills.push(fill);
  }
  return fills.sort((a, b) => {
    if (a.atMs !== b.atMs) return a.atMs - b.atMs;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

function emptyMint(mint: string): MintLedger {
  return {
    mint,
    qty: 0n,
    costLamports: 0n,
    realizedLamports: 0n,
    volumeLamports: 0n,
    fillCount: 0,
  };
}

function emptyAgent(agentId: string): AgentLedger {
  return {
    agentId,
    mints: new Map(),
    realizedLamports: 0n,
    volumeLamports: 0n,
    buyVolumeLamports: 0n,
    fillCount: 0,
    closed: [],
    realizedEvents: [],
  };
}

export function replayFills(fills: ConfirmedFill[]): ReplaySnapshot {
  const ordered = [...fills].sort((a, b) => {
    if (a.atMs !== b.atMs) return a.atMs - b.atMs;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  const agents = new Map<string, AgentLedger>();
  for (const fill of ordered) {
    const agent = agents.get(fill.agentId) ?? emptyAgent(fill.agentId);
    const mint = agent.mints.get(fill.mint) ?? emptyMint(fill.mint);
    const applied = applyFill(
      { qty: mint.qty, costLamports: mint.costLamports },
      fill.side,
      fill.tokenQty,
      fill.solLamports,
    );
    mint.qty = applied.position.qty;
    mint.costLamports = applied.position.costLamports;
    mint.volumeLamports += fill.solLamports;
    mint.fillCount += 1;
    agent.volumeLamports += fill.solLamports;
    agent.fillCount += 1;
    if (fill.side === "buy") agent.buyVolumeLamports += fill.solLamports;
    if (fill.side === "sell") {
      mint.realizedLamports += applied.realizedLamports;
      agent.realizedLamports += applied.realizedLamports;
      agent.realizedEvents.push({
        agentId: fill.agentId,
        mint: fill.mint,
        realizedLamports: applied.realizedLamports,
        atMs: fill.atMs,
      });
      if (applied.closed) {
        agent.closed.push({
          mint: fill.mint,
          realizedLamports: mint.realizedLamports - cyclePriorRealized(agent, fill.mint),
          atMs: fill.atMs,
        });
      }
    }
    agent.mints.set(fill.mint, mint);
    agents.set(fill.agentId, agent);
  }
  return { method: POSITION_METHOD, agents, fills: ordered };
}

function cyclePriorRealized(agent: AgentLedger, mint: string): bigint {
  let prior = 0n;
  for (const cycle of agent.closed) {
    if (cycle.mint === mint) prior += cycle.realizedLamports;
  }
  return prior;
}

export function averageEntryLamportsPerRaw(position: LotPosition): bigint | null {
  return ratioFloor(position.costLamports, position.qty);
}

export function winRateBps(closed: ClosedCycle[]): bigint | null {
  if (!closed.length) return null;
  let wins = 0n;
  for (const cycle of closed) {
    if (cycle.realizedLamports > 0n) wins += 1n;
  }
  return mulDiv(wins, 10_000n, BigInt(closed.length));
}

/**
 * Mean hold of complete exits only (applyFill `closed`).
 * Partial sells and still-open lots do not count — caller shows "--".
 */
export function averageHoldMs(fills: ConfirmedFill[]): number | null {
  const ordered = [...fills].sort((a, b) => {
    if (a.atMs !== b.atMs) return a.atMs - b.atMs;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  const pos = new Map<string, LotPosition>();
  const openedAt = new Map<string, number>();
  let total = 0;
  let count = 0;
  for (const fill of ordered) {
    const current = pos.get(fill.mint) ?? emptyPosition();
    const wasFlat = current.qty <= 0n;
    const applied = applyFill(current, fill.side, fill.tokenQty, fill.solLamports);
    if (fill.side === "buy" && wasFlat) {
      openedAt.set(fill.mint, fill.atMs);
    }
    if (applied.closed) {
      const start = openedAt.get(fill.mint);
      if (start != null && fill.atMs >= start) {
        total += fill.atMs - start;
        count += 1;
      }
      openedAt.delete(fill.mint);
    }
    pos.set(fill.mint, applied.position);
  }
  if (count === 0) return null;
  return Math.round(total / count);
}

export function roiBps(pnlLamports: bigint, costLamports: bigint): bigint | null {
  if (costLamports <= 0n) return null;
  return mulDiv(pnlLamports, 10_000n, costLamports);
}

/**
 * Open PnL in SOL lamports.
 * markUsd / solUsd are decimal strings (DexScreener / Gecko).
 * Missing mark or decimals → null (caller shows "--").
 */
export function openPnlLamports(input: {
  qty: bigint;
  costLamports: bigint;
  decimals: number | null;
  markUsd: string | null;
  solUsd: string | null;
}): bigint | null {
  if (input.qty === 0n) return 0n;
  const marked = markValueLamports(input);
  if (marked == null) return null;
  return marked - input.costLamports;
}

export function markValueLamports(input: {
  qty: bigint;
  decimals: number | null;
  markUsd: string | null;
  solUsd: string | null;
}): bigint | null {
  if (input.qty === 0n) return 0n;
  if (!isUsableDecimals(input.decimals)) return null;
  const mark = parseDecimal(input.markUsd, PRICE_SCALE);
  const sol = parseDecimal(input.solUsd, PRICE_SCALE);
  if (mark == null || sol == null || mark <= 0n || sol <= 0n) return null;
  const markValueUsd = mulDiv(input.qty, mark, pow10(input.decimals));
  return mulDiv(markValueUsd, pow10(SOL_DECIMALS), sol);
}

export function windowStartMs(window: LeaderboardWindow, now = Date.now()): number | null {
  switch (window) {
    case "24h":
      return now - 24 * 60 * 60 * 1000;
    case "7d":
      return now - 7 * 24 * 60 * 60 * 1000;
    case "30d":
      return now - 30 * 24 * 60 * 60 * 1000;
    case "all":
      return null;
    default:
      return assertNever(window, "leaderboard.window");
  }
}

export function inWindow(atMs: number, window: LeaderboardWindow, now = Date.now()): boolean {
  const start = windowStartMs(window, now);
  return start == null || atMs >= start;
}

export type MintVolumeRank = {
  mint: string;
  fillCount: number;
  volumeLamports: bigint;
};

export type MintHeldRank = {
  mint: string;
  holders: number;
  qtyHeldRaw: bigint;
  costBasisLamports: bigint;
};

export type AgentWindowRank = {
  agentId: string;
  realizedPnlLamports: bigint;
  volumeLamports: bigint;
  fillCount: number;
  closedCount: number;
  winRateBps: bigint | null;
};

export function rankMostTraded(
  fills: ConfirmedFill[],
  window: LeaderboardWindow,
  now = Date.now(),
): MintVolumeRank[] {
  const byMint = new Map<string, MintVolumeRank>();
  for (const fill of fills) {
    if (!inWindow(fill.atMs, window, now)) continue;
    const row = byMint.get(fill.mint) ?? { mint: fill.mint, fillCount: 0, volumeLamports: 0n };
    row.fillCount += 1;
    row.volumeLamports += fill.solLamports;
    byMint.set(fill.mint, row);
  }
  return [...byMint.values()].sort((a, b) => {
    if (a.volumeLamports === b.volumeLamports) return b.fillCount - a.fillCount;
    return a.volumeLamports > b.volumeLamports ? -1 : 1;
  });
}

export function rankMostHeld(snapshot: ReplaySnapshot): MintHeldRank[] {
  const byMint = new Map<string, MintHeldRank>();
  for (const agent of snapshot.agents.values()) {
    for (const mint of agent.mints.values()) {
      if (mint.qty <= 0n) continue;
      const row = byMint.get(mint.mint) ?? {
        mint: mint.mint,
        holders: 0,
        qtyHeldRaw: 0n,
        costBasisLamports: 0n,
      };
      row.holders += 1;
      row.qtyHeldRaw += mint.qty;
      row.costBasisLamports += mint.costLamports;
      byMint.set(mint.mint, row);
    }
  }
  return [...byMint.values()].sort((a, b) => {
    if (a.holders !== b.holders) return b.holders - a.holders;
    return a.costBasisLamports > b.costBasisLamports ? -1 : 1;
  });
}

export function rankLeaderboard(
  snapshot: ReplaySnapshot,
  window: LeaderboardWindow,
  now = Date.now(),
): AgentWindowRank[] {
  const rows: AgentWindowRank[] = [];
  for (const agent of snapshot.agents.values()) {
    let realized = 0n;
    let volume = 0n;
    let fillCount = 0;
    for (const event of agent.realizedEvents) {
      if (inWindow(event.atMs, window, now)) realized += event.realizedLamports;
    }
    for (const fill of snapshot.fills) {
      if (fill.agentId !== agent.agentId) continue;
      if (!inWindow(fill.atMs, window, now)) continue;
      volume += fill.solLamports;
      fillCount += 1;
    }
    const closed = agent.closed.filter((cycle) => inWindow(cycle.atMs, window, now));
    if (fillCount === 0 && realized === 0n) continue;
    rows.push({
      agentId: agent.agentId,
      realizedPnlLamports: realized,
      volumeLamports: volume,
      fillCount,
      closedCount: closed.length,
      winRateBps: winRateBps(closed),
    });
  }
  return rows.sort((a, b) => {
    if (a.realizedPnlLamports === b.realizedPnlLamports) {
      return a.volumeLamports > b.volumeLamports ? -1 : 1;
    }
    return a.realizedPnlLamports > b.realizedPnlLamports ? -1 : 1;
  });
}

export function allBoardWindows(): LeaderboardWindow[] {
  return [...LEADERBOARD_WINDOWS];
}

export function agentOpenMints(agent: AgentLedger): MintLedger[] {
  return [...agent.mints.values()].filter((mint) => mint.qty > 0n);
}
