import "server-only";

import {
  asHttpsLogo,
  candlesFromOhlcvList,
  finiteUsd,
  isPaidTicker,
  isQuoteTicker,
  looksLikeMint,
  mergeMarketPulse,
  mintFromGeckoTokenId,
  poolFromGeckoRow,
  providerStatusFromHttp,
  quietMarketPulse,
  quietProviders,
  tickerFromName,
  tickerFromSymbol,
  type HeliusConfirm,
  type MarketHit,
  type MarketHits,
  type MarketPulse,
  type ProviderStatus,
  type SolanaConfirm,
  type TapeCandle,
} from "@/lib/adapters/parse";
import { assertSource, honestyFromLabel } from "@/lib/adapters/source";

export type { MarketPulse };
export const MARKET_LIVE_TTL_MS = 12_000;
export const MARKET_BUDGET_MS = 3_000;
export const MARKET_FETCH_MS = 1_800;
export const SOL_MINT = "So11111111111111111111111111111111111111112";

const UA = {
  Accept: "application/json",
  "User-Agent": "MuseWorld/1.0 (+https://musegrok.world)",
};
const STALE_LIVE_MS = 60_000;
const TAPE_LIMIT = 8;

type GeckoPool = {
  id?: string;
  attributes?: {
    name?: string;
    address?: string;
    base_token_price_usd?: string;
    market_cap_usd?: string;
    reserve_in_usd?: string;
    volume_usd?: { h1?: string; h24?: string };
    price_change_percentage?: { h24?: string };
  };
  relationships?: {
    base_token?: { data?: { id?: string } };
  };
};

type GeckoIncluded = {
  id?: string;
  attributes?: { address?: string; symbol?: string; name?: string; image_url?: string };
};

type DexBoost = { chainId?: string; tokenAddress?: string };

type DexPair = {
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
  info?: { imageUrl?: string };
};

type ReadResult =
  | { status: "ok"; body: unknown }
  | { status: "skip" }
  | { status: "error" };

let lastPulse: MarketPulse = quietMarketPulse(quietProviders());
let lastAt = 0;
let lastLiveAt = 0;

export function resetMarketPulseForTests(): void {
  lastPulse = quietMarketPulse(quietProviders());
  lastAt = 0;
  lastLiveAt = 0;
}

function stampPulse(pulse: MarketPulse): MarketPulse {
  assertSource(honestyFromLabel(pulse.source));
  return { ...pulse, fills: [], candles: pulse.candles ?? [] };
}

async function raceTimeout<T>(work: Promise<T>, fallback: T, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work.catch(() => fallback),
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), ms);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

async function readProvider(
  url: string,
  headers: Record<string, string>,
  timeoutMs: number,
): Promise<ReadResult> {
  try {
    const response = await fetch(url, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    const mapped = providerStatusFromHttp(response.status);
    if (mapped === "skip") {
      return { status: "skip" };
    }
    if (mapped === "error" || !response.ok) {
      return { status: "error" };
    }
    return { status: "ok", body: await response.json() };
  } catch {
    return { status: "error" };
  }
}

async function postRpc(url: string, payload: Record<string, unknown>): Promise<ReadResult> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { ...UA, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(MARKET_FETCH_MS),
    });
    const mapped = providerStatusFromHttp(response.status);
    if (mapped === "skip") {
      return { status: "skip" };
    }
    if (mapped === "error" || !response.ok) {
      return { status: "error" };
    }
    return { status: "ok", body: await response.json() };
  } catch {
    return { status: "error" };
  }
}

function asHits(result: ReadResult, hits: MarketHit[]): MarketHits {
  if (result.status !== "ok") {
    return result.status;
  }
  return hits.length > 0 ? hits.slice(0, TAPE_LIMIT) : "error";
}

function skipPaidHit(hit: MarketHit): MarketHit | null {
  if (isPaidTicker(hit.ticker) || isQuoteTicker(hit.ticker)) {
    return null;
  }
  return hit;
}

