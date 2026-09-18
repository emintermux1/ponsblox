import { cachePublic } from "@/lib/cache";
import {
  HANDLE_RE,
  LIQUID_MINT_ALIASES,
  MINT_RE,
  SEARCH_CACHE_MS,
  SEARCH_LIMIT,
  SEARCH_MIN_CHARS,
} from "@/lib/constants";
import { searchAgents, searchTokenIndex, upsertTokenMeta } from "@/lib/db";
import { publicJson, raceTimeout } from "@/lib/fast-fetch";
import { looksLikeEvm, looksLikeMint, looksLikeTokenRef } from "@/lib/format";
import { knownTokenMarket, overlayKnownMarket } from "@/lib/known-mints";
import { isPinnedCa, pinnedTokenMarket, resolvePinnedQuery } from "@/lib/pinned-tokens";
import { pickUserAvatar, proxiedImage } from "@/lib/media";
import { birdeyeConfigured, getTokenOverview } from "@/lib/providers/birdeye";
import { providerGetJson } from "@/lib/providers/runtime";
import { asRecord, finiteNumber, finiteString } from "@/lib/providers/types";
import { traderByHandle } from "@/lib/services/social-data";
import {
  canonicalImageUrl,
  cleanTokenLabel,
  geckoIncludedLooks,
  preferLabel,
  type GeckoPoolBody,
} from "@/lib/token-logo";
import type { Agent, FomoScanUser, SearchPayload, TokenMarket } from "@/lib/types";

export const SEARCH_BUDGET_MS = 2_000;

const GECKO_SEARCH = "https://api.geckoterminal.com/api/v2/search/pools";
const COINGECKO_SEARCH = "https://api.coingecko.com/api/v3/onchain/search/pools";
const BIRDEYE_SEARCH = "https://public-api.birdeye.so/defi/v3/search";

export function emptySearch(q: string): SearchPayload {
  return { q, tokens: [], agents: [], fomo: null, token: null, trader: null };
}

export function looksLikeFomoIdentity(value: string): boolean {
  const clean = value.replace(/^@/, "").trim().toLowerCase();
  return HANDLE_RE.test(clean) && !MINT_RE.test(value.trim());
}

function blankMarket(mint: string, extra: Partial<TokenMarket> = {}): TokenMarket {
  return {
    mint,
    symbol: extra.symbol ?? null,
    name: extra.name ?? null,
    imageUrl: extra.imageUrl ?? null,
    priceUsd: extra.priceUsd ?? null,
    priceChange24h: extra.priceChange24h ?? null,
    volume24h: extra.volume24h ?? null,
    liquidityUsd: extra.liquidityUsd ?? null,
    marketCap: extra.marketCap ?? null,
    fdv: extra.fdv ?? null,
    pairAddress: extra.pairAddress ?? null,
    dexId: extra.dexId ?? null,
    decimals: extra.decimals ?? null,
    buys24h: extra.buys24h ?? null,
    sells24h: extra.sells24h ?? null,
    buyVolume24h: extra.buyVolume24h ?? null,
    sellVolume24h: extra.sellVolume24h ?? null,
    holderCount: extra.holderCount ?? null,
  };
}

function paintMarket(row: TokenMarket): TokenMarket {
  const known = overlayKnownMarket(row);
  return {
    ...known,
    symbol: preferLabel(known.symbol, row.symbol, known.mint),
    name: preferLabel(known.name, row.name, known.mint),
    imageUrl: canonicalImageUrl(known.imageUrl) ?? canonicalImageUrl(row.imageUrl),
  };
}

function mergeTokens(rows: Array<TokenMarket | null | undefined>, limit: number): TokenMarket[] {
  const byMint = new Map<string, TokenMarket>();
  for (const row of rows) {
    if (!row?.mint || !looksLikeTokenRef(row.mint)) continue;
    const next = paintMarket(row);
    const prev = byMint.get(next.mint);
    if (!prev) {
      byMint.set(next.mint, next);
      continue;
    }
    byMint.set(next.mint, {
      ...prev,
      symbol: preferLabel(prev.symbol, next.symbol, next.mint),
      name: preferLabel(prev.name, next.name, next.mint),
      imageUrl: canonicalImageUrl(prev.imageUrl) ?? canonicalImageUrl(next.imageUrl),
      priceUsd: prev.priceUsd ?? next.priceUsd,
      priceChange24h: prev.priceChange24h ?? next.priceChange24h,
      volume24h: prev.volume24h ?? next.volume24h,
      liquidityUsd: prev.liquidityUsd ?? next.liquidityUsd,
      marketCap: prev.marketCap ?? next.marketCap,
      fdv: prev.fdv ?? next.fdv,
      pairAddress: prev.pairAddress ?? next.pairAddress,
      dexId: prev.dexId ?? next.dexId,
      decimals: prev.decimals ?? next.decimals,
      buys24h: prev.buys24h ?? next.buys24h,
      sells24h: prev.sells24h ?? next.sells24h,
      holderCount: prev.holderCount ?? next.holderCount,
    });
  }
  return [...byMint.values()].slice(0, limit);
}

