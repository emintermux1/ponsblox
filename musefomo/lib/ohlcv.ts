import { cacheWrap, cacheWrapIf } from "@/lib/cache";
import { normalizeChartBars } from "@/lib/chart-bars";
import { SOL_MINT } from "@/lib/constants";
import { publicJson, raceTimeout } from "@/lib/fast-fetch";
import { looksLikeEvm } from "@/lib/format";
import { isPinnedCa, MUSE_FOMO_PAIR } from "@/lib/pinned-tokens";
import { assertNever } from "@/lib/never";
import type { Candle, CandleSource, ChartTimeframe, TokenChart } from "@/lib/types";

export const OHLCV_TTL_MS = 30_000;
export const PAIR_TTL_MS = 30_000;
export const CHART_BUDGET_MS = 2_000;
export const CHART_BAR_LIMIT = 96;

/** Verified Gecko/Dex SOL/USDC pools — real addresses, never used to invent bars. */
const SOL_CHART_POOLS = [
  "Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE",
  "58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2",
] as const;

export const PUBLIC_OHLCV_HEADERS = {
  Accept: "application/json",
  "User-Agent": "MuseFOMO/1.0 (+https://musefomo.family)",
} as const;

export type ChartPairHit = {
  pairAddress: string;
  pairSource: "dexscreener" | "geckoterminal" | "gmgn" | "pump";
  liquidity: number;
  symbol: string | null;
  name: string | null;
  imageUrl: string | null;
  priceUsd: number | null;
  priceChange24h: number | null;
  volume24h: number | null;
  marketCap: number | null;
  fdv: number | null;
  dexId: string | null;
  buys24h: number | null;
  sells24h: number | null;
};

type DexLike = {
  chainId?: string;
  dexId?: string;
  pairAddress?: string;
  baseToken?: { address?: string; symbol?: string; name?: string };
  priceUsd?: string;
  priceChange?: { h24?: number };
  volume?: { h24?: number };
  liquidity?: { usd?: number };
  fdv?: number;
  marketCap?: number;
  txns?: { h24?: { buys?: number; sells?: number } };
  info?: { imageUrl?: string };
};

type GeckoPoolList = {
  data?: Array<{
    attributes?: {
      address?: string;
      name?: string;
      reserve_in_usd?: string;
      base_token_price_usd?: string;
      market_cap_usd?: string;
      volume_usd?: { h24?: string };
      price_change_percentage?: { h24?: string };
    };
    relationships?: { base_token?: { data?: { id?: string } } };
  }>;
};

export type ChartWindow = {
  path: "minute" | "hour" | "day";
  aggregate: number;
  limit: number;
  lookbackSec: number;
  birdeyeType: "1m" | "5m" | "15m" | "1H" | "4H" | "1D";
  dexInterval: "1m" | "5m" | "15m" | "1h" | "24h";
};

export function chartWindow(timeframe: ChartTimeframe): ChartWindow {
  switch (timeframe) {
    case "1H":
      return { path: "minute", aggregate: 1, limit: 60, lookbackSec: 60 * 60, birdeyeType: "1m", dexInterval: "1m" };
    case "4H":
      return { path: "minute", aggregate: 5, limit: 48, lookbackSec: 4 * 60 * 60, birdeyeType: "5m", dexInterval: "5m" };
    case "1D":
      return { path: "minute", aggregate: 15, limit: 96, lookbackSec: 24 * 60 * 60, birdeyeType: "15m", dexInterval: "15m" };
    case "7D":
      return { path: "hour", aggregate: 4, limit: 42, lookbackSec: 7 * 24 * 60 * 60, birdeyeType: "4H", dexInterval: "1h" };
    case "1M":
      return { path: "day", aggregate: 1, limit: 30, lookbackSec: 30 * 24 * 60 * 60, birdeyeType: "1D", dexInterval: "24h" };
    default:
      return assertNever(timeframe, "timeframe");
  }
}

