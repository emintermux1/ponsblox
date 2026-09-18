import { PublicKey } from "@solana/web3.js";

import { cacheWrap, cacheWrapIf } from "@/lib/cache";
import { CHART_TIMEFRAMES, LIQUID_MINTS, PROVIDER_BUDGET_MS, PROVIDER_TTL_MS, PUBLIC_GET_MS } from "@/lib/constants";
import { raceTimeout } from "@/lib/fast-fetch";
import { looksLikeEvm } from "@/lib/format";
import { knownTokenMarket, overlayKnownMarket } from "@/lib/known-mints";
import { loadGeckoRobinhoodMarket } from "@/lib/pinned-tokens";
import { asHttpsLogo } from "@/lib/token-logo";
import { heliusGetAsset } from "@/lib/helius";
import { type ChartPairHit, loadMintChart, mapGeckoOhlcvBody, resolveChartPair } from "@/lib/ohlcv";
import { pickImageUrl } from "@/lib/pfp";
import { coinRowsToBoard, loadLiveCoinBook } from "@/lib/providers/hydrate";
import { getProviderTrendingBoard, getSolUsdFromProviders, getTokenMarketData } from "@/lib/services/market-data";
import type {
  Candle,
  ChartTimeframe,
  DiscoverSource,
  FomoScanBoardEntry,
  PoolTrade,
  TokenChart,
  TokenMarket,
} from "@/lib/types";

type DexPair = {
  chainId?: string;
  dexId?: string;
  pairAddress?: string;
  baseToken?: { address?: string; symbol?: string; name?: string };
  quoteToken?: { address?: string };
  priceUsd?: string;
  priceChange?: { m5?: number; h1?: number; h6?: number; h24?: number };
  volume?: { h24?: number };
  liquidity?: { usd?: number };
  fdv?: number;
  marketCap?: number;
  txns?: { h24?: { buys?: number; sells?: number } };
  info?: { imageUrl?: string };
};

const GECKO_HEADERS = {
  Accept: "application/json",
  "User-Agent": "MuseFOMO/1.0 (+https://musefomo.family)",
};

export function parseTimeframe(value: string | null | undefined): ChartTimeframe {
  const next = CHART_TIMEFRAMES.find((item) => item === value);
  return next ?? "1D";
}

export function canonicalMint(raw: string): string {
  const mint = safeDecode(raw).trim();
  try {
    return new PublicKey(mint).toBase58();
  } catch {
    return mint;
  }
}

export function isSolanaPubkey(value: string): boolean {
  try {
    new PublicKey(value);
    return true;
  } catch {
    return false;
  }
}

