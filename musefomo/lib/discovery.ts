import { cachePeek, cacheSet } from "@/lib/cache";
import { seedHomeMemes } from "@/lib/home-paint";
import {
  BONK_MINT,
  DISCOVER_CACHE_MS,
  DISCOVER_SECTION_LIMIT,
  JUP_MINT,
  SOL_MINT,
  TRUMP_MINT,
  USDC_MINT,
  WIF_MINT,
} from "@/lib/constants";
import {
  listMuseAgentCashflow,
  listMuseMostHeld,
  listMuseMostTraded,
  listMuseRecentActivity,
  listMuseTopMints,
  listTokenIndexByMints,
  upsertTokenMeta,
  type MuseActivityRow,
  type MuseCashflowRow,
  type MuseMintStat,
  type TokenIndexRow,
} from "@/lib/db";
import { finitePrice, PROVIDER_BUDGET_MS, publicJson, raceTimeout } from "@/lib/fast-fetch";
import { looksLikeEvm, looksLikeMint } from "@/lib/format";
import { getDexTokenImages, getSolUsd } from "@/lib/market";
import { getMuseDiscoveryBoards } from "@/lib/muse-board";
import { loadPonsLongRail } from "@/lib/pons-long";
import { getTrendingTokens as getBirdeyeTrending } from "@/lib/providers/birdeye";
import { loadLiveCoinBook } from "@/lib/providers/hydrate";
import { readProviderCache, writeProviderCache } from "@/lib/providers/store";
import { dexLogo, overlayKnownRow } from "@/lib/known-mints";
import { rankLiveMemes, type MemeSeed, type MemeVia } from "@/lib/meme-rank";
import { loadQualityLists, peekQualityLists } from "@/lib/quality-lists";
import { asHttpsLogo, loadJupiterTrendingRows, paintTokenRows } from "@/lib/token-logo";
import { loadPinnedRail, pinDiscoverPayload, pinnedDiscoverRow } from "@/lib/pinned-tokens";
import { loadRobinhoodChainNamed, loadRobinhoodRail } from "@/lib/robinhood";
import { lamportsToUsd, parseLamports, windowSince } from "@/lib/pnl";
import type {
  DiscoverActivityRow,
  DiscoverPayload,
  DiscoverSection,
  DiscoverSource,
  DiscoverTokenRow,
  LeaderboardPayload,
  LeaderboardWindow,
  MuseLeaderRow,
  MuseTokenRank,
} from "@/lib/types";

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

function section<T>(
  source: DiscoverSource,
  label: string,
  items: T[] | null | undefined,
): DiscoverSection<T[]> | null {
  if (!items?.length) return null;
  return { source, label, items };
}

function httpsDiscoverRow(row: DiscoverTokenRow): DiscoverTokenRow {
  const imageUrl =
    asHttpsLogo(row.imageUrl) ??
    (row.chain === "robinhood" || looksLikeEvm(row.mint) ? null : dexLogo(row.mint));
  return { ...row, imageUrl };
}

function decorateMarket(rows: DiscoverTokenRow[]): DiscoverTokenRow[] {
  return rows.map((row) => {
    if (row.chain === "robinhood" || looksLikeEvm(row.mint)) return httpsDiscoverRow(row);
    return httpsDiscoverRow(overlayKnownRow(row));
  });
}

async function paintMarket(rows: DiscoverTokenRow[]): Promise<DiscoverTokenRow[]> {
  const known = decorateMarket(rows);
  const evm = known.filter((row) => row.chain === "robinhood" || looksLikeEvm(row.mint));
  const sol = known.filter((row) => row.chain !== "robinhood" && !looksLikeEvm(row.mint));
  const painted = await paintTokenRows(sol);
  return [...painted, ...evm].sort((a, b) => a.rank - b.rank);
}

const TREND_MS = 1_500;
const TREND_MIN = 8;
const DISCOVER_CACHE_KEY = "discover:v14";
const DISCOVER_DB_KEY = "v14";
const MEME_RANK_KEY = "meme-rank:v1:48";
const SKIP_TREND_MINTS = new Set([SOL_MINT, USDC_MINT]);
const SKIP_TREND_SYMBOLS = new Set([
  "LONGER",
  "NVDAX3L",
  "REDDITPAD",
  "WIKIPAD",
  "ROBLOXPAD",
  "SKINPAD",
  "GITPAD",
  "SNAPPAD",
  "PONS",
  "SOL",
  "WSOL",
  "USDC",
  "USDT",
]);
const SEED_MEME_MINTS = [WIF_MINT, BONK_MINT, TRUMP_MINT, JUP_MINT];