function peekGeckoHits(body: unknown): MarketHit[] {
  const root = body as { data?: GeckoPool[]; included?: GeckoIncluded[] };
  const looks = new Map<string, GeckoIncluded["attributes"]>();
  for (const item of root.included ?? []) {
    if (item.id) {
      looks.set(item.id, item.attributes);
    }
    if (item.attributes?.address) {
      looks.set(item.attributes.address, item.attributes);
    }
  }
  const hits: MarketHit[] = [];
  for (const row of root.data ?? []) {
    const tokenId = row.relationships?.base_token?.data?.id;
    const look = tokenId ? looks.get(tokenId) : undefined;
    const mint = look?.address ?? mintFromGeckoTokenId(tokenId);
    const ticker = tickerFromSymbol(look?.symbol) ?? tickerFromName(row.attributes?.name);
    if (isPaidTicker(ticker) || isPaidTicker(row.attributes?.name?.split("/")[0])) {
      continue;
    }
    const volume =
      finiteUsd(row.attributes?.volume_usd?.h1) ?? finiteUsd(row.attributes?.volume_usd?.h24) ?? 0;
    const changePct = finiteUsd(row.attributes?.price_change_percentage?.h24);
    const pool = poolFromGeckoRow(row.id, row.attributes?.address);
    const hit = skipPaidHit({
      source: "gecko",
      ticker,
      mint,
      volumeUsd: volume,
      name: look?.name ?? ticker,
      priceUsd: finiteUsd(row.attributes?.base_token_price_usd),
      priceChange24h: changePct,
      changePct,
      liquidityUsd: finiteUsd(row.attributes?.reserve_in_usd),
      marketCap: finiteUsd(row.attributes?.market_cap_usd),
      imageUrl: asHttpsLogo(look?.image_url),
      pairAddress: pool,
      pool,
    });
    if (hit) {
      hits.push(hit);
    }
  }
  return hits;
}

async function peekGecko(): Promise<MarketHits> {
  const result = await readProvider(
    "https://api.geckoterminal.com/api/v2/networks/solana/trending_pools?page=1&include=base_token",
    UA,
    MARKET_FETCH_MS,
  );
  if (result.status !== "ok") {
    return result.status;
  }
  return asHits(result, peekGeckoHits(result.body));
}

function solanaBoostMints(body: unknown): string[] {
  const rows = Array.isArray(body) ? body : [];
  const mints: string[] = [];
  const seen = new Set<string>();
  for (const row of rows as DexBoost[]) {
    if (row.chainId && row.chainId !== "solana") {
      continue;
    }
    const mint = row.tokenAddress;
    if (!looksLikeMint(mint) || !mint || seen.has(mint)) {
      continue;
    }
    seen.add(mint);
    mints.push(mint);
  }
  return mints;
}

function dexPairsOf(body: unknown): DexPair[] {
  const rows = Array.isArray(body) ? body : (body as { pairs?: DexPair[] } | null)?.pairs;
  return (rows ?? []).filter((pair) => !pair.chainId || pair.chainId === "solana");
}

function hitFromDexPair(pair: DexPair): MarketHit | null {
  const mint = pair.baseToken?.address ?? null;
  const ticker = tickerFromSymbol(pair.baseToken?.symbol);
  if (isPaidTicker(ticker) || isPaidTicker(pair.baseToken?.symbol) || isQuoteTicker(ticker)) {
    return null;
  }
  const changePct =
    typeof pair.priceChange?.h24 === "number" && Number.isFinite(pair.priceChange.h24)
      ? pair.priceChange.h24
      : null;
  return skipPaidHit({
    source: "dexscreener",
    ticker,
    mint,
    volumeUsd: finiteUsd(pair.volume?.h24) ?? 0,
    name: pair.baseToken?.name ?? ticker,
    priceUsd: finiteUsd(pair.priceUsd),
    priceChange24h: changePct,
    changePct,
    liquidityUsd: finiteUsd(pair.liquidity?.usd),
    marketCap: finiteUsd(pair.marketCap) ?? finiteUsd(pair.fdv),
    imageUrl: asHttpsLogo(pair.info?.imageUrl),
    pairAddress: pair.pairAddress ?? null,
    pool: pair.pairAddress ?? null,
    dexId: pair.dexId ?? null,
  });
}

