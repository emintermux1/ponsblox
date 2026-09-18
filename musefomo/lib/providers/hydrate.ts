import { cacheSWR } from "@/lib/cache";
import { HOUR_MS, PROVIDER_TTL_MS } from "@/lib/constants";
import { PROVIDER_BUDGET_MS, publicJson } from "@/lib/fast-fetch";
import {
  getTokenOverview,
  getTrendingTokens as getBirdeyeTrending,
} from "@/lib/providers/birdeye";
import { getTrendingTokens as getGmgnTrending } from "@/lib/providers/gmgn";
import { getTrendingTokens as getPumpTrending } from "@/lib/providers/pump";
import {
  getTokenMeta,
  getTrendingTokens as getSolscanTrending,
} from "@/lib/providers/solscan";
import { listCachedTokenMarkets, writeTokenCache } from "@/lib/providers/store";
import type { TokenMarketData } from "@/lib/providers/types";
import {
  applyTokenLook,
  geckoIncludedLooks,
  loadJupiterTrendingRows,
  paintTokenRows,
  preferLabel,
  type GeckoPoolBody,
} from "@/lib/token-logo";
import type { DiscoverTokenRow, FomoScanBoardEntry, TokenMarket } from "@/lib/types";

export function mergeLiveCoinRows(rows: DiscoverTokenRow[]): DiscoverTokenRow[] {
  const byMint = new Map<string, DiscoverTokenRow>();
  for (const row of rows) {
    if (!row.mint) continue;
    const painted = applyTokenLook(row, { symbol: row.symbol, name: row.name, imageUrl: row.imageUrl });
    const prev = byMint.get(painted.mint);
    if (!prev) {
      byMint.set(painted.mint, painted);
      continue;
    }
    byMint.set(painted.mint, {
      ...prev,
      symbol: preferLabel(prev.symbol, painted.symbol, painted.mint),
      name: preferLabel(prev.name, painted.name, painted.mint),
      imageUrl: prev.imageUrl ?? painted.imageUrl,
      priceUsd: prev.priceUsd ?? painted.priceUsd,
      volumeUsd: prev.volumeUsd ?? painted.volumeUsd,
      marketCap: prev.marketCap ?? painted.marketCap,
      priceChange24h: prev.priceChange24h ?? painted.priceChange24h,
      holders: prev.holders ?? painted.holders,
      trades: prev.trades ?? painted.trades,
      pairAddress: prev.pairAddress ?? painted.pairAddress,
      source: prev.priceUsd != null || prev.volumeUsd != null ? prev.source : painted.source,
    });
  }
  return [...byMint.values()]
    .sort((a, b) => (b.volumeUsd ?? 0) - (a.volumeUsd ?? 0) || (b.marketCap ?? 0) - (a.marketCap ?? 0))
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

function birdRow(input: {
  mint: string;
  symbol: string | null;
  name: string | null;
  logo: string | null;
  priceUsd: number | null;
  volume24h: number | null;
  rank: number;
  marketCap?: number | null;
  priceChange24h?: number | null;
  holders?: number | null;
  pairAddress?: string | null;
}): DiscoverTokenRow {
  return {
    rank: input.rank,
    mint: input.mint,
    symbol: input.symbol,
    name: input.name,
    imageUrl: input.logo,
    priceUsd: input.priceUsd,
    volumeUsd: input.volume24h,
    volumeLamports: null,
    marketCap: input.marketCap ?? null,
    priceChange24h: input.priceChange24h ?? null,
    holders: input.holders ?? null,
    trades: null,
    pairAddress: input.pairAddress ?? null,
    source: "market",
  };
}

function scanRow(input: {
  mint: string;
  symbol: string | null;
  name: string | null;
  rank: number;
}): DiscoverTokenRow {
  return {
    rank: input.rank,
    mint: input.mint,
    symbol: input.symbol,
    name: input.name,
    imageUrl: null,
    priceUsd: null,
    volumeUsd: null,
    volumeLamports: null,
    marketCap: null,
    priceChange24h: null,
    holders: null,
    trades: null,
    pairAddress: null,
    source: "market",
  };
}

function geckoRow(entry: FomoScanBoardEntry, index: number): DiscoverTokenRow {
  return {
    rank: entry.rank || index + 1,
    mint: entry.id,
    symbol: entry.handle,
    name: entry.label,
    imageUrl: entry.avatarUrl,
    priceUsd: entry.price,
    volumeUsd: entry.volume,
    volumeLamports: null,
    marketCap: entry.marketCap,
    priceChange24h: entry.pnl,
    holders: entry.memberCount,
    trades: entry.numTrades,
    pairAddress: null,
    source: "market",
  };
}

function cacheRow(row: TokenMarketData, index: number): DiscoverTokenRow {
  return {
    rank: index + 1,
    mint: row.mint,
    symbol: row.symbol,
    name: row.name,
    imageUrl: row.logo,
    priceUsd: row.priceUsd,
    volumeUsd: row.volume24h,
    volumeLamports: null,
    marketCap: row.marketCap,
    priceChange24h: row.priceChange24h,
    holders: row.holderCount,
    trades: null,
    pairAddress: null,
    source: "market",
  };
}

function rowToCache(row: DiscoverTokenRow): TokenMarketData {
  return {
    mint: row.mint,
    symbol: row.symbol,
    name: row.name,
    logo: row.imageUrl,
    priceUsd: row.priceUsd,
    marketCap: row.marketCap,
    liquidity: null,
    volume24h: row.volumeUsd,
    priceChange24h: row.priceChange24h,
    holderCount: row.holders,
    source: "cache",
    updatedAt: Date.now(),
    stale: false,
  };
}

export function coinRowsToBoard(rows: DiscoverTokenRow[]): FomoScanBoardEntry[] {
  return rows.map((row) => ({
    rank: row.rank,
    id: row.mint,
    handle: row.symbol,
    label: row.name ?? row.symbol,
    avatarUrl: row.imageUrl,
    pnl: row.priceChange24h,
    volume: row.volumeUsd,
    followers: null,
    numTrades: row.trades,
    memberCount: row.holders,
    marketCap: row.marketCap,
    price: row.priceUsd,
    liquidity: null,
  }));
}

async function enrichMissingPrices(rows: DiscoverTokenRow[]): Promise<DiscoverTokenRow[]> {
  const need = rows.filter((row) => row.priceUsd == null).slice(0, 8);
  if (!need.length) return rows;
  const extras = await Promise.all(
    need.map(async (row) => {
      const overview = await getTokenOverview(row.mint).catch(() => null);
      if (overview?.ok) return overview.data;
      const meta = await getTokenMeta(row.mint).catch(() => null);
      return meta?.ok ? meta.data : null;
    }),
  );
  const byMint = new Map(need.map((row, index) => [row.mint, extras[index]]));
  return rows.map((row) => {
    const extra = byMint.get(row.mint);
    if (!extra) return row;
    return {
      ...row,
      symbol: row.symbol ?? extra.symbol,
      name: row.name ?? extra.name,
      imageUrl: row.imageUrl ?? extra.logo,
      priceUsd: row.priceUsd ?? extra.priceUsd,
      volumeUsd: row.volumeUsd ?? extra.volume24h,
      marketCap: row.marketCap ?? extra.marketCap,
      priceChange24h: row.priceChange24h ?? extra.priceChange24h,
      holders: row.holders ?? extra.holderCount,
    };
  });
}

async function settled<T>(work: Promise<T>, fallback: T, ms = PROVIDER_BUDGET_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function rememberRows(rows: DiscoverTokenRow[], limit: number): Promise<DiscoverTokenRow[]> {
  const merged = mergeLiveCoinRows(rows).slice(0, limit);
  void Promise.all(
    merged.map((row) => writeTokenCache(rowToCache(row), HOUR_MS).catch(() => undefined)),
  );
  return merged;
}

async function dexBoostRows(): Promise<DiscoverTokenRow[]> {
  const body = await publicJson<Array<{ chainId?: string; tokenAddress?: string }>>(
    "https://api.dexscreener.com/token-boosts/top/v1",
  );
  return (body ?? [])
    .filter((row) => row.chainId === "solana" && row.tokenAddress)
    .slice(0, 16)
    .map((row, index) =>
      scanRow({
        mint: row.tokenAddress as string,
        symbol: null,
        name: null,
        rank: index + 1,
      }),
    );
}

async function coinGeckoOnchainRows(): Promise<DiscoverTokenRow[]> {
  const gecko = await publicJson<GeckoPoolBody>(
    "https://api.coingecko.com/api/v3/onchain/networks/solana/trending_pools?include=base_token",
  );
  return geckoPoolRowsFrom(gecko);
}

function geckoPoolRowsFrom(gecko: GeckoPoolBody | null): DiscoverTokenRow[] {
  const included = geckoIncludedLooks(gecko);
  const rows: DiscoverTokenRow[] = [];
  (gecko?.data ?? []).forEach((pool, index) => {
    const tokenId = pool.relationships?.base_token?.data?.id ?? "";
    const mint = tokenId.includes("_") ? tokenId.split("_").pop() ?? "" : tokenId;
    if (!mint) return;
    const look = included.get(mint) ?? included.get(tokenId);
    const price = Number(pool.attributes?.base_token_price_usd ?? NaN);
    const poolSymbol = pool.attributes?.name?.split(" / ")[0] ?? pool.attributes?.name ?? null;
    const row = geckoRow(
      {
        rank: index + 1,
        id: mint,
        handle: look?.symbol ?? poolSymbol,
        label: look?.name ?? look?.symbol ?? poolSymbol,
        avatarUrl: look?.imageUrl ?? null,
        pnl: Number(pool.attributes?.price_change_percentage?.h24 ?? NaN) || null,
        volume: Number(pool.attributes?.volume_usd?.h24 ?? NaN) || null,
        followers: null,
        numTrades: null,
        memberCount: null,
        marketCap: Number(pool.attributes?.market_cap_usd ?? NaN) || null,
        price: Number.isFinite(price) ? price : null,
        liquidity: null,
      },
      index,
    );
    rows.push(
      applyTokenLook(
        { ...row, pairAddress: pool.attributes?.address ?? null },
        { symbol: look?.symbol ?? poolSymbol, name: look?.name ?? null, imageUrl: look?.imageUrl ?? null },
      ),
    );
  });
  return rows;
}

async function geckoPoolRows(): Promise<DiscoverTokenRow[]> {
  const gecko = await publicJson<GeckoPoolBody>(
    "https://api.geckoterminal.com/api/v2/networks/solana/trending_pools?include=base_token",
  );
  return geckoPoolRowsFrom(gecko);
}

async function buildLiveCoinBook(limit: number): Promise<DiscoverTokenRow[]> {
  const [cached, bird, gecko, coinGecko, scan, boosts, jupiter, gmgn, pump] = await Promise.all([
    settled(listCachedTokenMarkets(limit).catch(() => []), [], 500),
    settled(getBirdeyeTrending(20).catch(() => null), null),
    settled(geckoPoolRows().catch(() => []), []),
    settled(coinGeckoOnchainRows().catch(() => []), []),
    settled(getSolscanTrending(20).catch(() => null), null),
    settled(dexBoostRows().catch(() => []), []),
    settled(loadJupiterTrendingRows().catch(() => []), []),
    settled(getGmgnTrending(20).catch(() => null), null),
    settled(getPumpTrending(20).catch(() => null), null),
  ]);
  const birdRows =
    bird?.ok && bird.data.length
      ? bird.data.map((item, index) => birdRow({ ...item, rank: item.rank || index + 1 }))
      : [];
  const gmgnRows =
    gmgn?.ok && gmgn.data.length
      ? gmgn.data.map((item, index) =>
          birdRow({
            mint: item.mint,
            symbol: item.symbol,
            name: item.name,
            logo: item.logo,
            priceUsd: item.priceUsd,
            volume24h: item.volume24h,
            rank: item.rank || index + 1,
            marketCap: item.marketCap,
            priceChange24h: item.priceChange24h,
            holders: item.holderCount,
            pairAddress: item.pairAddress,
          }),
        )
      : [];
  const pumpRows =
    pump?.ok && pump.data.length
      ? pump.data.map((item, index) =>
          birdRow({
            mint: item.mint,
            symbol: item.symbol,
            name: item.name,
            logo: item.logo,
            priceUsd: item.priceUsd,
            volume24h: item.volume24h,
            rank: item.rank || index + 1,
            marketCap: item.marketCap,
            priceChange24h: item.priceChange24h,
            holders: item.holderCount,
            pairAddress: item.pairAddress,
          }),
        )
      : [];
  const merged = mergeLiveCoinRows([
    ...jupiter,
    ...gmgnRows,
    ...pumpRows,
    ...birdRows,
    ...gecko,
    ...coinGecko,
    ...(scan?.ok ? scan.data.map((item, index) => scanRow({ ...item, rank: index + 1 })) : []),
    ...boosts,
    ...cached.map((row, index) => cacheRow(row, index)),
  ]).slice(0, limit);
  const painted = await paintTokenRows(merged);
  if (painted.length) void rememberRows(painted, limit);
  return painted;
}

export async function loadLiveCoinBook(limit = 48): Promise<DiscoverTokenRow[]> {
  return cacheSWR(`live-coin-book:logos:v2:${limit}`, 90_000, () => buildLiveCoinBook(limit), (rows) =>
    rows.some((row) => row.imageUrl && row.symbol && (row.priceUsd != null || row.volumeUsd != null)),
  );
}

export async function overlayTokenMarket(market: TokenMarket): Promise<TokenMarket> {
  const overview = await getTokenOverview(market.mint).catch(() => null);
  let extra = overview?.ok ? overview.data : null;
  if (!extra) {
    const meta = await getTokenMeta(market.mint).catch(() => null);
    extra = meta?.ok ? meta.data : null;
  }
  if (!extra) return market;
  const next: TokenMarket = {
    ...market,
    symbol: market.symbol ?? extra.symbol,
    name: market.name ?? extra.name,
    imageUrl: market.imageUrl ?? extra.logo,
    priceUsd: market.priceUsd ?? extra.priceUsd,
    priceChange24h: market.priceChange24h ?? extra.priceChange24h,
    volume24h: market.volume24h ?? extra.volume24h,
    liquidityUsd: market.liquidityUsd ?? extra.liquidity,
    marketCap: market.marketCap ?? extra.marketCap,
    fdv: market.fdv ?? extra.marketCap,
  };
  void writeTokenCache(
    {
      mint: next.mint,
      symbol: next.symbol,
      name: next.name,
      logo: next.imageUrl,
      priceUsd: next.priceUsd,
      marketCap: next.marketCap,
      liquidity: next.liquidityUsd,
      volume24h: next.volume24h,
      priceChange24h: next.priceChange24h,
      holderCount: extra.holderCount,
      source: extra.source,
      updatedAt: Date.now(),
      stale: false,
    },
    PROVIDER_TTL_MS.tokenOverview,
  );
  return next;
}
