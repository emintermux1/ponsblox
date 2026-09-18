import { cacheSWR } from "@/lib/cache";
import { finitePrice, publicJson, raceTimeout } from "@/lib/fast-fetch";
import { looksLikeEvm } from "@/lib/format";
import { asHttpsLogo, cleanTokenLabel } from "@/lib/token-logo";
import type { DiscoverPayload, DiscoverSection, DiscoverTokenRow, TokenMarket } from "@/lib/types";

/**
 * Muse FOMO on Robinhood Chain (4663).
 * Identity from Blockscout + GeckoTerminal — not invented.
 */
export const MUSE_FOMO_CA = "0x9334fa99b080747426f526b15733d767e5e3cd5f";
export const MUSE_FOMO_PAIR = "0x01348432b0bfabd686043bcfdd523ae40baf3674";
export const MUSE_FOMO_SYMBOL = "Muse FOMO";
export const MUSE_FOMO_NAME = "Muse Fomo";
export const MUSE_FOMO_LOGO = "https://assets.geckoterminal.com/gsdq56gnp423o551isavp69zk583";
export const MUSE_FOMO_CHAIN = "robinhood" as const;
export const MUSE_FOMO_CHAIN_TAG = "Robinhood Chain";
export const MUSE_FOMO_GECKO_NETWORK = "robinhood";

const RAIL_CACHE_MS = 45_000;
const QUOTE_MS = 2_000;

export const PINNED_CA_ALIASES: Record<string, string> = {
  [MUSE_FOMO_CA]: MUSE_FOMO_CA,
  "muse fomo": MUSE_FOMO_CA,
  musefomo: MUSE_FOMO_CA,
  muse_fomo: MUSE_FOMO_CA,
};

type GeckoTokenBody = {
  data?: {
    attributes?: {
      address?: string;
      name?: string;
      symbol?: string;
      image_url?: string;
      decimals?: number;
      price_usd?: string;
      fdv_usd?: string;
      market_cap_usd?: string;
      volume_usd?: { h24?: string | null };
    };
  };
};

type GeckoPoolList = {
  data?: Array<{
    attributes?: {
      address?: string;
      name?: string;
      base_token_price_usd?: string;
      market_cap_usd?: string;
      fdv_usd?: string;
      reserve_in_usd?: string;
      volume_usd?: { h24?: string };
      price_change_percentage?: { h24?: string };
    };
  }>;
};