export function geckoOhlcvUrls(pairAddress: string, timeframe: ChartTimeframe): string[] {
  const window = chartWindow(timeframe);
  const network = looksLikeEvm(pairAddress) ? "robinhood" : "solana";
  const qs = `ohlcv/${window.path}?aggregate=${window.aggregate}&limit=${window.limit}&currency=usd`;
  return [
    `https://api.geckoterminal.com/api/v2/networks/${network}/pools/${pairAddress}/${qs}`,
    `https://api.coingecko.com/api/v3/onchain/networks/${network}/pools/${pairAddress}/${qs}`,
  ];
}

export function mapGeckoOhlcvBody(body: unknown): Candle[] {
  const rows =
    (body as { data?: { attributes?: { ohlcv_list?: unknown[] } } })?.data?.attributes?.ohlcv_list ?? [];
  return normalizeChartBars(rows);
}

export function mapDexPaprikaOhlcv(body: unknown): Candle[] {
  const rows = Array.isArray(body)
    ? body
    : Array.isArray((body as { data?: unknown }).data)
      ? ((body as { data: unknown[] }).data)
      : [];
  return normalizeChartBars(rows);
}

export function mapBirdeyeOhlcv(body: unknown): Candle[] {
  const root = body as { data?: { items?: unknown[] } | unknown[] };
  const rows = Array.isArray(root?.data)
    ? root.data
    : Array.isArray((root?.data as { items?: unknown[] })?.items)
      ? ((root.data as { items: unknown[] }).items)
      : [];
  return normalizeChartBars(rows);
}

export function clipCandles(candles: Candle[], timeframe: ChartTimeframe): Candle[] {
  const cleaned = normalizeChartBars(candles);
  if (!cleaned.length) return [];
  const window = chartWindow(timeframe);
  const end = cleaned[cleaned.length - 1].time;
  const start = end - window.lookbackSec;
  return cleaned.filter((row) => row.time >= start).slice(-Math.min(window.limit, CHART_BAR_LIMIT));
}

export function cleanChartRef(raw: string): string {
  try {
    return decodeURIComponent(raw).trim();
  } catch {
    return raw.trim();
  }
}

/** Known pool addresses we can candle immediately — never wait on pair discovery for these. */
export function earlyChartPairs(mint: string, hint?: string | null): string[] {
  const out: string[] = [];
  const trimmed = hint?.trim();
  if (trimmed) out.push(trimmed);
  if (mint === SOL_MINT) out.push(...SOL_CHART_POOLS);
  if (isPinnedCa(mint)) out.push(MUSE_FOMO_PAIR);
  return [...new Set(out)];
}

function emptyPair(pairAddress: string, pairSource: ChartPairHit["pairSource"], liquidity: number): ChartPairHit {
  return {
    pairAddress,
    pairSource,
    liquidity,
    symbol: null,
    name: null,
    imageUrl: null,
    priceUsd: null,
    priceChange24h: null,
    volume24h: null,
    marketCap: null,
    fdv: null,
    dexId: null,
    buys24h: null,
    sells24h: null,
  };
}

function dedupePairs(pairs: ChartPairHit[]): ChartPairHit[] {
  const seen = new Set<string>();
  return pairs.filter((pair) => {
    if (!pair.pairAddress || seen.has(pair.pairAddress)) return false;
    seen.add(pair.pairAddress);
    return true;
  });
}

function mintFromGeckoId(id: string | undefined): string {
  if (!id) return "";
  return id.includes("_") ? (id.split("_").pop() ?? "") : id;
}

function firstHit<T>(
  jobs: Array<Promise<T>>,
  ok: (value: T) => boolean,
  empty: T,
  ms: number,
): Promise<T> {
  return new Promise((resolve) => {
    let left = jobs.length;
    let done = false;
    const settle = (value: T) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => settle(empty), ms);
    if (!jobs.length) {
      settle(empty);
      return;
    }
    for (const job of jobs) {
      void job.then(
        (value) => {
          if (ok(value)) settle(value);
          else if (--left <= 0) settle(empty);
        },
        () => {
          if (--left <= 0) settle(empty);
        },
      );
    }
  });
}