function scoreHit(row: TokenMarket, q: string, officialMint: string | null): number {
  const needle = q.replace(/^\$/, "").trim().toLowerCase();
  const symbol = row.symbol?.toLowerCase() ?? "";
  const name = row.name?.toLowerCase() ?? "";
  let score = 0;
  if (officialMint && row.mint.toLowerCase() === officialMint.toLowerCase()) score += 280;
  if (row.mint.toLowerCase() === q.trim().toLowerCase()) score += 200;
  if (needle.length >= 4 && row.mint.toLowerCase().includes(needle)) score += 200;
  if (symbol === needle) score += 120;
  if (name === needle) score += 100;
  if (symbol.startsWith(needle)) score += 40;
  if (name.startsWith(needle)) score += 30;
  if (symbol.includes(needle) || name.includes(needle)) score += 12;
  if (row.imageUrl) score += 16;
  if (row.name) score += 8;
  if (row.priceUsd != null) score += 6;
  if (row.volume24h) score += Math.min(24, Math.log10(row.volume24h + 1) * 4);
  return score;
}

function rankTokens(rows: TokenMarket[], q: string, officialMint: string | null, limit: number): TokenMarket[] {
  return [...rows]
    .filter((row) => row.symbol || row.name || row.imageUrl || row.priceUsd != null)
    .sort(
      (a, b) =>
        scoreHit(b, q, officialMint) - scoreHit(a, q, officialMint) || (b.volume24h ?? 0) - (a.volume24h ?? 0),
    )
    .slice(0, limit);
}

function publicAgent(agent: Agent): SearchPayload["agents"][number] {
  return {
    id: agent.id,
    handle: agent.handle,
    displayName: agent.displayName,
    status: agent.status,
  };
}

function decorateFomo(user: FomoScanUser | null): SearchPayload["fomo"] {
  if (!user) return null;
  return {
    ...user,
    source: "fomoscan",
    profilePicture: proxiedImage(pickUserAvatar(user) ?? user.profilePicture),
  };
}

export function mapGeckoSearchHits(body: GeckoPoolBody | null | undefined): TokenMarket[] {
  const looks = geckoIncludedLooks(body);
  const out: TokenMarket[] = [];
  for (const pool of body?.data ?? []) {
    const tokenId = pool.relationships?.base_token?.data?.id ?? "";
    const mint = tokenId.includes("_") ? (tokenId.split("_").pop() ?? "") : tokenId;
    if (!looksLikeTokenRef(mint)) continue;
    const look = looks.get(mint) ?? looks.get(tokenId);
    const poolSymbol = pool.attributes?.name?.split(" / ")[0] ?? pool.attributes?.name ?? null;
    const price = Number(pool.attributes?.base_token_price_usd ?? NaN);
    const volume = Number(pool.attributes?.volume_usd?.h24 ?? NaN);
    const marketCap = Number(pool.attributes?.market_cap_usd ?? NaN);
    const change = Number(pool.attributes?.price_change_percentage?.h24 ?? NaN);
    out.push(
      blankMarket(mint, {
        symbol: look?.symbol ?? cleanTokenLabel(poolSymbol, mint),
        name: look?.name ?? look?.symbol ?? cleanTokenLabel(poolSymbol, mint),
        imageUrl: look?.imageUrl ?? null,
        priceUsd: Number.isFinite(price) ? price : null,
        volume24h: Number.isFinite(volume) ? volume : null,
        marketCap: Number.isFinite(marketCap) ? marketCap : null,
        priceChange24h: Number.isFinite(change) ? change : null,
        pairAddress: pool.attributes?.address ?? null,
      }),
    );
  }
  return out;
}