type DexPair = {
  chainId?: string;
  pairAddress?: string;
  baseToken?: { address?: string; symbol?: string; name?: string };
  priceUsd?: string;
  priceChange?: { h24?: number };
  volume?: { h24?: number };
  liquidity?: { usd?: number };
  marketCap?: number;
  fdv?: number;
  pairCreatedAt?: number;
  info?: { imageUrl?: string };
};

function isPricedSolana(row: DiscoverTokenRow): boolean {
  if (!looksLikeMint(row.mint) || looksLikeEvm(row.mint) || row.priceUsd == null) return false;
  if (!(row.symbol || row.name)) return false;
  if (SKIP_TREND_MINTS.has(row.mint)) return false;
  const symbol = (row.symbol ?? "").toUpperCase();
  if (SKIP_TREND_SYMBOLS.has(symbol)) return false;
  return true;
}

function memeRow(input: {
  mint: string;
  symbol: string | null;
  name: string | null;
  imageUrl: string | null;
  priceUsd: number | null;
  volumeUsd: number | null;
  marketCap: number | null;
  priceChange24h: number | null;
  pairAddress: string | null;
}): DiscoverTokenRow | null {
  if (!looksLikeMint(input.mint) || looksLikeEvm(input.mint) || input.priceUsd == null) return null;
  if (!(input.symbol || input.name)) return null;
  return {
    rank: 0,
    mint: input.mint,
    symbol: input.symbol,
    name: input.name,
    imageUrl: input.imageUrl ?? dexLogo(input.mint),
    priceUsd: input.priceUsd,
    volumeUsd: input.volumeUsd,
    volumeLamports: null,
    marketCap: input.marketCap,
    priceChange24h: input.priceChange24h,
    holders: null,
    trades: null,
    pairAddress: input.pairAddress,
    source: "market",
  };
}

function asSeed(row: DiscoverTokenRow | null, via: MemeVia, extra?: Partial<MemeSeed>): MemeSeed | null {
  if (!row) return null;
  return { ...row, via, ...extra };
}

function fromDexPair(pair: DexPair, via: MemeVia = "dex"): MemeSeed | null {
  if (pair.chainId && pair.chainId !== "solana") return null;
  return asSeed(
    memeRow({
      mint: pair.baseToken?.address ?? "",
      symbol: pair.baseToken?.symbol ?? null,
      name: pair.baseToken?.name ?? null,
      imageUrl: pair.info?.imageUrl ?? null,
      priceUsd: finitePrice(pair.priceUsd),
      volumeUsd: finitePrice(pair.volume?.h24),
      marketCap: finitePrice(pair.marketCap) ?? finitePrice(pair.fdv),
      priceChange24h:
        typeof pair.priceChange?.h24 === "number" && Number.isFinite(pair.priceChange.h24)
          ? pair.priceChange.h24
          : null,
      pairAddress: pair.pairAddress ?? null,
    }),
    via,
    {
      liquidityUsd: finitePrice(pair.liquidity?.usd),
      pairCreatedAt: typeof pair.pairCreatedAt === "number" ? pair.pairCreatedAt : null,
    },
  );
}

function pumpCoins(raw: unknown): Array<Record<string, unknown>> {
  const root = raw as Record<string, unknown> | unknown[] | null;
  const list = Array.isArray(root)
    ? root
    : root && typeof root === "object"
      ? ((root.coins ?? root.data ?? root.results) as unknown[])
      : [];
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const coin = row.coin;
      return coin && typeof coin === "object" ? (coin as Record<string, unknown>) : row;
    })
    .filter((row): row is Record<string, unknown> => Boolean(row));
}

