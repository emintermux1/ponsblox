import { cacheDeletePrefix, cachePeek, cacheWrap } from "@/lib/cache";
import {
  listAgentsByIds,
  listAllConfirmedTrades,
  queryMostHeldMints,
  queryMostTradedMints,
} from "@/lib/db";
import {
  allBoardWindows,
  confirmedFillsFromTrades,
  rankLeaderboard,
  rankMostHeld,
  rankMostTraded,
  replayFills,
} from "@/lib/ledger";
import type {
  LeaderboardWindow,
  MuseDiscoveryBoards,
  MuseLeaderEntry,
  MuseTokenRank,
} from "@/lib/types";

export function forgetMuseBoards() {
  cacheDeletePrefix("muse-board");
}

export function peekMuseDiscoveryBoards(): MuseDiscoveryBoards | null {
  return cachePeek<MuseDiscoveryBoards>("muse-board:discovery")?.value ?? null;
}

export async function getMuseDiscoveryBoards(now = Date.now()): Promise<MuseDiscoveryBoards> {
  return cacheWrap("muse-board:discovery", 60_000, () => buildMuseDiscoveryBoards(now));
}

export async function buildMuseDiscoveryBoards(now = Date.now()): Promise<MuseDiscoveryBoards> {
  const trades = await listAllConfirmedTrades();
  const fills = confirmedFillsFromTrades(trades);
  const snapshot = replayFills(fills);
  const windows = allBoardWindows();
  const mostTraded = {} as MuseDiscoveryBoards["mostTraded"];
  const leaderboard = {} as MuseDiscoveryBoards["leaderboard"];
  const agentIds = [...snapshot.agents.keys()];
  const agents = await listAgentsByIds(agentIds);
  const labels = new Map(agents.map((agent) => [agent.id, agent]));

  for (const window of windows) {
    mostTraded[window] = rankMostTraded(fills, window, now).map(toTokenRank);
    leaderboard[window] = rankLeaderboard(snapshot, window, now).map((row) => {
      const agent = labels.get(row.agentId);
      const entry: MuseLeaderEntry = {
        agentId: row.agentId,
        handle: agent?.handle ?? null,
        displayName: agent?.displayName ?? null,
        realizedPnlLamports: row.realizedPnlLamports.toString(),
        volumeLamports: row.volumeLamports.toString(),
        fillCount: row.fillCount,
        closedCount: row.closedCount,
        winRateBps: row.winRateBps?.toString() ?? null,
      };
      return entry;
    });
  }

  const mostHeld = rankMostHeld(snapshot).map((row) => ({
    mint: row.mint,
    fillCount: 0,
    volumeLamports: "0",
    holders: row.holders,
    qtyHeldRaw: row.qtyHeldRaw.toString(),
    costBasisLamports: row.costBasisLamports.toString(),
  }));

  return {
    method: "continuing-vwap",
    mostTraded,
    mostHeld,
    leaderboard,
  };
}

function toTokenRank(row: { mint: string; fillCount: number; volumeLamports: bigint }): MuseTokenRank {
  return {
    mint: row.mint,
    fillCount: row.fillCount,
    volumeLamports: row.volumeLamports.toString(),
  };
}

export async function getMuseMostTraded(window: LeaderboardWindow): Promise<MuseTokenRank[]> {
  const boards = await getMuseDiscoveryBoards();
  return boards.mostTraded[window];
}

export async function getMuseMostHeld(): Promise<MuseTokenRank[]> {
  const boards = await getMuseDiscoveryBoards();
  return boards.mostHeld;
}

export async function getMuseLeaderboard(window: LeaderboardWindow): Promise<MuseLeaderEntry[]> {
  const boards = await getMuseDiscoveryBoards();
  return boards.leaderboard[window];
}

/** SQL helpers for siblings that want a cheap volume/holder read without replay. */
export async function queryMuseMostTradedSql(window: LeaderboardWindow) {
  return queryMostTradedMints(window);
}

export async function queryMuseMostHeldSql() {
  return queryMostHeldMints();
}