export function mapBirdeyeSearchHits(raw: unknown): TokenMarket[] {
  const root = asRecord(raw);
  const data = asRecord(root?.data) ?? root;
  const groups = Array.isArray(data?.items)
    ? data.items
    : Array.isArray(root?.items)
      ? root.items
      : Array.isArray(data?.tokens)
        ? [{ type: "token", result: data.tokens }]
        : [];
  const out: TokenMarket[] = [];
  for (const group of groups) {
    const row = asRecord(group);
    if (!row) continue;
    const kind = finiteString(row.type) ?? "token";
    if (kind !== "token") continue;
    const results = Array.isArray(row.result) ? row.result : Array.isArray(group) ? group : [];
    for (const item of results) {
      const token = asRecord(item);
      if (!token) continue;
      const mint = finiteString(token.address) ?? finiteString(token.mint);
      if (!mint || !looksLikeTokenRef(mint)) continue;
      const network = finiteString(token.network) ?? finiteString(token.chain);
      if (network && network !== "solana") continue;
      out.push(
        blankMarket(mint, {
          symbol: cleanTokenLabel(finiteString(token.symbol), mint),
          name: cleanTokenLabel(finiteString(token.name), mint),
          imageUrl: canonicalImageUrl(
            finiteString(token.logo_uri) ?? finiteString(token.logoURI) ?? finiteString(token.logo),
          ),
          priceUsd: finiteNumber(token.price),
          priceChange24h: finiteNumber(token.price_change_24h_percent) ?? finiteNumber(token.priceChange24h),
          volume24h: finiteNumber(token.volume_24h_usd) ?? finiteNumber(token.volume24hUSD),
          liquidityUsd: finiteNumber(token.liquidity),
          marketCap: finiteNumber(token.market_cap) ?? finiteNumber(token.marketCap),
          fdv: finiteNumber(token.fdv),
          decimals: finiteNumber(token.decimals),
          buys24h: finiteNumber(token.buy_24h),
          sells24h: finiteNumber(token.sell_24h),
        }),
      );
    }
  }
  return out;
}

function mapGeckoToken(mint: string, raw: unknown): TokenMarket | null {
  const data = asRecord(asRecord(raw)?.data);
  const attrs = asRecord(data?.attributes);
  if (!attrs) return null;
  const address = finiteString(attrs.address) ?? mint;
  if (!looksLikeTokenRef(address)) return null;
  const symbol = cleanTokenLabel(finiteString(attrs.symbol), address);
  const name = cleanTokenLabel(finiteString(attrs.name), address);
  const imageUrl = canonicalImageUrl(finiteString(attrs.image_url));
  const priceUsd = finiteNumber(attrs.price_usd);
  if (!symbol && !name && !imageUrl && priceUsd == null) return null;
  const volume = asRecord(attrs.volume_usd);
  return blankMarket(address, {
    symbol,
    name,
    imageUrl,
    priceUsd,
    marketCap: finiteNumber(attrs.market_cap_usd),
    volume24h: finiteNumber(volume?.h24) ?? finiteNumber(attrs.volume_usd),
  });
}

async function searchGecko(query: string): Promise<TokenMarket[]> {
  const qs = `query=${encodeURIComponent(query)}&network=solana&include=base_token`;
  const [gecko, coin] = await Promise.all([
    publicJson<GeckoPoolBody>(`${GECKO_SEARCH}?${qs}`, SEARCH_BUDGET_MS),
    publicJson<GeckoPoolBody>(`${COINGECKO_SEARCH}?${qs}`, SEARCH_BUDGET_MS),
  ]);
  return mergeTokens([...mapGeckoSearchHits(gecko), ...mapGeckoSearchHits(coin)], SEARCH_LIMIT * 2);
}

async function geckoTokenHit(mint: string): Promise<TokenMarket | null> {
  const network = looksLikeEvm(mint) ? "robinhood" : "solana";
  const body = await publicJson<unknown>(
    `https://api.geckoterminal.com/api/v2/networks/${network}/tokens/${mint}`,
    SEARCH_BUDGET_MS,
  );
  return mapGeckoToken(mint, body);
}

async function searchBirdeye(query: string): Promise<TokenMarket[]> {
  if (!birdeyeConfigured()) return [];
  const key = process.env.BIRDEYE_API_KEY?.trim();
  if (!key) return [];
  const params = new URLSearchParams({
    chain: "solana",
    keyword: query,
    target: "token",
    search_mode: "fuzzy",
    search_by: looksLikeMint(query) ? "address" : "combination",
    sort_by: "volume_24h_usd",
    sort_type: "desc",
    offset: "0",
    limit: String(SEARCH_LIMIT),
  });
  const result = await providerGetJson<unknown>({
    provider: "birdeye",
    resource: `search:${query.toLowerCase()}`,
    url: `${BIRDEYE_SEARCH}?${params.toString()}`,
    headers: { "X-API-KEY": key, "x-chain": "solana" },
    timeoutMs: SEARCH_BUDGET_MS,
  });
  if (!result.ok) return [];
  return mapBirdeyeSearchHits(result.data);
}