function safeDecode(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export async function resolveTokenRef(raw: string): Promise<{ mint: string; pairs: DexPair[] }> {
  const input = safeDecode(raw).trim();
  return cacheWrap(`resolve:${input}`, 15_000, () => resolveTokenRefUncached(input));
}

async function resolveTokenRefUncached(input: string): Promise<{ mint: string; pairs: DexPair[] }> {
  let mint = canonicalMint(input);
  const [asToken, asPair, asTokenPairs] = await Promise.all([
    resolveDexPairs(mint),
    dexJson<{ pairs?: DexPair[] }>(`https://api.dexscreener.com/latest/dex/pairs/solana/${input}`),
    dexJson<DexPair[] | { pairs?: DexPair[] }>(
      `https://api.dexscreener.com/token-pairs/v1/solana/${mint}`,
    ),
  ]);
  const pairHits = solanaPairs(asPair?.pairs ?? []);
  const v1Hits = solanaPairs(Array.isArray(asTokenPairs) ? asTokenPairs : (asTokenPairs?.pairs ?? []));
  let pairs = dedupePairs([...asToken, ...pairHits, ...v1Hits]);
  if (pairHits[0]?.baseToken?.address) {
    mint = pairHits[0].baseToken.address;
  }
  if (!pairs.length) {
    const geckoMint = await geckoPoolForMint(mint);
    if (geckoMint) {
      const geckoPair = await dexJson<{ pairs?: DexPair[] }>(
        `https://api.dexscreener.com/latest/dex/pairs/solana/${geckoMint}`,
      );
      pairs = solanaPairs(geckoPair?.pairs ?? []);
    }
  }
  if (!pairs.length && input.length >= 2) {
    const search = await dexJson<{ pairs?: DexPair[] }>(
      `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(input)}`,
    );
    const found = solanaPairs(search?.pairs ?? []);
    const exact = found.filter((pair) => pair.baseToken?.address === mint || pair.pairAddress === input);
    pairs = exact.length ? exact : isSolanaPubkey(mint) ? [] : found.slice(0, 6);
    if (pairs[0]?.baseToken?.address) mint = pairs[0].baseToken.address;
  }
  return { mint, pairs };
}

function fromProviderMarket(mint: string, layered: Awaited<ReturnType<typeof getTokenMarketData>>): TokenMarket {
  return {
    mint: layered.mint || mint,
    symbol: layered.symbol,
    name: layered.name,
    imageUrl: asHttpsLogo(layered.logo),
    priceUsd: layered.priceUsd,
    priceChange24h: layered.priceChange24h,
    volume24h: layered.volume24h,
    liquidityUsd: layered.liquidity,
    marketCap: layered.marketCap,
    fdv: layered.marketCap,
    pairAddress: null,
    dexId: null,
    decimals: null,
    buys24h: null,
    sells24h: null,
    buyVolume24h: null,
    sellVolume24h: null,
    holderCount: layered.holderCount,
  };
}

function marketFromChartPair(mint: string, pair: ChartPairHit | null): TokenMarket {
  const buys = pair?.buys24h ?? 0;
  const sells = pair?.sells24h ?? 0;
  const volume = pair?.volume24h ?? 0;
  const totalTx = buys + sells;
  return {
    mint,
    symbol: pair?.symbol ?? null,
    name: pair?.name ?? null,
    imageUrl: asHttpsLogo(pair?.imageUrl),
    priceUsd: pair?.priceUsd ?? null,
    priceChange24h: pair?.priceChange24h ?? null,
    volume24h: pair?.volume24h ?? null,
    liquidityUsd: pair && pair.liquidity > 0 && pair.liquidity < 1e15 ? pair.liquidity : null,
    marketCap: pair?.marketCap ?? null,
    fdv: pair?.fdv ?? pair?.marketCap ?? null,
    pairAddress: pair?.pairAddress ?? null,
    dexId: pair?.dexId ?? null,
    decimals: null,
    buys24h: pair?.buys24h ?? null,
    sells24h: pair?.sells24h ?? null,
    buyVolume24h: totalTx ? volume * (buys / totalTx) : null,
    sellVolume24h: totalTx ? volume * (sells / totalTx) : null,
    holderCount: null,
  };
}

export async function getTokenMarket(raw: string): Promise<TokenMarket> {
  return cacheWrap(`market:v7:${raw}`, 15_000, async () => {
    const mint = canonicalMint(raw);
    if (looksLikeEvm(mint)) {
      return overlayKnownMarket(await loadGeckoRobinhoodMarket(mint.toLowerCase()));
    }
    const known = knownTokenMarket(mint);
    const [layered, resolved] = await Promise.all([
      isSolanaPubkey(mint)
        ? raceTimeout(getTokenMarketData(mint).catch(() => null), null, PROVIDER_BUDGET_MS)
        : Promise.resolve(null),
      raceTimeout(resolveChartPair(mint), { mint, pair: null, candidates: [] }, PROVIDER_BUDGET_MS),
    ]);
    const pairMarket = marketFromChartPair(mint, resolved.pair);
    if (layered && (layered.priceUsd != null || layered.symbol || layered.name)) {
      return overlayKnownMarket({
        ...fromProviderMarket(mint, layered),
        pairAddress: pairMarket.pairAddress,
        dexId: pairMarket.dexId,
        symbol: layered.symbol ?? pairMarket.symbol,
        name: layered.name ?? pairMarket.name,
        imageUrl: asHttpsLogo(layered.logo) ?? asHttpsLogo(pairMarket.imageUrl),
        priceUsd: layered.priceUsd ?? pairMarket.priceUsd,
        priceChange24h: layered.priceChange24h ?? pairMarket.priceChange24h,
        volume24h: layered.volume24h ?? pairMarket.volume24h,
        liquidityUsd: layered.liquidity ?? pairMarket.liquidityUsd,
        marketCap: layered.marketCap ?? pairMarket.marketCap,
        fdv: layered.marketCap ?? pairMarket.fdv,
        buys24h: pairMarket.buys24h,
        sells24h: pairMarket.sells24h,
        buyVolume24h: pairMarket.buyVolume24h,
        sellVolume24h: pairMarket.sellVolume24h,
      });
    }
    if (pairMarket.pairAddress || pairMarket.priceUsd != null) return overlayKnownMarket(pairMarket);
    const fallback = await raceTimeout(loadDexGeckoTokenMarket(raw), known, PUBLIC_GET_MS);
    return overlayKnownMarket(fallback ?? known ?? pairMarket);
  });
}

async function loadDexGeckoTokenMarket(raw: string): Promise<TokenMarket> {
  const { mint, pairs } = await resolveTokenRef(raw);
  const asset = isSolanaPubkey(mint) ? await heliusGetAsset(mint).catch(() => null) : null;
  const pair = pickPair(pairs, mint);
  let image = pickImageUrl(
    pair?.info?.imageUrl,
    ...pairs.map((row) => row.info?.imageUrl),
    asset?.imageUrl,
  );
  let marketCap = finiteNumber(pair?.marketCap);
  if (!image || marketCap == null) {
    const gecko = await geckoTokenMeta(mint);
    image = pickImageUrl(image, gecko?.imageUrl);
    marketCap = marketCap ?? gecko?.marketCap ?? null;
  }
  const buys = pair?.txns?.h24?.buys ?? 0;
  const sells = pair?.txns?.h24?.sells ?? 0;
  const volume = pair?.volume?.h24 ?? 0;
  const totalTx = buys + sells;
  return {
    mint,
    symbol: pair?.baseToken?.symbol ?? asset?.symbol ?? null,
    name: pair?.baseToken?.name ?? asset?.name ?? null,
    imageUrl: asHttpsLogo(image),
    priceUsd: pair?.priceUsd ? Number(pair.priceUsd) : null,
    priceChange24h: pair?.priceChange?.h24 ?? null,
    volume24h: pair?.volume?.h24 ?? null,
    liquidityUsd: pair?.liquidity?.usd ?? null,
    marketCap,
    fdv: pair?.fdv ?? pair?.marketCap ?? null,
    pairAddress: pair?.pairAddress ?? null,
    dexId: pair?.dexId ?? null,
    decimals: asset?.decimals ?? null,
    buys24h: pair?.txns?.h24?.buys ?? null,
    sells24h: pair?.txns?.h24?.sells ?? null,
    buyVolume24h: totalTx ? volume * (buys / totalTx) : null,
    sellVolume24h: totalTx ? volume * (sells / totalTx) : null,
    holderCount: null,
  };
}

export type DexTokenCard = {
  symbol: string | null;
  image: string | null;
  priceUsd: number | null;
};

export async function getDexTokenCards(mints: string[]): Promise<Map<string, DexTokenCard>> {
  const unique = [...new Set(mints)].slice(0, 30);
  const map = new Map<string, DexTokenCard>();
  if (!unique.length) return map;
  return cacheWrap(`dex-cards-v2:${unique.slice().sort().join(",")}`, 45_000, async () => {
    const rows = await dexJson<DexPair[] | { pairs?: DexPair[] }>(
      `https://api.dexscreener.com/tokens/v1/solana/${unique.join(",")}`,
    );
    const pairs = Array.isArray(rows) ? rows : (rows?.pairs ?? []);
    for (const pair of pairs) {
      const mint = pair.baseToken?.address;
      if (!mint || map.has(mint)) continue;
      const price = pair.priceUsd ? Number(pair.priceUsd) : null;
      map.set(mint, {
        symbol: pair.baseToken?.symbol ?? null,
        image: pair.info?.imageUrl ?? null,
        priceUsd: Number.isFinite(price) ? price : null,
      });
    }
    const missing = unique.filter((mint) => !map.has(mint));
    if (missing.length) {
      const latest = await dexJson<{ pairs?: DexPair[] }>(
        `https://api.dexscreener.com/latest/dex/tokens/${missing.join(",")}`,
      );
      for (const pair of latest?.pairs ?? []) {
        if (pair.chainId && pair.chainId !== "solana") continue;
        const mint = pair.baseToken?.address;
        if (!mint || map.has(mint)) continue;
        const price = pair.priceUsd ? Number(pair.priceUsd) : null;
        map.set(mint, {
          symbol: pair.baseToken?.symbol ?? null,
          image: pair.info?.imageUrl ?? null,
          priceUsd: Number.isFinite(price) ? price : null,
        });
      }
    }
    return map;
  });
}

export async function getDexTokenImages(mints: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(mints)].slice(0, 30);
  const map = new Map<string, string>();
  if (!unique.length) return map;
  return cacheWrap(`dex-images:${unique.slice().sort().join(",")}`, 45_000, async () => {
    const rows = await dexJson<DexPair[] | { pairs?: DexPair[] }>(
      `https://api.dexscreener.com/tokens/v1/solana/${unique.join(",")}`,
    );
    const pairs = Array.isArray(rows) ? rows : (rows?.pairs ?? []);
    for (const pair of pairs) {
      const mint = pair.baseToken?.address;
      const image = pair.info?.imageUrl;
      if (mint && image && !map.has(mint)) map.set(mint, image);
    }
    const missing = unique.filter((mint) => !map.has(mint));
    if (missing.length) {
      const latest = await dexJson<{ pairs?: DexPair[] }>(
        `https://api.dexscreener.com/latest/dex/tokens/${missing.join(",")}`,
      );
      for (const pair of latest?.pairs ?? []) {
        if (pair.chainId && pair.chainId !== "solana") continue;
        const mint = pair.baseToken?.address;
        const image = pair.info?.imageUrl;
        if (mint && image && !map.has(mint)) map.set(mint, image);
      }
    }
    return map;
  });
}