async function peekDexBoosts(): Promise<{ status: ProviderStatus; mints: string[]; hits: MarketHit[] }> {
  const [boosts, profiles, latest] = await Promise.all([
    readProvider("https://api.dexscreener.com/token-boosts/top/v1", UA, MARKET_FETCH_MS),
    readProvider("https://api.dexscreener.com/token-profiles/latest/v1", UA, MARKET_FETCH_MS),
    readProvider("https://api.dexscreener.com/token-boosts/latest/v1", UA, MARKET_FETCH_MS),
  ]);
  if (boosts.status === "skip" && profiles.status === "skip" && latest.status === "skip") {
    return { status: "skip", mints: [], hits: [] };
  }
  if (boosts.status !== "ok" && profiles.status !== "ok" && latest.status !== "ok") {
    return { status: "error", mints: [], hits: [] };
  }
  const mints = [
    ...solanaBoostMints(boosts.status === "ok" ? boosts.body : []),
    ...solanaBoostMints(profiles.status === "ok" ? profiles.body : []),
    ...solanaBoostMints(latest.status === "ok" ? latest.body : []),
  ].filter((mint, index, all) => all.indexOf(mint) === index);
  const hits = mints.slice(0, TAPE_LIMIT).flatMap((mint) => {
    const hit = skipPaidHit({
      source: "dexscreener",
      ticker: null,
      mint,
      volumeUsd: 0,
    });
    return hit ? [hit] : [];
  });
  return { status: hits.length || mints.length ? "ok" : "error", mints, hits };
}

async function peekDexPairs(mints: string[]): Promise<MarketHits> {
  const unique = [...new Set(mints.filter((mint) => looksLikeMint(mint)))].slice(0, TAPE_LIMIT);
  if (!unique.length) {
    return "error";
  }
  const result = await readProvider(
    `https://api.dexscreener.com/tokens/v1/solana/${unique.join(",")}`,
    UA,
    MARKET_FETCH_MS,
  );
  if (result.status !== "ok") {
    return result.status;
  }
  const ranked = dexPairsOf(result.body)
    .map(hitFromDexPair)
    .filter((hit): hit is MarketHit => Boolean(hit))
    .sort((a, b) => (b.liquidityUsd ?? 0) - (a.liquidityUsd ?? 0));
  const seen = new Set<string>();
  const hits: MarketHit[] = [];
  for (const hit of ranked) {
    const key = hit.mint ?? hit.ticker;
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    hits.push(hit);
  }
  return hits.length ? hits : "error";
}

async function peekDexSearchPairs(): Promise<MarketHits> {
  const result = await readProvider(
    "https://api.dexscreener.com/latest/dex/search?q=SOL",
    UA,
    MARKET_FETCH_MS,
  );
  if (result.status !== "ok") {
    return result.status;
  }
  const ranked = dexPairsOf(result.body)
    .map(hitFromDexPair)
    .filter((hit): hit is MarketHit => Boolean(hit))
    .sort(
      (a, b) =>
        (b.liquidityUsd ?? 0) - (a.liquidityUsd ?? 0) || (b.volumeUsd ?? 0) - (a.volumeUsd ?? 0),
    );
  const seen = new Set<string>();
  const hits: MarketHit[] = [];
  for (const hit of ranked) {
    const key = hit.mint ?? hit.ticker;
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    hits.push(hit);
  }
  return hits.length ? hits.slice(0, TAPE_LIMIT) : "error";
}

/** No documented public Phantom trending URL — do not scrape explore pages. */
export async function peekPhantomTrending(): Promise<MarketHits> {
  return "skip";
}

