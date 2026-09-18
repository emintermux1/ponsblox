import { PROVIDER_BUDGET_MS, PROVIDER_TTL_MS, SOL_MINT } from "@/lib/constants";
import { cacheWrap } from "@/lib/cache";
import { raceTimeout } from "@/lib/fast-fetch";
import {
  birdeyeSolUsd,
  getTokenMarketData as birdeyeMarketData,
  getTokenOverview,
  getTokenPrice,
  getTrendingTokens as birdeyeTrending,
  type BirdeyeTrendingToken,
} from "@/lib/providers/birdeye";
import {
  getTokenInfo as gmgnTokenInfo,
  getTrendingTokens as gmgnTrending,
  type GmgnTrendingToken,
} from "@/lib/providers/gmgn";
import {
  getTokenMeta as pumpTokenMeta,
  getTrendingTokens as pumpTrending,
  type PumpTrendingToken,
} from "@/lib/providers/pump";
import {
  getTokenMeta,
  getTrendingTokens as solscanTrending,
  type SolscanTrendingToken,
} from "@/lib/providers/solscan";
import { memoryGet, memorySet } from "@/lib/providers/runtime";
import { readTokenCache, writeTokenCache } from "@/lib/providers/store";
import {
  emptyTokenMarket,
  hasMarketSignal,
  mergeTokenMarket,
  type TokenMarketData,
} from "@/lib/providers/types";
import type { DiscoverSource, FomoScanBoardEntry } from "@/lib/types";

export type MarketSnapshot = TokenMarketData;

export async function getTokenMarketData(mint: string): Promise<TokenMarketData> {
  return cacheWrap(`svc:token-market:${mint}`, PROVIDER_TTL_MS.tokenPrice, () => loadTokenMarketData(mint));
}

async function loadTokenMarketData(mint: string): Promise<TokenMarketData> {
  const memory = memoryGet<TokenMarketData>(`svc:token:${mint}`);
  if (memory && hasMarketSignal(memory) && Date.now() - memory.updatedAt < PROVIDER_TTL_MS.tokenPrice) {
    return memory;
  }
  const cached = memory ?? (await raceTimeout(readTokenCache(mint), null, 400));
  if (cached && hasMarketSignal(cached) && Date.now() - cached.updatedAt < PROVIDER_TTL_MS.tokenPrice) {
    return cached;
  }

  let row = cached ?? emptyTokenMarket(mint);
  const [overview, market, price, meta, gmgn, pump] = await Promise.all([
    raceTimeout(getTokenOverview(mint), null, PROVIDER_BUDGET_MS),
    raceTimeout(birdeyeMarketData(mint), null, PROVIDER_BUDGET_MS),
    raceTimeout(getTokenPrice(mint), null, PROVIDER_BUDGET_MS),
    raceTimeout(getTokenMeta(mint), null, PROVIDER_BUDGET_MS),
    raceTimeout(gmgnTokenInfo(mint), null, PROVIDER_BUDGET_MS),
    raceTimeout(pumpTokenMeta(mint), null, PROVIDER_BUDGET_MS),
  ]);
  if (overview?.ok) row = mergeTokenMarket(row, { ...overview.data, stale: overview.stale });
  if (market?.ok) row = mergeTokenMarket(row, { ...market.data, stale: market.stale });
  if (price?.ok) {
    row = mergeTokenMarket(row, {
      ...emptyTokenMarket(mint, "birdeye"),
      priceUsd: price.data,
      updatedAt: price.updatedAt,
      stale: price.stale,
    });
  }
  if (meta?.ok) row = mergeTokenMarket(row, { ...meta.data, stale: meta.stale });
  if (gmgn?.ok) row = mergeTokenMarket(row, { ...gmgn.data, stale: gmgn.stale });
  if (pump?.ok) row = mergeTokenMarket(row, { ...pump.data, stale: pump.stale });
  if (hasMarketSignal(row)) return remember(row);

  if (cached && hasMarketSignal(cached)) return { ...cached, stale: true };
  return remember(row);
}

function remember(row: TokenMarketData): TokenMarketData {
  memorySet(`svc:token:${row.mint}`, row, PROVIDER_TTL_MS.tokenOverview);
  void writeTokenCache(row, PROVIDER_TTL_MS.tokenOverview);
  return row;
}

export async function getSolUsdFromProviders(): Promise<number | null> {
  const cached = memoryGet<number>("svc:sol-usd");
  if (cached != null) return cached;
  const birdeye = await birdeyeSolUsd();
  if (birdeye != null) {
    memorySet("svc:sol-usd", birdeye, 30_000);
    return birdeye;
  }
  const sol = await getTokenMarketData(SOL_MINT);
  if (sol.priceUsd != null) {
    memorySet("svc:sol-usd", sol.priceUsd, 30_000);
    return sol.priceUsd;
  }
  return null;
}

