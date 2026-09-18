export type ProviderId =
  | "birdeye"
  | "solscan"
  | "helius"
  | "fomoscan"
  | "dflow"
  | "dexscreener"
  | "geckoterminal"
  | "coingecko"
  | "gmgn"
  | "pump"
  | "cache";

export type TokenMarketData = {
  mint: string;
  symbol: string | null;
  name: string | null;
  logo: string | null;
  priceUsd: number | null;
  marketCap: number | null;
  liquidity: number | null;
  volume24h: number | null;
  priceChange24h: number | null;
  holderCount: number | null;
  source: ProviderId;
  updatedAt: number;
  stale: boolean;
};

export type TraderIdentity = {
  id: string;
  handle: string | null;
  displayName: string | null;
  avatar: string | null;
  source: ProviderId;
};

export type ProviderResult<T> =
  | { ok: true; data: T; source: ProviderId; updatedAt: number; stale: boolean }
  | { ok: false; source: ProviderId; status: number; code: string; message: string };

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function finiteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

export function finiteString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function emptyTokenMarket(mint: string, source: ProviderId = "cache"): TokenMarketData {
  return {
    mint,
    symbol: null,
    name: null,
    logo: null,
    priceUsd: null,
    marketCap: null,
    liquidity: null,
    volume24h: null,
    priceChange24h: null,
    holderCount: null,
    source,
    updatedAt: Date.now(),
    stale: false,
  };
}

export function hasMarketSignal(row: TokenMarketData): boolean {
  return (
    row.priceUsd != null ||
    row.marketCap != null ||
    row.liquidity != null ||
    row.volume24h != null ||
    Boolean(row.symbol) ||
    Boolean(row.name)
  );
}

export function mergeTokenMarket(base: TokenMarketData, extra: TokenMarketData | null): TokenMarketData {
  if (!extra) return base;
  return {
    mint: extra.mint || base.mint,
    symbol: extra.symbol ?? base.symbol,
    name: extra.name ?? base.name,
    logo: extra.logo ?? base.logo,
    priceUsd: extra.priceUsd ?? base.priceUsd,
    marketCap: extra.marketCap ?? base.marketCap,
    liquidity: extra.liquidity ?? base.liquidity,
    volume24h: extra.volume24h ?? base.volume24h,
    priceChange24h: extra.priceChange24h ?? base.priceChange24h,
    holderCount: extra.holderCount ?? base.holderCount,
    source: extra.priceUsd != null || extra.marketCap != null ? extra.source : base.source,
    updatedAt: Math.max(base.updatedAt, extra.updatedAt),
    stale: extra.stale && base.stale,
  };
}