function mapBirdeyeHits(body: unknown): MarketHit[] {
  const root = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  const data = root && root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : null;
  const list = Array.isArray(data?.tokens)
    ? data.tokens
    : Array.isArray(root?.tokens)
      ? root.tokens
      : Array.isArray(body)
        ? body
        : [];
  const hits: MarketHit[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const row = item as Record<string, unknown>;
    const mint = typeof row.address === "string" ? row.address : null;
    const ticker = tickerFromSymbol(typeof row.symbol === "string" ? row.symbol : null);
    const changePct =
      finiteUsd(row.priceChange24hPercent) ??
      finiteUsd(row.price24hChangePercent) ??
      finiteUsd(row.v24hChangePercent);
    const hit = skipPaidHit({
      source: "birdeye",
      ticker,
      mint,
      volumeUsd: finiteUsd(row.volume24hUSD) ?? finiteUsd(row.v24hUSD) ?? 0,
      name: typeof row.name === "string" ? row.name : ticker,
      priceUsd: finiteUsd(row.price),
      priceChange24h: changePct,
      changePct,
      liquidityUsd: finiteUsd(row.liquidity),
      marketCap: finiteUsd(row.mc) ?? finiteUsd(row.marketCap),
      imageUrl: asHttpsLogo(
        typeof row.logoURI === "string" ? row.logoURI : typeof row.logo === "string" ? row.logo : null,
      ),
    });
    if (hit && mint) {
      hits.push(hit);
    }
  }
  return hits;
}

async function peekBirdeye(): Promise<MarketHits> {
  const key = process.env.BIRDEYE_API_KEY?.trim();
  if (!key) {
    return "skip";
  }
  const result = await readProvider(
    "https://public-api.birdeye.so/defi/token_trending?sort_by=rank&sort_type=asc&offset=0&limit=8",
    { ...UA, "X-API-KEY": key, "x-chain": "solana" },
    MARKET_FETCH_MS,
  );
  if (result.status !== "ok") {
    return result.status;
  }
  return asHits(result, mapBirdeyeHits(result.body));
}

function firstListedRows(body: unknown): Record<string, unknown>[] {
  if (!body || typeof body !== "object") {
    return [];
  }
  const root = body as Record<string, unknown>;
  const data = root.data;
  const nested = data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : null;
  const lists = [data, nested?.rank, nested?.list, nested?.tokens, root.rank, root.list, root.tokens];
  for (const list of lists) {
    if (Array.isArray(list)) {
      return list.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object");
    }
  }
  return [];
}

function mapGmgnHits(body: unknown): MarketHit[] {
  const hits: MarketHit[] = [];
  for (const row of firstListedRows(body)) {
    const mint =
      (typeof row.address === "string" && row.address) ||
      (typeof row.token_address === "string" && row.token_address) ||
      null;
    const ticker = tickerFromSymbol(typeof row.symbol === "string" ? row.symbol : null);
    const changePct = finiteUsd(row.price_change_percent) ?? finiteUsd(row.price_change_percent1h);
    const hit = skipPaidHit({
      source: "gmgn",
      ticker,
      mint,
      volumeUsd: finiteUsd(row.volume) ?? finiteUsd(row.volume_24h) ?? 0,
      name: typeof row.name === "string" ? row.name : ticker,
      priceUsd: finiteUsd(row.price),
      priceChange24h: changePct,
      changePct,
      liquidityUsd: finiteUsd(row.liquidity),
      marketCap: finiteUsd(row.market_cap),
      imageUrl: asHttpsLogo(typeof row.logo === "string" ? row.logo : null),
      pairAddress:
        typeof row.biggest_pool_address === "string"
          ? row.biggest_pool_address
          : typeof row.pool_address === "string"
            ? row.pool_address
            : null,
      pool:
        typeof row.biggest_pool_address === "string"
          ? row.biggest_pool_address
          : typeof row.pool_address === "string"
            ? row.pool_address
            : null,
    });
    if (hit && mint) {
      hits.push(hit);
    }
  }
  return hits;
}

async function peekGmgn(): Promise<MarketHits> {
  const key = process.env.GMGN_API_KEY?.trim();
  if (!key) {
    return "skip";
  }
  const result = await readProvider(
    "https://openapi.gmgn.ai/v1/market/rank?chain=sol&interval=1h&limit=8&orderby=volume",
    { ...UA, "x-api-key": key },
    MARKET_FETCH_MS,
  );
  if (result.status !== "ok") {
    return result.status;
  }
  return asHits(result, mapGmgnHits(result.body));
}