async function quoteSolanaMints(mints: string[]): Promise<DiscoverTokenRow[]> {
  const unique = [...new Set(mints.filter((mint) => looksLikeMint(mint) && !looksLikeEvm(mint)))];
  if (!unique.length) return [];
  const chunks = [unique.slice(0, 30), unique.slice(30, 60)].filter((chunk) => chunk.length);
  const bodies = await Promise.all(
    chunks.map((chunk) =>
      publicJson<DexPair[] | { pairs?: DexPair[] }>(
        `https://api.dexscreener.com/tokens/v1/solana/${chunk.join(",")}`,
        TREND_MS,
      ),
    ),
  );
  const rows: DiscoverTokenRow[] = [];
  for (const body of bodies) {
    const pairs = Array.isArray(body) ? body : (body?.pairs ?? []);
    for (const pair of pairs) {
      const row = fromDexPair(pair, "dex");
      if (row) rows.push(row);
    }
  }
  return rows;
}

async function fetchBoostMints(): Promise<string[]> {
  const body = await publicJson<Array<{ chainId?: string; tokenAddress?: string }>>(
    "https://api.dexscreener.com/token-boosts/top/v1",
    TREND_MS,
  );
  return (body ?? [])
    .filter((item) => item.chainId === "solana" && looksLikeMint(item.tokenAddress ?? ""))
    .map((item) => item.tokenAddress as string);
}

async function fetchDexSearchRows(query: string): Promise<DiscoverTokenRow[]> {
  const body = await publicJson<{ pairs?: DexPair[] }>(
    `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`,
    TREND_MS,
  );
  return (body?.pairs ?? []).map((pair) => fromDexPair(pair, "dex")).filter((row): row is MemeSeed => Boolean(row));
}

async function fetchDexProfileMints(): Promise<string[]> {
  const [latest, boosts] = await Promise.all([
    publicJson<Array<{ chainId?: string; tokenAddress?: string }>>(
      "https://api.dexscreener.com/token-profiles/latest/v1",
      TREND_MS,
    ),
    publicJson<Array<{ chainId?: string; tokenAddress?: string }>>(
      "https://api.dexscreener.com/token-boosts/latest/v1",
      TREND_MS,
    ),
  ]);
  return [...(latest ?? []), ...(boosts ?? [])]
    .filter((item) => item.chainId === "solana" && looksLikeMint(item.tokenAddress ?? ""))
    .map((item) => item.tokenAddress as string);
}

async function fetchGeckoPricedRows(): Promise<DiscoverTokenRow[]> {
  const gecko = await publicJson<{
    data?: Array<{
      attributes?: {
        base_token_price_usd?: string;
        volume_usd?: { h24?: string };
        market_cap_usd?: string;
        price_change_percentage?: { h24?: string };
        name?: string;
        address?: string;
      };
      relationships?: { base_token?: { data?: { id?: string } } };
    }>;
    included?: Array<{
      id?: string;
      attributes?: { address?: string; symbol?: string; name?: string; image_url?: string };
    }>;
  }>("https://api.geckoterminal.com/api/v2/networks/solana/trending_pools?include=base_token", TREND_MS);
  const looks = new Map<string, { symbol?: string; name?: string; imageUrl?: string; address?: string }>();
  for (const item of gecko?.included ?? []) {
    const address = item.attributes?.address ?? "";
    looks.set(item.id ?? "", {
      symbol: item.attributes?.symbol,
      name: item.attributes?.name,
      imageUrl: item.attributes?.image_url,
      address,
    });
    if (address) looks.set(address, looks.get(item.id ?? "")!);
  }
  const rows: DiscoverTokenRow[] = [];
  for (const pool of gecko?.data ?? []) {
    const tokenId = pool.relationships?.base_token?.data?.id ?? "";
    const look = looks.get(tokenId);
    const mint = look?.address ?? (tokenId.includes("_") ? (tokenId.split("_").pop() ?? "") : tokenId);
    const symbol = look?.symbol ?? pool.attributes?.name?.split(" / ")[0] ?? null;
    const row = memeRow({
      mint,
      symbol,
      name: look?.name ?? symbol,
      imageUrl: look?.imageUrl ?? null,
      priceUsd: finitePrice(pool.attributes?.base_token_price_usd),
      volumeUsd: finitePrice(pool.attributes?.volume_usd?.h24),
      marketCap: finitePrice(pool.attributes?.market_cap_usd),
      priceChange24h: finitePrice(pool.attributes?.price_change_percentage?.h24),
      pairAddress: pool.attributes?.address ?? null,
    });
    if (row) rows.push(row);
  }
  return rows;
}

