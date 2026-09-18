import { cacheSWR } from "@/lib/cache";
import { FOMO_BUDGET_MS, HOUR_MS, PROVIDER_TTL_MS, THESES_SWR_MS } from "@/lib/constants";
import { finiteNumber, looksLikeMint } from "@/lib/format";
import { raceTimeout } from "@/lib/fast-fetch";
import { userFromBoardEntry } from "@/lib/human-map";
import { getSolanaTrendingSnapshot } from "@/lib/market";
import { harvestBoardTrader, harvestPublicSocial, peekPublicHarvest } from "@/lib/providers/public-social";
import {
  getFomoScanMostHeldTokens,
  getFomoScanTheses,
  getFomoScanTokenTheses,
  getFomoScanTraderBoard,
  getFomoScanTrendingTokens,
  getFomoScanUserByHandle,
  getFomoScanUserPnl,
  getFomoScanUserTheses,
  normalizePnl,
  normalizeUser,
  readThesisPage,
  resolveFomoScanTrader,
  type FomoScanResult,
} from "@/lib/providers/fomoscan";
import {
  listProviderCacheThesisPayloads,
  readFomoLeaderboard,
  readFomoTheses,
  readFomoTrader,
  readFomoTraderFromBoards,
  writeFomoLeaderboard,
  writeFomoTheses,
  writeFomoTrader,
  writeTraderCache,
} from "@/lib/providers/store";
import { getDiscover } from "@/lib/services/leaderboard";
import { dedupeTheses, refreshThesisSources, thesesFromUnknown } from "@/lib/thesis-sources";
import { loadJupiterTrendingRows } from "@/lib/token-logo";
import type {
  DiscoverSource,
  DiscoverTokenRow,
  FomoScanBoardEntry,
  FomoScanPnl,
  FomoScanThesis,
  FomoScanThesisPage,
  FomoScanUser,
  LeaderboardWindow,
} from "@/lib/types";

export async function resolveTrader(idOrHandle: string): Promise<FomoScanResult<FomoScanUser>> {
  const live = await resolveFomoScanTrader(idOrHandle);
  if (live.ok) {
    const user = normalizeUser(live.data) ?? live.data;
    void writeFomoTrader(user);
    void writeTraderCache({
      key: user.id,
      handle: user.handle,
      displayName: user.name,
      avatar: user.profilePicture,
      source: "fomoscan",
      ttlMs: PROVIDER_TTL_MS.traderProfile,
    });
    return { ...live, data: user };
  }
  const cached = await readFomoTrader(idOrHandle);
  if (cached) return { ok: true, data: cached, asOf: null, stale: true };
  return live;
}

export async function traderByHandle(handle: string): Promise<FomoScanResult<FomoScanUser>> {
  const live = await getFomoScanUserByHandle(handle);
  if (live.ok) {
    const user = normalizeUser(live.data) ?? live.data;
    void writeFomoTrader(user);
    return { ...live, data: user };
  }
  const cached = await readFomoTrader(handle);
  if (cached) return { ok: true, data: cached, asOf: null, stale: true };
  const board = await readFomoTraderFromBoards(handle);
  const fromBoard = board ? userFromBoardEntry(board.entry) : null;
  if (fromBoard) return { ok: true, data: fromBoard, asOf: null, stale: true };
  const harvested =
    harvestBoardTrader(handle, peekPublicHarvest()) ??
    harvestBoardTrader(handle, await harvestPublicSocial().catch(() => null));
  const fromHarvest = harvested ? userFromBoardEntry(harvested.entry) : null;
  if (fromHarvest) return { ok: true, data: fromHarvest, asOf: null, stale: true };
  return live;
}

export async function traderPnl(handle: string): Promise<FomoScanResult<FomoScanPnl>> {
  const live = await getFomoScanUserPnl(handle);
  if (!live.ok) return live;
  const pnl = normalizePnl(live.data);
  if (!pnl) {
    return { ok: false, status: 502, code: "invalid_pnl", message: "FomoScan PnL could not be mapped." };
  }
  return { ...live, data: pnl };
}