async function birdeyeMintHit(mint: string): Promise<TokenMarket | null> {
  if (!birdeyeConfigured()) return null;
  const result = await getTokenOverview(mint);
  if (!result.ok) return null;
  const row = result.data;
  if (!row.symbol && !row.name && !row.logo && row.priceUsd == null) return null;
  return blankMarket(mint, {
    symbol: cleanTokenLabel(row.symbol, mint),
    name: cleanTokenLabel(row.name, mint),
    imageUrl: canonicalImageUrl(row.logo),
    priceUsd: row.priceUsd,
    priceChange24h: row.priceChange24h,
    volume24h: row.volume24h,
    liquidityUsd: row.liquidity,
    marketCap: row.marketCap,
    holderCount: row.holderCount,
  });
}

async function rememberMarkets(markets: TokenMarket[]) {
  await Promise.all(
    markets.slice(0, SEARCH_LIMIT).map((market) =>
      upsertTokenMeta({
        mint: market.mint,
        symbol: market.symbol,
        name: market.name,
        imageUrl: market.imageUrl,
      }).catch(() => undefined),
    ),
  );
}

async function loadSearch(q: string): Promise<SearchPayload> {
  const query = q.replace(/^\$/, "").trim();
  const identity = query.replace(/^@/, "").trim();
  const mintQuery = looksLikeTokenRef(query);
  const handleQuery = looksLikeFomoIdentity(identity);
  const officialMint =
    LIQUID_MINT_ALIASES[query.toLowerCase()] ??
    LIQUID_MINT_ALIASES[identity.toLowerCase()] ??
    resolvePinnedQuery(query);
  const seedMint = officialMint ?? (mintQuery ? query : null);
  const pinned = officialMint && isPinnedCa(officialMint) ? pinnedTokenMarket() : null;

  const [agents, indexed, geckoHits, birdHits, seedGecko, seedBird, fomo] = await Promise.all([
    raceTimeout(searchAgents(identity || query, SEARCH_LIMIT).catch(() => []), [], SEARCH_BUDGET_MS),
    raceTimeout(searchTokenIndex(query, SEARCH_LIMIT).catch(() => []), [], SEARCH_BUDGET_MS),
    raceTimeout(searchGecko(query).catch(() => []), [], SEARCH_BUDGET_MS),
    raceTimeout(searchBirdeye(query).catch(() => []), [], SEARCH_BUDGET_MS),
    seedMint ? raceTimeout(geckoTokenHit(seedMint).catch(() => null), null, SEARCH_BUDGET_MS) : Promise.resolve(null),
    seedMint && looksLikeMint(seedMint) && !looksLikeEvm(seedMint)
      ? raceTimeout(birdeyeMintHit(seedMint).catch(() => null), null, SEARCH_BUDGET_MS)
      : Promise.resolve(null),
    handleQuery
      ? raceTimeout(
          traderByHandle(identity)
            .then((result) => (result.ok ? result.data : null))
            .catch(() => null),
          null,
          SEARCH_BUDGET_MS,
        )
      : Promise.resolve(null),
  ]);

  const fromIndex: TokenMarket[] = indexed.map((row) =>
    blankMarket(row.mint, {
      symbol: cleanTokenLabel(row.symbol, row.mint),
      name: cleanTokenLabel(row.name, row.mint),
      imageUrl: canonicalImageUrl(row.imageUrl),
    }),
  );

  const official = officialMint ? knownTokenMarket(officialMint) : null;
  const tokens = rankTokens(
    mergeTokens([pinned, official, seedGecko, seedBird, ...birdHits, ...geckoHits, ...fromIndex], SEARCH_LIMIT * 3),
    query,
    officialMint,
    SEARCH_LIMIT,
  );
  void rememberMarkets(tokens);

  const fomoUser = decorateFomo(fomo);
  return {
    q,
    tokens,
    agents: agents.map(publicAgent),
    fomo: fomoUser,
    token: tokens[0] ?? null,
    trader: fomoUser,
  };
}

export async function runSearch(raw: string): Promise<SearchPayload> {
  const q = raw.trim();
  if (q.length < SEARCH_MIN_CHARS) return emptySearch(q);
  return cachePublic(
    `search:v5:${q.toLowerCase()}`,
    SEARCH_CACHE_MS,
    () => loadSearch(q),
    emptySearch(q),
    (value) => value.tokens.length > 0 || value.agents.length > 0 || value.fomo != null,
    SEARCH_BUDGET_MS,
  );
}