async function fetchPumpCoinRecords(): Promise<Record<string, unknown>[]> {
  const [runners, latest] = await Promise.all([
    publicJson<unknown>("https://frontend-api-v3.pump.fun/coins/top-runners", TREND_MS),
    publicJson<unknown>(
      "https://frontend-api-v3.pump.fun/coins?offset=0&limit=50&sort=last_trade_timestamp&order=DESC&includeNsfw=false",
      TREND_MS,
    ),
  ]);
  return [...pumpCoins(runners), ...pumpCoins(latest)];
}

function pumpRecordRow(row: Record<string, unknown>): DiscoverTokenRow | null {
  return memeRow({
    mint: typeof row.mint === "string" ? row.mint : "",
    symbol: typeof row.symbol === "string" ? row.symbol : null,
    name: typeof row.name === "string" ? row.name : null,
    imageUrl:
      typeof row.image_uri === "string"
        ? row.image_uri
        : typeof row.imageUri === "string"
          ? row.imageUri
          : null,
    priceUsd: finitePrice(row.usd_price) ?? finitePrice(row.price_usd) ?? finitePrice(row.priceUsd),
    volumeUsd: finitePrice(row.volume_24h) ?? finitePrice(row.volume24h),
    marketCap: finitePrice(row.usd_market_cap) ?? finitePrice(row.market_cap),
    priceChange24h: finitePrice(row.price_change_24h),
    pairAddress: typeof row.pump_swap_pool === "string" ? row.pump_swap_pool : null,
  });
}

async function fetchBirdeyeRows(): Promise<DiscoverTokenRow[]> {
  const bird = await getBirdeyeTrending(20).catch(() => null);
  if (!bird?.ok) return [];
  return bird.data
    .map((item) =>
      memeRow({
        mint: item.mint,
        symbol: item.symbol,
        name: item.name,
        imageUrl: item.logo,
        priceUsd: item.priceUsd,
        volumeUsd: item.volume24h,
        marketCap: null,
        priceChange24h: null,
        pairAddress: null,
      }),
    )
    .filter((row): row is DiscoverTokenRow => Boolean(row));
}

function rememberRanked(rows: DiscoverTokenRow[]): DiscoverTokenRow[] {
  if (rows.length) cacheSet(MEME_RANK_KEY, rows, DISCOVER_CACHE_MS);
  return rows;
}

export function peekRankedMemes(): DiscoverTokenRow[] {
  return cachePeek<DiscoverTokenRow[]>(MEME_RANK_KEY)?.value ?? [];
}

let trendInflight: Promise<DiscoverTokenRow[]> | null = null;

export async function getSolanaMemeTrending(): Promise<DiscoverTokenRow[]> {
  if (trendInflight) return trendInflight;
  trendInflight = getSolanaMemeTrendingNow().finally(() => {
    trendInflight = null;
  });
  return trendInflight;
}