function mapDexRows(rows: DexLike[], mint: string): ChartPairHit[] {
  return rows
    .filter((pair) => (!pair.chainId || pair.chainId === "solana") && pair.pairAddress)
    .filter((pair) => !pair.baseToken?.address || pair.baseToken.address === mint)
    .map((pair) => ({
      pairAddress: pair.pairAddress as string,
      pairSource: "dexscreener" as const,
      liquidity: Number(pair.liquidity?.usd ?? 0) || 0,
      symbol: pair.baseToken?.symbol ?? null,
      name: pair.baseToken?.name ?? null,
      imageUrl: pair.info?.imageUrl ?? null,
      priceUsd: pair.priceUsd ? Number(pair.priceUsd) : null,
      priceChange24h: pair.priceChange?.h24 ?? null,
      volume24h: pair.volume?.h24 ?? null,
      marketCap: pair.marketCap ?? null,
      fdv: pair.fdv ?? null,
      dexId: pair.dexId ?? null,
      buys24h: pair.txns?.h24?.buys ?? null,
      sells24h: pair.txns?.h24?.sells ?? null,
    }));
}

async function dexPairsForMint(mint: string): Promise<ChartPairHit[]> {
  const latestP = publicJson<{ pairs?: DexLike[] }>(
    `https://api.dexscreener.com/latest/dex/tokens/${mint}`,
    CHART_BUDGET_MS,
  ).then((body) => mapDexRows(body?.pairs ?? [], mint));
  const v1P = publicJson<DexLike[] | { pairs?: DexLike[] }>(
    `https://api.dexscreener.com/tokens/v1/solana/${mint}`,
    CHART_BUDGET_MS,
  ).then((body) => mapDexRows(Array.isArray(body) ? body : (body?.pairs ?? []), mint));
  return firstHit([latestP, v1P], (rows) => rows.length > 0, [], CHART_BUDGET_MS);
}

async function geckoPoolsForMint(mint: string): Promise<ChartPairHit[]> {
  const network = looksLikeEvm(mint) ? "robinhood" : "solana";
  const body = await publicJson<GeckoPoolList>(
    `https://api.geckoterminal.com/api/v2/networks/${network}/tokens/${mint}/pools`,
    CHART_BUDGET_MS,
  );
  const hits: ChartPairHit[] = [];
  for (const pool of body?.data ?? []) {
    const baseMint = mintFromGeckoId(pool.relationships?.base_token?.data?.id);
    if (baseMint && baseMint !== mint) continue;
    const address = pool.attributes?.address;
    if (!address) continue;
    hits.push({
      pairAddress: address,
      pairSource: "geckoterminal",
      liquidity: Number(pool.attributes?.reserve_in_usd ?? 0) || 0,
      symbol: pool.attributes?.name?.split(" / ")[0] ?? null,
      name: pool.attributes?.name ?? null,
      imageUrl: null,
      priceUsd: Number(pool.attributes?.base_token_price_usd ?? NaN) || null,
      priceChange24h: Number(pool.attributes?.price_change_percentage?.h24 ?? NaN) || null,
      volume24h: Number(pool.attributes?.volume_usd?.h24 ?? NaN) || null,
      marketCap: Number(pool.attributes?.market_cap_usd ?? NaN) || null,
      fdv: null,
      dexId: null,
      buys24h: null,
      sells24h: null,
    });
  }
  return hits;
}