export type TrendingSnapshot = {
  entries: FomoScanBoardEntry[];
  source: DiscoverSource;
};

export function trendingFromBirdeye(tokens: BirdeyeTrendingToken[]): FomoScanBoardEntry[] {
  return tokens.map((token, index) => ({
    rank: token.rank || index + 1,
    id: token.mint,
    handle: token.symbol,
    label: token.name ?? token.symbol,
    avatarUrl: token.logo,
    pnl: null,
    volume: token.volume24h,
    followers: null,
    numTrades: null,
    memberCount: null,
    marketCap: null,
    price: token.priceUsd,
    liquidity: token.liquidity,
  }));
}

export function trendingFromSolscan(tokens: SolscanTrendingToken[]): FomoScanBoardEntry[] {
  return tokens.map((token, index) => ({
    rank: index + 1,
    id: token.mint,
    handle: token.symbol,
    label: token.name ?? token.symbol,
    avatarUrl: null,
    pnl: null,
    volume: null,
    followers: null,
    numTrades: null,
    memberCount: null,
    marketCap: null,
    price: null,
    liquidity: null,
  }));
}

export function trendingFromGmgn(tokens: GmgnTrendingToken[]): FomoScanBoardEntry[] {
  return tokens.map((token, index) => ({
    rank: token.rank || index + 1,
    id: token.mint,
    handle: token.symbol,
    label: token.name ?? token.symbol,
    avatarUrl: token.logo,
    pnl: token.priceChange24h,
    volume: token.volume24h,
    followers: null,
    numTrades: null,
    memberCount: token.holderCount,
    marketCap: token.marketCap,
    price: token.priceUsd,
    liquidity: token.liquidity,
  }));
}

export function trendingFromPump(tokens: PumpTrendingToken[]): FomoScanBoardEntry[] {
  return tokens.map((token, index) => ({
    rank: token.rank || index + 1,
    id: token.mint,
    handle: token.symbol,
    label: token.name ?? token.symbol,
    avatarUrl: token.logo,
    pnl: token.priceChange24h,
    volume: token.volume24h,
    followers: null,
    numTrades: null,
    memberCount: token.holderCount,
    marketCap: token.marketCap,
    price: token.priceUsd,
    liquidity: token.liquidity,
  }));
}

export async function getProviderTrendingBoard(): Promise<TrendingSnapshot> {
  const [gmgn, pump] = await Promise.all([
    raceTimeout(gmgnTrending(20), null, PROVIDER_BUDGET_MS),
    raceTimeout(pumpTrending(20), null, PROVIDER_BUDGET_MS),
  ]);
  if (gmgn?.ok && gmgn.data.length) {
    return { entries: trendingFromGmgn(gmgn.data), source: "market" };
  }
  if (pump?.ok && pump.data.length) {
    return { entries: trendingFromPump(pump.data), source: "market" };
  }
  const bird = await birdeyeTrending(20);
  if (bird.ok && bird.data.length) {
    return { entries: trendingFromBirdeye(bird.data), source: "market" };
  }
  const scan = await solscanTrending(12);
  if (scan.ok && scan.data.length) {
    const entries = trendingFromSolscan(scan.data);
    const hydrated = await hydrateTrending(entries.slice(0, 8));
    return { entries: hydrated.length ? hydrated : entries, source: "market" };
  }
  return { entries: [], source: "market" };
}

async function hydrateTrending(entries: FomoScanBoardEntry[]): Promise<FomoScanBoardEntry[]> {
  const next: FomoScanBoardEntry[] = [];
  for (const entry of entries) {
    const market = await getTokenMarketData(entry.id).catch(() => null);
    if (!market || !hasMarketSignal(market)) {
      next.push(entry);
      continue;
    }
    next.push({
      ...entry,
      handle: market.symbol ?? entry.handle,
      label: market.name ?? market.symbol ?? entry.label,
      avatarUrl: market.logo ?? entry.avatarUrl,
      pnl: market.priceChange24h,
      volume: market.volume24h ?? entry.volume,
      marketCap: market.marketCap,
      price: market.priceUsd ?? entry.price,
      liquidity: market.liquidity ?? entry.liquidity,
      memberCount: market.holderCount,
    });
  }
  return next;
}

export function tokenMarketFromData(row: TokenMarketData): {
  mint: string;
  symbol: string | null;
  name: string | null;
  imageUrl: string | null;
  priceUsd: number | null;
  priceChange24h: number | null;
  volume24h: number | null;
  liquidityUsd: number | null;
  marketCap: number | null;
  holderCount: number | null;
} {
  return {
    mint: row.mint,
    symbol: row.symbol,
    name: row.name,
    imageUrl: row.logo,
    priceUsd: row.priceUsd,
    priceChange24h: row.priceChange24h,
    volume24h: row.volume24h,
    liquidityUsd: row.liquidity,
    marketCap: row.marketCap,
    holderCount: row.holderCount,
  };
}