function slotFromBody(body: unknown): number | null {
  const slot = finiteUsd((body as { result?: unknown } | null)?.result);
  return slot != null && slot >= 0 ? slot : null;
}

async function postHelius(payload: Record<string, unknown>): Promise<ReadResult> {
  const key = process.env.HELIUS_API_KEY?.trim();
  if (!key) {
    return { status: "skip" };
  }
  return postRpc(`https://mainnet.helius-rpc.com/?api-key=${key}`, payload);
}

async function peekSolana(): Promise<SolanaConfirm | ProviderStatus> {
  const publicSlot = await postRpc("https://api.mainnet-beta.solana.com", {
    jsonrpc: "2.0",
    id: "muse-world-slot",
    method: "getSlot",
  });
  if (publicSlot.status === "ok") {
    const slot = slotFromBody(publicSlot.body);
    if (slot != null) {
      return { slot };
    }
  }
  if (publicSlot.status === "skip") {
    return "skip";
  }
  const key = process.env.HELIUS_API_KEY?.trim();
  if (!key) {
    return publicSlot.status === "ok" ? "error" : publicSlot.status;
  }
  const heliusSlot = await postHelius({
    jsonrpc: "2.0",
    id: "muse-world-slot",
    method: "getSlot",
  });
  if (heliusSlot.status !== "ok") {
    return heliusSlot.status;
  }
  const slot = slotFromBody(heliusSlot.body);
  return slot != null ? { slot } : "error";
}

async function peekSolUsd(): Promise<number | null> {
  const result = await readProvider(
    `https://api.dexscreener.com/latest/dex/tokens/${SOL_MINT}`,
    UA,
    MARKET_FETCH_MS,
  );
  if (result.status !== "ok") {
    return null;
  }
  const pair = dexPairsOf(result.body).sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];
  return finiteUsd(pair?.priceUsd);
}

async function confirmHelius(mint: string | null): Promise<HeliusConfirm | ProviderStatus> {
  if (!process.env.HELIUS_API_KEY?.trim()) {
    return "skip";
  }
  if (!mint || !looksLikeMint(mint)) {
    return "skip";
  }
  const result = await postHelius({
    jsonrpc: "2.0",
    id: "muse-world-asset",
    method: "getAsset",
    params: { id: mint },
  });
  if (result.status !== "ok") {
    return result.status;
  }
  const body = result.body as {
    result?: { id?: string; content?: { metadata?: { symbol?: string; name?: string } } };
  };
  if (!body.result) {
    return "error";
  }
  const symbol = tickerFromSymbol(body.result.content?.metadata?.symbol ?? null);
  if (isPaidTicker(symbol) || isPaidTicker(body.result.content?.metadata?.symbol)) {
    return { symbol: null, mint: body.result.id ?? mint };
  }
  return { symbol, mint: body.result.id ?? mint };
}

async function peekGeckoCandles(pool: string | null): Promise<TapeCandle[]> {
  if (!pool) {
    return [];
  }
  const result = await readProvider(
    `https://api.geckoterminal.com/api/v2/networks/solana/pools/${pool}/ohlcv/minute?aggregate=15&limit=20`,
    UA,
    MARKET_FETCH_MS,
  );
  if (result.status !== "ok") {
    return [];
  }
  const list = (result.body as { data?: { attributes?: { ohlcv_list?: unknown } } } | null)?.data
    ?.attributes?.ohlcv_list;
  return candlesFromOhlcvList(list);
}

function rowsOf(group: MarketHits): MarketHit[] {
  if (typeof group === "string") {
    return [];
  }
  return (Array.isArray(group) ? group : [group]) as MarketHit[];
}

function firstMint(...groups: MarketHits[]): string | null {
  for (const group of groups) {
    for (const row of rowsOf(group)) {
      if (row.mint && looksLikeMint(row.mint)) {
        return row.mint;
      }
    }
  }
  return null;
}