export function normalizeEvm(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isPinnedCa(raw: string): boolean {
  return looksLikeEvm(raw) && normalizeEvm(raw) === MUSE_FOMO_CA;
}

export function pinnedTokenHref(mint = MUSE_FOMO_CA): string {
  return `/token/${normalizeEvm(mint)}`;
}

export function resolvePinnedQuery(raw: string): string | null {
  const needle = raw.replace(/^\$/, "").trim().toLowerCase();
  if (!needle) return null;
  if (PINNED_CA_ALIASES[needle]) return PINNED_CA_ALIASES[needle];
  if (looksLikeEvm(needle)) return normalizeEvm(needle);
  if (needle.length >= 4 && MUSE_FOMO_CA.includes(needle)) return MUSE_FOMO_CA;
  const symbol = MUSE_FOMO_SYMBOL.toLowerCase();
  const name = MUSE_FOMO_NAME.toLowerCase();
  if (needle === symbol || needle === name) return MUSE_FOMO_CA;
  if (needle.length >= 6 && (symbol.startsWith(needle) || name.startsWith(needle))) return MUSE_FOMO_CA;
  return null;
}

export function pinnedTokenMarket(quote?: Partial<TokenMarket>): TokenMarket {
  return {
    mint: MUSE_FOMO_CA,
    symbol: MUSE_FOMO_SYMBOL,
    name: MUSE_FOMO_NAME,
    imageUrl: MUSE_FOMO_LOGO,
    priceUsd: quote?.priceUsd ?? null,
    priceChange24h: quote?.priceChange24h ?? null,
    volume24h: quote?.volume24h ?? null,
    liquidityUsd: quote?.liquidityUsd ?? null,
    marketCap: quote?.marketCap ?? null,
    fdv: quote?.fdv ?? null,
    pairAddress: quote?.pairAddress ?? MUSE_FOMO_PAIR,
    dexId: quote?.dexId ?? "pons-v2",
    decimals: quote?.decimals ?? 18,
    buys24h: quote?.buys24h ?? null,
    sells24h: quote?.sells24h ?? null,
    buyVolume24h: quote?.buyVolume24h ?? null,
    sellVolume24h: quote?.sellVolume24h ?? null,
    holderCount: quote?.holderCount ?? null,
    chain: MUSE_FOMO_CHAIN,
  };
}

export function pinnedDiscoverRow(rank = 1, quote?: Partial<DiscoverTokenRow>): DiscoverTokenRow {
  return {
    rank,
    mint: MUSE_FOMO_CA,
    symbol: MUSE_FOMO_SYMBOL,
    name: MUSE_FOMO_NAME,
    imageUrl: asHttpsLogo(quote?.imageUrl) ?? MUSE_FOMO_LOGO,
    priceUsd: quote?.priceUsd ?? null,
    volumeUsd: quote?.volumeUsd ?? null,
    volumeLamports: null,
    marketCap: quote?.marketCap ?? null,
    priceChange24h: quote?.priceChange24h ?? null,
    holders: quote?.holders ?? null,
    trades: quote?.trades ?? null,
    pairAddress: quote?.pairAddress ?? MUSE_FOMO_PAIR,
    chain: MUSE_FOMO_CHAIN,
    chainTag: MUSE_FOMO_CHAIN_TAG,
    href: pinnedTokenHref(),
    source: "market",
  };
}

export function mergePinnedQuote(base: DiscoverTokenRow, live: DiscoverTokenRow | null | undefined): DiscoverTokenRow {
  if (!live) return base;
  return {
    ...base,
    symbol: cleanTokenLabel(live.symbol, live.mint) ?? base.symbol,
    name: cleanTokenLabel(live.name, live.mint) ?? base.name,
    imageUrl: asHttpsLogo(live.imageUrl) ?? base.imageUrl,
    priceUsd: live.priceUsd ?? base.priceUsd,
    volumeUsd: live.volumeUsd ?? base.volumeUsd,
    marketCap: live.marketCap ?? base.marketCap,
    priceChange24h: live.priceChange24h ?? base.priceChange24h,
    holders: live.holders ?? base.holders,
    pairAddress: live.pairAddress ?? base.pairAddress,
    chain: "robinhood",
    chainTag: live.chainTag ?? base.chainTag ?? MUSE_FOMO_CHAIN_TAG,
    href: pinnedTokenHref(),
  };
}

export function pinRowsFirst(rows: DiscoverTokenRow[]): DiscoverTokenRow[] {
  const existing = rows.find((row) => normalizeEvm(row.mint) === MUSE_FOMO_CA) ?? null;
  const pinned = mergePinnedQuote(pinnedDiscoverRow(1), existing);
  const rest = rows.filter((row) => normalizeEvm(row.mint) !== MUSE_FOMO_CA);
  return [pinned, ...rest].map((row, index) => ({ ...row, rank: index + 1 }));
}

function featuredSection(items: DiscoverTokenRow[]): DiscoverSection<DiscoverTokenRow[]> {
  return { source: "market", label: "Pinned", items };
}

function chainSection(items: DiscoverTokenRow[]): DiscoverSection<DiscoverTokenRow[]> {
  return { source: "market", label: "Robinhood Chain", items };
}

export function pinDiscoverPayload(
  payload: DiscoverPayload,
  live?: DiscoverTokenRow | null,
): DiscoverPayload {
  const cachedFeatured = payload.featured?.items?.[0] ?? null;
  const featured = mergePinnedQuote(pinnedDiscoverRow(1), live ?? cachedFeatured);
  const chainItems = payload.robinhoodChain?.items?.length
    ? pinRowsFirst(payload.robinhoodChain.items)
    : [featured];
  return {
    ...payload,
    featured: featuredSection([featured]),
    robinhoodChain: chainSection(chainItems),
  };
}

export function homeRailRows(memes: DiscoverTokenRow[]): DiscoverTokenRow[] {
  const rest = memes.filter((row) => normalizeEvm(row.mint) !== MUSE_FOMO_CA);
  return [pinnedDiscoverRow(1), ...rest].map((row, index) => ({ ...row, rank: index + 1 }));
}

export async function fetchGeckoRobinhoodToken(address = MUSE_FOMO_CA): Promise<DiscoverTokenRow | null> {
  if (!looksLikeEvm(address)) return null;
  const ca = normalizeEvm(address);
  const [token, pools] = await Promise.all([
    publicJson<GeckoTokenBody>(
      `https://api.geckoterminal.com/api/v2/networks/${MUSE_FOMO_GECKO_NETWORK}/tokens/${ca}`,
      QUOTE_MS,
    ),
    publicJson<GeckoPoolList>(
      `https://api.geckoterminal.com/api/v2/networks/${MUSE_FOMO_GECKO_NETWORK}/tokens/${ca}/pools`,
      QUOTE_MS,
    ),
  ]);
  const attrs = token?.data?.attributes;
  const pool = pools?.data?.[0]?.attributes;
  const symbol = cleanTokenLabel(attrs?.symbol, ca);
  const name = cleanTokenLabel(attrs?.name, ca);
  if (!symbol && !name) return null;
  return pinnedDiscoverRow(1, {
    symbol,
    name,
    imageUrl: asHttpsLogo(attrs?.image_url),
    priceUsd: finitePrice(attrs?.price_usd) ?? finitePrice(pool?.base_token_price_usd),
    volumeUsd: finitePrice(attrs?.volume_usd?.h24) ?? finitePrice(pool?.volume_usd?.h24),
    marketCap: finitePrice(attrs?.market_cap_usd) ?? finitePrice(pool?.market_cap_usd) ?? finitePrice(attrs?.fdv_usd),
    priceChange24h: finitePrice(pool?.price_change_percentage?.h24),
    pairAddress: pool?.address ?? MUSE_FOMO_PAIR,
  });
}

export async function loadPinnedRail(): Promise<DiscoverTokenRow[]> {
  return cacheSWR(
    "discover:pinned:v1",
    RAIL_CACHE_MS,
    async () => {
      const live = await raceTimeout(fetchGeckoRobinhoodToken(), null, QUOTE_MS);
      return [mergePinnedQuote(pinnedDiscoverRow(1), live)];
    },
    (rows) => rows.some((row) => isPinnedCa(row.mint)),
  );
}

export async function loadGeckoRobinhoodMarket(address = MUSE_FOMO_CA): Promise<TokenMarket> {
  const fallback = pinnedTokenMarket();
  const live = await raceTimeout(fetchGeckoRobinhoodToken(address), null, QUOTE_MS);
  if (!live) return fallback;
  return pinnedTokenMarket({
    symbol: live.symbol,
    name: live.name,
    imageUrl: live.imageUrl,
    priceUsd: live.priceUsd,
    priceChange24h: live.priceChange24h,
    volume24h: live.volumeUsd,
    liquidityUsd: null,
    marketCap: live.marketCap,
    fdv: live.marketCap,
    pairAddress: live.pairAddress,
  });
}