export async function getSolUsd(): Promise<number | null> {
  return cacheWrap("sol-usd", 30_000, async () => {
    const fromProviders = await getSolUsdFromProviders().catch(() => null);
    if (fromProviders != null) return fromProviders;
    const body = await dexJson<{ pairs?: DexPair[] }>(
      "https://api.dexscreener.com/latest/dex/tokens/So11111111111111111111111111111111111111112",
    );
    const pair = (body?.pairs ?? [])
      .filter((row) => row.chainId === "solana")
      .sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];
    const price = pair?.priceUsd ? Number(pair.priceUsd) : null;
    return Number.isFinite(price) ? price : null;
  });
}

export async function getSolUsdString(): Promise<string | null> {
  return cacheWrap("sol-usd-str", 30_000, async () => {
    const body = await dexJson<{ pairs?: DexPair[] }>(
      "https://api.dexscreener.com/latest/dex/tokens/So11111111111111111111111111111111111111112",
    );
    const pair = (body?.pairs ?? [])
      .filter((row) => row.chainId === "solana")
      .sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];
    return usablePriceString(pair?.priceUsd);
  });
}

export async function getTokenMarkUsdString(mint: string): Promise<string | null> {
  return cacheWrap(`mark-usd:${mint}`, 15_000, async () => {
    const layered = await getTokenMarketData(mint).catch(() => null);
    if (layered?.priceUsd != null && Number.isFinite(layered.priceUsd) && layered.priceUsd > 0) {
      const text = String(layered.priceUsd);
      if (usablePriceString(text)) return text;
    }
    const { pairs } = await resolveTokenRef(mint);
    const pair = pickPair(pairs, mint);
    const dex = usablePriceString(pair?.priceUsd);
    if (dex) return dex;
    const gecko = await geckoJson<{
      data?: { attributes?: { price_usd?: string } };
    }>(`https://api.geckoterminal.com/api/v2/networks/solana/tokens/${mint}`);
    return usablePriceString(gecko?.data?.attributes?.price_usd);
  });
}