export async function resolveChartPair(
  raw: string,
  hintPair?: string | null,
): Promise<{ mint: string; pair: ChartPairHit | null; candidates: ChartPairHit[] }> {
  const mint = cleanChartRef(raw);
  const hint = hintPair?.trim() || null;
  return cacheWrap(`chart-pair:v2:${mint}:${hint ?? ""}`, PAIR_TTL_MS, async () => {
    const hinted = hint ? [emptyPair(hint, "geckoterminal", 0)] : [];
    const solExtra =
      mint === SOL_MINT
        ? SOL_CHART_POOLS.map((pairAddress) => emptyPair(pairAddress, "geckoterminal", 0))
        : [];
    const live = await firstHit(
      looksLikeEvm(mint) ? [geckoPoolsForMint(mint)] : [dexPairsForMint(mint), geckoPoolsForMint(mint)],
      (rows) => rows.length > 0,
      [] as ChartPairHit[],
      CHART_BUDGET_MS,
    );
    const candidates = dedupePairs([...live, ...hinted, ...solExtra]).sort(
      (a, b) => b.liquidity - a.liquidity,
    );
    return { mint, pair: candidates[0] ?? null, candidates };
  });
}

function emptyBars(): { candles: Candle[]; candleSource: CandleSource | null } {
  return { candles: [], candleSource: null };
}

async function geckoPairBars(
  pairAddress: string,
  timeframe: ChartTimeframe,
): Promise<{ candles: Candle[]; candleSource: CandleSource | null }> {
  const urls = geckoOhlcvUrls(pairAddress, timeframe);
  return firstHit(
    urls.map(async (url) => ({
      candles: clipCandles(mapGeckoOhlcvBody(await publicJson(url, CHART_BUDGET_MS)), timeframe),
      candleSource: (url.includes("geckoterminal") ? "geckoterminal" : "coingecko") as CandleSource,
    })),
    (row) => row.candles.length > 0,
    emptyBars(),
    CHART_BUDGET_MS,
  );
}

async function dexPaprikaPairBars(
  pairAddress: string,
  timeframe: ChartTimeframe,
): Promise<{ candles: Candle[]; candleSource: CandleSource | null }> {
  const window = chartWindow(timeframe);
  const start = new Date(Date.now() - window.lookbackSec * 1000).toISOString();
  const url = `https://api.dexpaprika.com/networks/solana/pools/${pairAddress}/ohlcv?start=${encodeURIComponent(start)}&interval=${window.dexInterval}&limit=${window.limit}`;
  const candles = clipCandles(mapDexPaprikaOhlcv(await publicJson(url, CHART_BUDGET_MS)), timeframe);
  return { candles, candleSource: candles.length ? "dexpaprika" : null };
}

async function birdeyeMintBars(
  mint: string,
  timeframe: ChartTimeframe,
): Promise<{ candles: Candle[]; candleSource: CandleSource | null }> {
  const key = process.env.BIRDEYE_API_KEY?.trim();
  if (!key) return emptyBars();
  const window = chartWindow(timeframe);
  const to = Math.floor(Date.now() / 1000);
  const from = to - window.lookbackSec;
  const url = `https://public-api.birdeye.so/defi/ohlcv?address=${encodeURIComponent(mint)}&type=${window.birdeyeType}&time_from=${from}&time_to=${to}`;
  try {
    const response = await fetch(url, {
      headers: { ...PUBLIC_OHLCV_HEADERS, "X-API-KEY": key, "x-chain": "solana" },
      cache: "no-store",
      signal: AbortSignal.timeout(CHART_BUDGET_MS),
    });
    if (!response.ok) return emptyBars();
    const candles = clipCandles(mapBirdeyeOhlcv(await response.json()), timeframe);
    return { candles, candleSource: candles.length ? "birdeye" : null };
  } catch {
    return emptyBars();
  }
}