async function getSolanaMemeTrendingNow(): Promise<DiscoverTokenRow[]> {
  try {
    const [book, gecko, pumpRecords, boostMints, profileMints, jup, bird, quality] = await Promise.all([
      settled(loadLiveCoinBook(48).catch(() => []), [] as DiscoverTokenRow[], TREND_MS),
      settled(fetchGeckoPricedRows().catch(() => []), [] as DiscoverTokenRow[], TREND_MS),
      settled(fetchPumpCoinRecords().catch(() => []), [] as Record<string, unknown>[], TREND_MS),
      settled(fetchBoostMints().catch(() => []), [] as string[], TREND_MS),
      settled(fetchDexProfileMints().catch(() => []), [] as string[], TREND_MS),
      settled(loadJupiterTrendingRows().catch(() => []), [] as DiscoverTokenRow[], TREND_MS),
      settled(fetchBirdeyeRows().catch(() => []), [] as DiscoverTokenRow[], TREND_MS),
      settled(loadQualityLists().catch(() => peekQualityLists()), peekQualityLists(), TREND_MS),
    ]);
    const pumpRows = pumpRecords
      .map((row) => asSeed(pumpRecordRow(row), "pump"))
      .filter((row): row is MemeSeed => Boolean(row));
    const liveSeeds: MemeSeed[] = [
      ...book.map((row) => asSeed(row, "book")).filter((row): row is MemeSeed => Boolean(row)),
      ...gecko.map((row) => asSeed(row, "gecko")).filter((row): row is MemeSeed => Boolean(row)),
      ...jup.map((row) => asSeed(row, "jupiter")).filter((row): row is MemeSeed => Boolean(row)),
      ...bird.map((row) => asSeed(row, "birdeye")).filter((row): row is MemeSeed => Boolean(row)),
      ...pumpRows,
    ];
    rememberRanked(rankLiveMemes(liveSeeds, quality));
    const pumpMints = pumpRecords
      .map((row) => (typeof row.mint === "string" ? row.mint : ""))
      .filter((mint) => looksLikeMint(mint) && !looksLikeEvm(mint))
      .slice(0, 16);
    const quoted = await quoteSolanaMints([
      ...SEED_MEME_MINTS,
      ...boostMints,
      ...profileMints,
      ...jup.map((row) => row.mint).slice(0, 24),
      ...pumpMints,
    ]).catch(() => [] as DiscoverTokenRow[]);
    return rememberRanked(
      rankLiveMemes(
        [...liveSeeds, ...quoted.map((row) => asSeed(row, "dex")).filter((row): row is MemeSeed => Boolean(row))],
        quality,
      ),
    );
  } catch {
    return peekRankedMemes();
  }
}

export function persistDiscover(payload: DiscoverPayload): boolean {
  const priced = payload.trending?.items.filter(isPricedSolana).length ?? 0;
  return priced >= TREND_MIN;
}

async function decorateMuseTokens(
  stats: MuseMintStat[],
  source: DiscoverSource,
  solUsd: number | null,
): Promise<DiscoverTokenRow[]> {
  if (!stats.length) return [] as DiscoverTokenRow[];
  const mints = stats.map((row) => row.mint);
  const [meta, images] = await Promise.all([
    listTokenIndexByMints(mints).catch(() => []),
    getDexTokenImages(mints).catch(() => new Map<string, string>()),
  ]);
  const catalog = new Map(meta.map((row) => [row.mint, row]));
  return stats.map((row, index) => {
    const known = catalog.get(row.mint);
    return {
      rank: index + 1,
      mint: row.mint,
      symbol: known?.symbol ?? null,
      name: known?.name ?? null,
      imageUrl: asHttpsLogo(known?.imageUrl) ?? asHttpsLogo(images.get(row.mint)) ?? dexLogo(row.mint),
      priceUsd: null,
      volumeUsd: lamportsToUsd(parseLamports(row.volumeLamports), solUsd),
      volumeLamports: row.volumeLamports,
      marketCap: null,
      priceChange24h: null,
      holders: row.holders || null,
      trades: row.trades || null,
      pairAddress: null,
      source,
    };
  });
}

function ranksToMintStats(rows: MuseTokenRank[]): MuseMintStat[] {
  return rows.map((row) => ({
    mint: row.mint,
    trades: row.fillCount,
    volumeLamports: row.volumeLamports,
    holders: row.holders ?? 0,
  }));
}

async function rememberMints(rows: DiscoverTokenRow[]) {
  await Promise.all(
    rows.slice(0, DISCOVER_SECTION_LIMIT).map((row) =>
      upsertTokenMeta({
        mint: row.mint,
        symbol: row.symbol,
        name: row.name,
        imageUrl: row.imageUrl,
      }).catch(() => undefined),
    ),
  );
}

export function peekDiscoverCached(): DiscoverPayload {
  const raw = cachePeek<DiscoverPayload>(DISCOVER_CACHE_KEY)?.value ?? emptyDiscover();
  const ranked = peekRankedMemes();
  const tokens = ranked.length ? ranked : seedHomeMemes();
  return pinDiscoverPayload({
    ...raw,
    featured: raw.featured ?? null,
    trending: section("market", "Trending tokens", tokens.map(httpsDiscoverRow)),
  });
}

let discoverBookInflight: Promise<DiscoverPayload> | null = null;

async function refreshDiscoverBook(): Promise<DiscoverPayload> {
  if (discoverBookInflight) return discoverBookInflight;
  discoverBookInflight = refreshDiscoverBookNow().finally(() => {
    discoverBookInflight = null;
  });
  return discoverBookInflight;
}