function usablePriceString(value: string | undefined | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || !/^\d+(\.\d+)?$/.test(trimmed)) return null;
  if (trimmed === "0" || /^0+\.0+$/.test(trimmed)) return null;
  return trimmed;
}

export async function getTokenChart(
  raw: string,
  timeframe: ChartTimeframe = "1D",
  hintPair?: string | null,
): Promise<TokenChart> {
  return loadMintChart(raw, timeframe, hintPair);
}

export async function getTokenCandles(mint: string, timeframe: ChartTimeframe = "1D"): Promise<Candle[]> {
  const chart = await getTokenChart(mint, timeframe);
  return chart.candles;
}

export async function getPoolTrades(raw: string): Promise<PoolTrade[]> {
  return cacheWrap(`pool-trades:${raw}`, 20_000, async () => {
    const { mint, pairs } = await resolveTokenRef(raw);
    const pool = pickPair(pairs, mint)?.pairAddress ?? (await geckoPoolForMint(mint));
    if (!pool) return [];
    const body = await geckoJson<{
      data?: Array<{
        id?: string;
        attributes?: {
          kind?: string;
          volume_in_usd?: string;
          block_timestamp?: string;
          tx_hash?: string;
        };
      }>;
    }>(`https://api.geckoterminal.com/api/v2/networks/solana/pools/${pool}/trades`);
    return (body?.data ?? [])
      .map((row) => {
        const kind = row.attributes?.kind?.toLowerCase();
        if (kind !== "buy" && kind !== "sell") return null;
        const usd = Number(row.attributes?.volume_in_usd ?? 0);
        if (!Number.isFinite(usd) || usd <= 0) return null;
        return {
          id: row.id ?? row.attributes?.tx_hash ?? `${mint}:${row.attributes?.block_timestamp}`,
          side: kind as "buy" | "sell",
          usd,
          at: row.attributes?.block_timestamp ? Date.parse(row.attributes.block_timestamp) : null,
          source: "geckoterminal" as const,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row != null);
  });
}

async function resolveDexPairs(mint: string): Promise<DexPair[]> {
  const [latest, v1] = await Promise.all([
    dexJson<{ pairs?: DexPair[] }>(`https://api.dexscreener.com/latest/dex/tokens/${mint}`),
    dexJson<DexPair[] | { pairs?: DexPair[] }>(`https://api.dexscreener.com/tokens/v1/solana/${mint}`),
  ]);
  const fromLatest = latest?.pairs ?? [];
  const fromV1 = Array.isArray(v1) ? v1 : (v1?.pairs ?? []);
  const pairs = dedupePairs(solanaPairs([...fromLatest, ...fromV1]));
  if (pairs.length) return pairs;

  const asset = isSolanaPubkey(mint) ? await heliusGetAsset(mint).catch(() => null) : null;
  const query = asset?.symbol || asset?.name;
  if (!query) return [];
  const search = await dexJson<{ pairs?: DexPair[] }>(
    `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`,
  );
  const found = solanaPairs(search?.pairs ?? []);
  const exact = found.filter((pair) => pair.baseToken?.address === mint);
  return exact.length ? exact : found;
}

function solanaPairs(pairs: DexPair[]): DexPair[] {
  return pairs.filter((pair) => !pair.chainId || pair.chainId === "solana");
}

function dedupePairs(pairs: DexPair[]): DexPair[] {
  const seen = new Set<string>();
  return pairs.filter((pair) => {
    const key = pair.pairAddress ?? `${pair.baseToken?.address}:${pair.dexId}`;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function rankPairs(pairs: DexPair[], mint: string): DexPair[] {
  return [...pairs]
    .filter((pair) => !pair.baseToken?.address || pair.baseToken.address === mint)
    .sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0));
}

function pickPair(pairs: DexPair[], mint: string): DexPair | null {
  return rankPairs(pairs, mint)[0] ?? null;
}

type GeckoCandle = {
  data?: { attributes?: { ohlcv_list?: Array<[number, number, number, number, number, number]> } };
};

type GeckoPoolList = {
  data?: Array<{
    attributes?: { address?: string; reserve_in_usd?: string };
  }>;
};

function finiteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

async function geckoTokenMeta(mint: string): Promise<{ imageUrl: string | null; marketCap: number | null } | null> {
  const body = await geckoJson<{
    data?: { attributes?: { image_url?: string; market_cap_usd?: string } };
  }>(`https://api.geckoterminal.com/api/v2/networks/solana/tokens/${mint}`);
  const attrs = body?.data?.attributes;
  if (!attrs) return null;
  return {
    imageUrl: attrs.image_url ?? null,
    marketCap: finiteNumber(attrs.market_cap_usd),
  };
}

export function mapGmgnKlineRows(raw: unknown): Candle[] {
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { data?: unknown }).data)
      ? ((raw as { data: unknown[] }).data)
      : ((raw as { data?: { list?: unknown[] } })?.data?.list ?? []);
  return list
    .map((row) => {
      const item = row as {
        time?: number | string;
        t?: number | string;
        open?: number | string;
        high?: number | string;
        low?: number | string;
        close?: number | string;
        o?: number | string;
        h?: number | string;
        l?: number | string;
        c?: number | string;
      };
      const time = Number(item.time ?? item.t ?? 0);
      return {
        time: time > 1e12 ? Math.floor(time / 1000) : time,
        open: Number(item.open ?? item.o),
        high: Number(item.high ?? item.h),
        low: Number(item.low ?? item.l),
        close: Number(item.close ?? item.c),
      };
    })
    .filter((row) => Number.isFinite(row.close) && Number.isFinite(row.time) && row.time > 0)
    .sort((a, b) => a.time - b.time);
}

async function geckoPoolForMint(mint: string): Promise<string | null> {
  const body = await geckoJson<GeckoPoolList>(
    `https://api.geckoterminal.com/api/v2/networks/solana/tokens/${mint}/pools`,
  );
  const ranked = [...(body?.data ?? [])].sort(
    (a, b) => Number(b.attributes?.reserve_in_usd ?? 0) - Number(a.attributes?.reserve_in_usd ?? 0),
  );
  return ranked[0]?.attributes?.address ?? null;
}

export function mapGeckoCandles(body: GeckoCandle | null): Candle[] {
  return mapGeckoOhlcvBody(body);
}

export async function getSolanaTrendingSnapshot(): Promise<{
  entries: FomoScanBoardEntry[];
  source: DiscoverSource;
}> {
  return cacheWrapIf(
    "dex-trending-board:v5",
    PROVIDER_TTL_MS.trending,
    async () => {
      const coins = await loadLiveCoinBook(48).catch(() => []);
      if (coins.length) {
        return { entries: coinRowsToBoard(coins), source: "market" as const };
      }
    const gecko = await geckoJson<{
      data?: Array<{
        attributes?: {
          address?: string;
          name?: string;
          base_token_price_usd?: string;
          market_cap_usd?: string;
          reserve_in_usd?: string;
          volume_usd?: { h24?: string };
          price_change_percentage?: { h24?: string };
        };
        relationships?: { base_token?: { data?: { id?: string } } };
      }>;
    }>("https://api.geckoterminal.com/api/v2/networks/solana/trending_pools");
    const fromGecko: FomoScanBoardEntry[] = [];
    (gecko?.data ?? []).forEach((pool, index) => {
      const tokenId = pool.relationships?.base_token?.data?.id ?? "";
      const mint = tokenId.includes("_") ? tokenId.split("_").pop() ?? "" : tokenId;
      if (!mint) return;
      const price = Number(pool.attributes?.base_token_price_usd ?? NaN);
      const symbol = pool.attributes?.name?.split(" / ")[0] ?? pool.attributes?.name ?? null;
      fromGecko.push({
        rank: index + 1,
        id: mint,
        handle: symbol,
        label: symbol,
        avatarUrl: null,
        pnl: Number(pool.attributes?.price_change_percentage?.h24 ?? NaN) || null,
        volume: Number(pool.attributes?.volume_usd?.h24 ?? NaN) || null,
        followers: null,
        numTrades: null,
        memberCount: null,
        marketCap: Number(pool.attributes?.market_cap_usd ?? NaN) || null,
        price: Number.isFinite(price) ? price : null,
        liquidity: Number(pool.attributes?.reserve_in_usd ?? NaN) || null,
      });
    });
    if (fromGecko.length) {
      return { entries: await decorateTokenImages(fromGecko), source: "geckoterminal" };
    }
    const providers = await getProviderTrendingBoard().catch(() => ({ entries: [], source: "market" as const }));
    if (providers.entries.length) {
      return { entries: await decorateTokenImages(providers.entries), source: providers.source };
    }
    const boosts = await dexBoostBoard();
    if (boosts.length) return { entries: await decorateTokenImages(boosts), source: "dexscreener" };
    return { entries: await decorateTokenImages(await liquidMintBoard()), source: "dexscreener" };
  },
    (row) => row.entries.length > 0,
  );
}

export async function getSolanaTrendingBoard(): Promise<FomoScanBoardEntry[]> {
  return (await getSolanaTrendingSnapshot()).entries;
}

async function dexBoostBoard(): Promise<FomoScanBoardEntry[]> {
  const body = await dexJson<Array<{ chainId?: string; tokenAddress?: string }>>(
    "https://api.dexscreener.com/token-boosts/top/v1",
  );
  const mints = [...new Set(
    (body ?? [])
      .filter((row) => row.chainId === "solana" && row.tokenAddress)
      .map((row) => row.tokenAddress as string),
  )].slice(0, 12);
  const markets = await Promise.all(mints.map((mint) => getTokenMarket(mint).catch(() => null)));
  return marketsToBoard(markets.filter((row): row is TokenMarket => Boolean(row?.mint)));
}

async function liquidMintBoard(): Promise<FomoScanBoardEntry[]> {
  const markets = await Promise.all(LIQUID_MINTS.map((mint) => getTokenMarket(mint).catch(() => null)));
  return marketsToBoard(markets.filter((row): row is TokenMarket => Boolean(row?.mint && (row.priceUsd != null || row.pairAddress))));
}

function marketsToBoard(markets: TokenMarket[]): FomoScanBoardEntry[] {
  return markets.map((market, index) => ({
    rank: index + 1,
    id: market.mint,
    handle: market.symbol,
    label: market.name ?? market.symbol,
    avatarUrl: market.imageUrl,
    pnl: market.priceChange24h,
    volume: market.volume24h,
    followers: null,
    numTrades: (market.buys24h ?? 0) + (market.sells24h ?? 0) || null,
    memberCount: null,
    marketCap: market.marketCap,
    price: market.priceUsd,
    liquidity: market.liquidityUsd,
  }));
}

export async function searchDexTokens(query: string, limit = 8): Promise<TokenMarket[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  return cacheWrap(`dex-search:${q.toLowerCase()}:${limit}`, 12_000, async () => {
    const search = await dexJson<{ pairs?: DexPair[] }>(
      `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(q)}`,
    );
    const ranked = solanaPairs(search?.pairs ?? [])
      .filter((pair) => pair.baseToken?.address)
      .sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0));
    const seen = new Set<string>();
    const markets: TokenMarket[] = [];
    for (const pair of ranked) {
      const mint = pair.baseToken?.address;
      if (!mint || seen.has(mint)) continue;
      seen.add(mint);
      const buys = pair.txns?.h24?.buys ?? 0;
      const sells = pair.txns?.h24?.sells ?? 0;
      const volume = pair.volume?.h24 ?? 0;
      const totalTx = buys + sells;
      markets.push({
        mint,
        symbol: pair.baseToken?.symbol ?? null,
        name: pair.baseToken?.name ?? null,
        imageUrl: pair.info?.imageUrl ?? null,
        priceUsd: pair.priceUsd ? Number(pair.priceUsd) : null,
        priceChange24h: pair.priceChange?.h24 ?? null,
        volume24h: pair.volume?.h24 ?? null,
        liquidityUsd: pair.liquidity?.usd ?? null,
        marketCap: pair.marketCap ?? pair.fdv ?? null,
        fdv: pair.fdv ?? pair.marketCap ?? null,
        pairAddress: pair.pairAddress ?? null,
        dexId: pair.dexId ?? null,
        decimals: null,
        buys24h: pair.txns?.h24?.buys ?? null,
        sells24h: pair.txns?.h24?.sells ?? null,
        buyVolume24h: totalTx ? volume * (buys / totalTx) : null,
        sellVolume24h: totalTx ? volume * (sells / totalTx) : null,
      });
      if (markets.length >= limit) break;
    }
    return markets;
  });
}

async function decorateTokenImages(entries: FomoScanBoardEntry[]): Promise<FomoScanBoardEntry[]> {
  const images = await getDexTokenImages(entries.map((entry) => entry.id));
  return entries.map((entry) => ({
    ...entry,
    avatarUrl: pickImageUrl(entry.avatarUrl, images.get(entry.id) ?? null),
  }));
}

async function dexJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json", "User-Agent": "MuseFOMO/1.0 (+https://musefomo.family)" },
      signal: AbortSignal.timeout(PUBLIC_GET_MS),
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function geckoJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      headers: GECKO_HEADERS,
      cache: "no-store",
      signal: AbortSignal.timeout(PUBLIC_GET_MS),
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}