export async function fetchPairCandles(
  pairAddress: string,
  timeframe: ChartTimeframe,
): Promise<{ candles: Candle[]; candleSource: CandleSource | null }> {
  return cacheWrapIf(
    `ohlcv:pair:v3:${pairAddress}:${timeframe}`,
    OHLCV_TTL_MS,
    () =>
      firstHit(
        looksLikeEvm(pairAddress)
          ? [geckoPairBars(pairAddress, timeframe)]
          : [geckoPairBars(pairAddress, timeframe), dexPaprikaPairBars(pairAddress, timeframe)],
        (row) => row.candles.length > 0,
        emptyBars(),
        CHART_BUDGET_MS,
      ),
    (row) => row.candles.length > 0,
  );
}

export function emptyTokenChart(
  timeframe: ChartTimeframe,
  pairAddress: string | null,
  reason: string,
  pairSource: TokenChart["pairSource"] = pairAddress ? "geckoterminal" : null,
): TokenChart {
  return {
    candles: [],
    pairSource,
    candleSource: null,
    reason,
    pairAddress,
    timeframe,
  };
}

export async function loadMintChart(
  raw: string,
  timeframe: ChartTimeframe = "1D",
  hintPair?: string | null,
): Promise<TokenChart> {
  const mint = cleanChartRef(raw);
  const hint = hintPair?.trim() || null;
  return cacheWrapIf(
    `mint-chart:v3:${mint}:${timeframe}:${hint ?? ""}`,
    OHLCV_TTL_MS,
    () => loadMintChartUncached(mint, timeframe, hint),
    (chart) => chart.candles.length > 0,
  );
}

function asChart(
  timeframe: ChartTimeframe,
  pairAddress: string | null,
  pairSource: TokenChart["pairSource"],
  bars: { candles: Candle[]; candleSource: CandleSource | null },
): TokenChart {
  if (!bars.candles.length) {
    return emptyTokenChart(
      timeframe,
      pairAddress,
      pairAddress ? "A pair exists, but candles did not return for this window." : "No market pair for this token.",
      pairSource,
    );
  }
  return {
    candles: bars.candles,
    pairSource,
    candleSource: bars.candleSource,
    reason: null,
    pairAddress,
    timeframe,
  };
}

async function loadMintChartUncached(
  mint: string,
  timeframe: ChartTimeframe,
  hint: string | null,
): Promise<TokenChart> {
  const known = earlyChartPairs(mint, hint);
  const miss = emptyTokenChart(timeframe, known[0] ?? hint, "No public candles for this window.");

  const fromKnown = known.map(async (pairAddress) =>
    asChart(timeframe, pairAddress, "geckoterminal", await fetchPairCandles(pairAddress, timeframe)),
  );
  const fromBird = birdeyeMintBars(mint, timeframe).then((bars) =>
    asChart(timeframe, known[0] ?? null, known[0] ? "geckoterminal" : null, bars),
  );
  const fromResolved = (async () => {
    const resolved = await raceTimeout(
      resolveChartPair(mint, hint),
      { mint, pair: null, candidates: [] as ChartPairHit[] },
      CHART_BUDGET_MS,
    );
    const rest = resolved.candidates.filter((pair) => !known.includes(pair.pairAddress)).slice(0, 2);
    if (!rest.length) {
      return emptyTokenChart(
        timeframe,
        resolved.pair?.pairAddress ?? known[0] ?? null,
        resolved.candidates.length
          ? "A pair exists, but candles did not return for this window."
          : "No market pair for this token.",
        resolved.pair?.pairSource ?? (known[0] ? "geckoterminal" : null),
      );
    }
    return firstHit(
      rest.map(async (pair) => asChart(timeframe, pair.pairAddress, pair.pairSource, await fetchPairCandles(pair.pairAddress, timeframe))),
      (row) => row.candles.length > 0,
      emptyTokenChart(
        timeframe,
        rest[0]?.pairAddress ?? null,
        "A pair exists, but candles did not return for this window.",
        rest[0]?.pairSource ?? null,
      ),
      CHART_BUDGET_MS,
    );
  })();

  return firstHit(
    [...fromKnown, fromBird, fromResolved],
    (row) => row.candles.length > 0,
    miss,
    CHART_BUDGET_MS,
  );
}