async function refreshDiscoverBookNow(): Promise<DiscoverPayload> {
  const [memes, robinhood, robinhoodChain, pons, pinned, museBoards, museTradedSql, museHeldSql, museActivity, solUsd] =
    await Promise.all([
      settled(getSolanaMemeTrending(), [] as DiscoverTokenRow[], 5_000),
      settled(loadRobinhoodRail(), [] as DiscoverTokenRow[], 800),
      settled(loadRobinhoodChainNamed(), [] as DiscoverTokenRow[], 800),
      settled(loadPonsLongRail(), [] as DiscoverTokenRow[], 2_000),
      settled(loadPinnedRail(), [pinnedDiscoverRow()], 800),
      settled(getMuseDiscoveryBoards().catch(() => null), null, 800),
      settled(listMuseMostTraded(DISCOVER_SECTION_LIMIT).catch((): MuseMintStat[] => []), [], 800),
      settled(listMuseMostHeld(DISCOVER_SECTION_LIMIT).catch((): MuseMintStat[] => []), [], 800),
      settled(listMuseRecentActivity(DISCOVER_SECTION_LIMIT).catch((): MuseActivityRow[] => []), [], 800),
      settled(getSolUsd().catch(() => null), null, 800),
    ]);

  const geckoRows = decorateMarket(memes).filter(isPricedSolana);
  const [robinhoodRows, robinhoodChainRows, ponsRows] = await Promise.all([
    settled(paintMarket(robinhood), decorateMarket(robinhood), 200),
    settled(paintMarket(robinhoodChain), decorateMarket(robinhoodChain), 200),
    settled(paintMarket(pons), decorateMarket(pons), 200),
  ]);
  const tradedSource = museBoards?.mostTraded.all.length
    ? ranksToMintStats(museBoards.mostTraded.all)
    : museTradedSql;
  const heldSource = museBoards?.mostHeld.length
    ? ranksToMintStats(museBoards.mostHeld)
    : museHeldSql;
  const [tradedRows, heldRows] = await Promise.all([
    settled(decorateMuseTokens(tradedSource, "muse-confirmed", solUsd), [], 800),
    settled(decorateMuseTokens(heldSource, "muse-confirmed", solUsd), [], 800),
  ]);

  const activityMeta = await raceTimeout(
    listTokenIndexByMints(museActivity.map((row) => row.mint)).catch((): TokenIndexRow[] => []),
    [] as TokenIndexRow[],
    600,
  );
  const activityCatalog = new Map(activityMeta.map((row) => [row.mint, row]));
  const activityRows: DiscoverActivityRow[] = museActivity.map((row) => {
    const known = activityCatalog.get(row.mint);
    return {
      id: row.id,
      agentId: row.agentId,
      handle: row.handle,
      displayName: row.displayName,
      side: row.side,
      mint: row.mint,
      symbol: known?.symbol ?? null,
      imageUrl: asHttpsLogo(known?.imageUrl) ?? dexLogo(row.mint),
      usd: lamportsToUsd(
        parseLamports(row.side === "buy" ? row.actualInAmount : row.actualOutAmount),
        solUsd,
      ),
      confirmedAt: row.confirmedAt,
      signature: row.signature,
    };
  });

  const [paintedTraded, paintedHeld] = await Promise.all([
    settled(paintTokenRows(tradedRows), tradedRows, 200),
    settled(paintTokenRows(heldRows), heldRows, 200),
  ]);

  void rememberMints(
    [...geckoRows, ...robinhoodRows, ...paintedTraded, ...paintedHeld].filter((row) => looksLikeMint(row.mint)),
  );

  const last = cachePeek<DiscoverPayload>(DISCOVER_CACHE_KEY)?.value ?? null;
  const livePons = ponsRows.filter((row) => row.priceUsd != null && Boolean(row.symbol || row.name));
  const merged = rememberRanked(
    rankLiveMemes(
      [
        ...geckoRows.map((row) => asSeed(row, "book")).filter((row): row is MemeSeed => Boolean(row)),
        ...livePons.filter(isPricedSolana).map((row) => asSeed(row, "quality")).filter((row): row is MemeSeed => Boolean(row)),
      ],
      peekQualityLists(),
    ),
  );
  const payload: DiscoverPayload = pinDiscoverPayload(
    {
    trending: section("market", "Trending tokens", merged.map(httpsDiscoverRow)),
    featured: null,
    robinhood: section("market", "xStocks", robinhoodRows) ?? last?.robinhood ?? null,
    robinhoodChain: section("market", "Robinhood Chain", robinhoodChainRows) ?? last?.robinhoodChain ?? null,
    pons: section("market", "Pons", livePons),
    museMostTraded: section("muse-confirmed", "Most traded by Muse agents", paintedTraded),
    museMostHeld: section("muse-confirmed", "Most held by Muse agents", paintedHeld),
    museActivity: section("muse-confirmed", "Recent Muse activity", activityRows),
    fomoTrending: null,
    fomoMostHeld: null,
    museBoards,
    fomoUnavailable: null,
    },
    pinned[0] ?? null,
  );
  if (persistDiscover(payload)) {
    cacheSet(DISCOVER_CACHE_KEY, payload, DISCOVER_CACHE_MS);
    void writeProviderCache("cache", "discover", DISCOVER_DB_KEY, payload, DISCOVER_CACHE_MS);
  }
  return payload;
}