function firstPool(...groups: MarketHits[]): string | null {
  for (const group of groups) {
    for (const row of rowsOf(group)) {
      if (row.pool && looksLikeMint(row.pool)) {
        return row.pool;
      }
      if (row.pairAddress && looksLikeMint(row.pairAddress)) {
        return row.pairAddress;
      }
    }
  }
  return null;
}

function collectMints(...groups: MarketHits[]): string[] {
  const mints: string[] = [];
  const seen = new Set<string>();
  for (const group of groups) {
    const rows = rowsOf(group);
    if (rows.length === 0) {
      continue;
    }
    for (const row of rows) {
      if (row.mint && looksLikeMint(row.mint) && !seen.has(row.mint)) {
        seen.add(row.mint);
        mints.push(row.mint);
      }
    }
  }
  return mints;
}

async function gatherPulse(now: number): Promise<MarketPulse> {
  const started = Date.now();
  const [gecko, dexBoosts, dexSearch, birdeye, gmgn, _phantom, solana, solUsd] = await Promise.all([
    peekGecko(),
    peekDexBoosts(),
    peekDexSearchPairs(),
    peekBirdeye(),
    peekGmgn(),
    peekPhantomTrending(),
    peekSolana(),
    peekSolUsd(),
  ]);
  void _phantom;
  const remaining = Math.max(0, MARKET_BUDGET_MS - (Date.now() - started));
  const seed = firstMint(gecko, dexSearch, dexBoosts.hits, birdeye, gmgn) ?? dexBoosts.mints[0] ?? null;
  const pool = firstPool(gecko, dexSearch, birdeye, gmgn);
  const hydrateMints = collectMints(gecko, dexSearch, dexBoosts.hits, birdeye, gmgn);
  for (const mint of dexBoosts.mints) {
    if (!hydrateMints.includes(mint)) {
      hydrateMints.push(mint);
    }
  }
  const wave2 =
    remaining > 250
      ? await Promise.all([
          hydrateMints.length ? peekDexPairs(hydrateMints) : Promise.resolve<MarketHits>("skip"),
          confirmHelius(seed),
          peekGeckoCandles(pool),
        ])
      : (["skip", "skip", []] as const);
  const dexPairs = wave2[0];
  const helius = wave2[1];
  const candles = wave2[2];
  const dexHits = [
    ...rowsOf(dexPairs),
    ...rowsOf(dexSearch),
    ...dexBoosts.hits.filter((hit) => Boolean(hit.ticker)),
  ];
  const dexscreener: MarketHits = dexHits.length
    ? dexHits
    : typeof dexPairs === "string" && dexPairs !== "skip"
      ? dexPairs
      : typeof dexSearch === "string" && dexSearch !== "skip"
        ? dexSearch
        : dexBoosts.status;
  return mergeMarketPulse({
    gecko,
    dexscreener,
    birdeye,
    gmgn,
    helius,
    solana,
    solUsd,
    candles,
    at: now,
  });
}

export async function peekMarketPulse(): Promise<MarketPulse> {
  const now = Date.now();
  if (now - lastAt < MARKET_LIVE_TTL_MS) {
    return stampPulse(lastPulse);
  }
  lastAt = now;
  try {
    const pulse = await raceTimeout(
      gatherPulse(now),
      lastPulse.source !== "sim" && now - lastLiveAt < STALE_LIVE_MS
        ? lastPulse
        : quietMarketPulse(quietProviders(), { at: now }),
      MARKET_BUDGET_MS,
    );
    if (pulse.source === "sim" && lastPulse.source !== "sim" && now - lastLiveAt < STALE_LIVE_MS) {
      return stampPulse(lastPulse);
    }
    lastPulse = pulse;
    if (pulse.source !== "sim") {
      lastLiveAt = now;
    }
    return stampPulse(lastPulse);
  } catch {
    if (lastPulse.source !== "sim" && now - lastLiveAt < STALE_LIVE_MS) {
      return stampPulse(lastPulse);
    }
    lastPulse = quietMarketPulse(quietProviders(), { at: now });
    return stampPulse(lastPulse);
  }
}