export async function tokenTheses(mint: string, before?: string) {
  const live = await readThesisPage(await getFomoScanTokenTheses(mint, before));
  if (live.ok) void writeFomoTheses(live.data.items);
  return live;
}

export async function userTheses(id: string, before?: string) {
  const live = await readThesisPage(await getFomoScanUserTheses(id, before));
  if (live.ok) void writeFomoTheses(live.data.items);
  return live;
}

export async function latestTheses(before?: string): Promise<FomoScanResult<FomoScanThesisPage>> {
  const live = await readThesisPage(await getFomoScanTheses(before));
  if (live.ok && live.data.items.length) void writeFomoTheses(live.data.items);
  return live;
}

export async function fomoTraderBoard(window: LeaderboardWindow) {
  const live = await getFomoScanTraderBoard(window);
  if (live.ok && live.data.entries.length) {
    void writeFomoLeaderboard(window, live.data);
    return live;
  }
  const cached = await readFomoLeaderboard(window);
  if (cached?.entries.length) {
    return { ok: true as const, data: cached, asOf: null, stale: true };
  }
  return live;
}

export async function fomoTrendingTokens() {
  return getFomoScanTrendingTokens();
}

export async function fomoMostHeldTokens() {
  return getFomoScanMostHeldTokens();
}

export type HomeTheses = {
  items: FomoScanThesis[];
  cached: number;
  official: number;
  public: number;
};

export async function loadHomeTheses(before?: string): Promise<HomeTheses> {
  return cacheSWR(
    `home:theses:v2:${before ?? ""}`,
    THESES_SWR_MS,
    () => assembleHomeTheses(),
    (row) => row.items.length > 0,
  );
}

export async function loadHomeTrending(): Promise<DiscoverTokenRow[]> {
  return cacheSWR(
    "home:trending:v1",
    HOUR_MS,
    loadHomeTrendingUncached,
    (rows) => rows.length > 0,
  );
}

async function assembleHomeTheses(): Promise<HomeTheses> {
  refreshThesisSources();
  const [table, payloads] = await Promise.all([
    raceTimeout(readFomoTheses({ limit: 80 }).catch(() => [] as FomoScanThesis[]), [] as FomoScanThesis[], FOMO_BUDGET_MS),
    raceTimeout(listProviderCacheThesisPayloads(80).catch(() => [] as unknown[]), [] as unknown[], FOMO_BUDGET_MS),
  ]);
  const cached = dedupeTheses([...table, ...payloads.flatMap((payload) => thesesFromUnknown(payload))]);
  if (cached.length) void writeFomoTheses(cached).catch(() => undefined);
  return {
    items: cached,
    cached: cached.length,
    official: 0,
    public: 0,
  };
}

async function loadHomeTrendingUncached(): Promise<DiscoverTokenRow[]> {
  const snap = await getSolanaTrendingSnapshot().catch(() => ({
    entries: [] as FomoScanBoardEntry[],
    source: "market" as const,
  }));
  const fromSnap = boardToDiscover(snap.entries, snap.source);
  if (fromSnap.length) return fromSnap;

  const discover = await getDiscover().catch(() => null);
  const fromDiscover = discover?.trending?.items ?? [];
  if (fromDiscover.length) return fromDiscover;

  const fomo = await fomoTrendingTokens();
  if (fomo.ok) {
    const rows = boardToDiscover(fomo.data.entries, "fomoscan");
    if (rows.length) return rows;
  }

  return loadJupiterTrendingRows().catch(() => []);
}

function boardToDiscover(entries: FomoScanBoardEntry[], source: DiscoverSource): DiscoverTokenRow[] {
  return entries
    .filter((entry) => looksLikeMint(entry.id))
    .map((entry, index) => ({
      rank: entry.rank || index + 1,
      mint: entry.id,
      symbol: entry.handle,
      name: entry.label,
      imageUrl: entry.avatarUrl,
      priceUsd: entry.price,
      volumeUsd: entry.volume,
      volumeLamports: null,
      marketCap: entry.marketCap,
      priceChange24h: finiteNumber(entry.pnl),
      holders: entry.memberCount,
      trades: entry.numTrades,
      pairAddress: null,
      source,
    }));
}