export function emptyDiscover(): DiscoverPayload {
  return {
    trending: null,
    featured: null,
    robinhood: null,
    robinhoodChain: null,
    pons: null,
    museMostTraded: null,
    museMostHeld: null,
    museActivity: null,
    fomoTrending: null,
    fomoMostHeld: null,
    museBoards: null,
    fomoUnavailable: null,
  };
}

export async function runDiscover(): Promise<DiscoverPayload> {
  void refreshTrendingPublic();
  return peekDiscoverCached();
}

export function refreshDiscoverBackground() {
  void refreshTrendingPublic();
}

async function refreshPublicTrendNow() {
  const [gecko, pumpRecords] = await Promise.all([
    settled(fetchGeckoPricedRows().catch(() => []), [] as DiscoverTokenRow[], TREND_MS),
    settled(fetchPumpCoinRecords().catch(() => []), [] as Record<string, unknown>[], TREND_MS),
  ]);
  const pumpRows = pumpRecords
    .map((row) => asSeed(pumpRecordRow(row), "pump"))
    .filter((row): row is MemeSeed => Boolean(row));
  const seeds: MemeSeed[] = [
    ...gecko.map((row) => asSeed(row, "gecko")).filter((row): row is MemeSeed => Boolean(row)),
    ...pumpRows,
  ];
  const ranked = decorateMarket(rankLiveMemes(seeds, peekQualityLists())).filter(isPricedSolana);
  if (ranked.length) rememberRanked(ranked);
}

export function refreshTrendingPublic() {
  void refreshPublicTrendNow().catch(() => undefined);
}

function cashflowToLeaders(
  rows: MuseCashflowRow[],
  topMints: Map<string, string>,
  symbols: Map<string, string | null>,
  solUsd: number | null,
): MuseLeaderRow[] {
  return rows.map((row, index) => {
    const buy = parseLamports(row.buyLamports);
    const sell = parseLamports(row.sellLamports);
    const pnl = sell - buy;
    const volume = buy + sell;
    const topMint = topMints.get(row.id) ?? null;
    return {
      rank: index + 1,
      id: row.id,
      handle: row.handle,
      label: row.displayName,
      avatarUrl: null,
      pnl: lamportsToUsd(pnl, solUsd),
      volume: lamportsToUsd(volume, solUsd),
      pnlLamports: pnl.toString(),
      volumeLamports: volume.toString(),
      winRateBps: null,
      closedCount: 0,
      numTrades: row.trades,
      topMint,
      topSymbol: topMint ? (symbols.get(topMint) ?? null) : null,
      source: "muse-confirmed",
    };
  });
}

export function emptyLeaderboard(window: LeaderboardWindow): LeaderboardPayload {
  return {
    window,
    capturedAt: Date.now(),
    muse: { source: "muse-confirmed", window, count: 0, entries: [] },
    fomo: null,
    fomoUnavailable: null,
    directory: [],
  };
}

function leaderboardHasRows(payload: LeaderboardPayload): boolean {
  return Boolean(payload.muse.entries.length || payload.fomo?.entries.length);
}

const leaderboardInflight = new Map<LeaderboardWindow, Promise<LeaderboardPayload>>();

function refreshLeaderboardSafe(window: LeaderboardWindow): Promise<LeaderboardPayload> {
  const existing = leaderboardInflight.get(window);
  if (existing) return existing;
  const work = refreshLeaderboard(window)
    .catch(() => emptyLeaderboard(window))
    .finally(() => {
      if (leaderboardInflight.get(window) === work) leaderboardInflight.delete(window);
    });
  leaderboardInflight.set(window, work);
  return work;
}

async function loadLeaderboard(window: LeaderboardWindow): Promise<LeaderboardPayload> {
  const db = await readProviderCache<LeaderboardPayload>("cache", "leaderboard", `v1:${window}`);
  if (db && leaderboardHasRows(db.value)) {
    void refreshLeaderboardSafe(window);
    return db.value;
  }
  void refreshLeaderboardSafe(window);
  return emptyLeaderboard(window);
}

async function refreshLeaderboard(window: LeaderboardWindow): Promise<LeaderboardPayload> {
  const since = windowSince(window);
  const sinceIso = since?.toISOString() ?? null;
  const [cashflow, boards, topMints, solUsd] = await Promise.all([
    settled(listMuseAgentCashflow(sinceIso).catch(() => []), [], 800),
    settled(getMuseDiscoveryBoards().catch(() => null), null, 800),
    settled(listMuseTopMints(sinceIso).catch(() => new Map<string, string>()), new Map(), 800),
    settled(getSolUsd().catch(() => null), null, 800),
  ]);
  const mintMeta = await settled(
    listTokenIndexByMints([...topMints.values()]).catch(() => []),
    [],
    800,
  );
  const symbols = new Map(mintMeta.map((row) => [row.mint, row.symbol]));

  const replay = boards?.leaderboard[window] ?? [];
  const muse: MuseLeaderRow[] = replay.length
    ? replay.map((row, index) => {
        const topMint = topMints.get(row.agentId) ?? null;
        return {
          rank: index + 1,
          id: row.agentId,
          handle: row.handle,
          label: row.displayName,
          avatarUrl: null,
          pnl: lamportsToUsd(parseLamports(row.realizedPnlLamports), solUsd),
          volume: lamportsToUsd(parseLamports(row.volumeLamports), solUsd),
          pnlLamports: row.realizedPnlLamports,
          volumeLamports: row.volumeLamports,
          winRateBps: row.winRateBps,
          closedCount: row.closedCount,
          numTrades: row.fillCount,
          topMint,
          topSymbol: topMint ? (symbols.get(topMint) ?? null) : null,
          source: "muse-confirmed" as const,
        };
      })
    : cashflowToLeaders(cashflow, topMints, symbols, solUsd);

  const payload: LeaderboardPayload = {
    window,
    capturedAt: Date.now(),
    muse: {
      source: "muse-confirmed",
      window,
      count: muse.length,
      entries: muse,
    },
    fomo: null,
    fomoUnavailable: null,
    directory: [],
  };
  if (leaderboardHasRows(payload)) {
    void writeProviderCache("cache", "leaderboard", `v1:${window}`, payload, DISCOVER_CACHE_MS);
  }
  return payload;
}

export async function runLeaderboard(window: LeaderboardWindow): Promise<LeaderboardPayload> {
  const key = `leaderboard:muse+fomo:${window}`;
  const peek = cachePeek<LeaderboardPayload>(key);
  if (peek?.value && leaderboardHasRows(peek.value)) {
    if (!peek.fresh) void refreshLeaderboardSafe(window);
    return peek.value;
  }
  void loadLeaderboard(window).then((payload) => {
    if (leaderboardHasRows(payload)) cacheSet(key, payload, DISCOVER_CACHE_MS);
  });
  return emptyLeaderboard(window);
}

export function discoverHasRows(payload: DiscoverPayload): boolean {
  return Boolean(
    payload.trending ||
      payload.robinhood ||
      payload.robinhoodChain ||
      payload.pons ||
      payload.museMostTraded ||
      payload.museMostHeld ||
      payload.museActivity ||
      payload.fomoTrending ||
      payload.fomoMostHeld,
  );
}
