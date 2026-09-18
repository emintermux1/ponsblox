import { PROVIDER_TTL_MS, SOL_MINT } from "@/lib/constants";
import { coalesce, memoryGet, memorySet, providerGetJson } from "@/lib/providers/runtime";
import { readProviderCache, writeProviderCache } from "@/lib/providers/store";
import {
  asRecord,
  finiteNumber,
  finiteString,
  type ProviderResult,
  type TokenMarketData,
} from "@/lib/providers/types";

const BASE = "https://public-api.birdeye.so";

function headers(): Record<string, string> | null {
  const key = process.env.BIRDEYE_API_KEY?.trim();
  if (!key) return null;
  return {
    "X-API-KEY": key,
    "x-chain": "solana",
  };
}

function wrap<T>(data: T): ProviderResult<T> {
  return { ok: true, data, source: "birdeye", updatedAt: Date.now(), stale: false };
}

function fail(status: number, code: string, message: string): ProviderResult<never> {
  return { ok: false, source: "birdeye", status, code, message };
}

export function mapBirdeyeOverview(raw: unknown, mint: string): TokenMarketData | null {
  const root = asRecord(raw);
  const data = asRecord(root?.data) ?? root;
  if (!data) return null;
  const address = finiteString(data.address) ?? mint;
  const price = finiteNumber(data.price);
  const symbol = finiteString(data.symbol);
  const name = finiteString(data.name);
  if (price == null && !symbol && !name) return null;
  return {
    mint: address,
    symbol,
    name,
    logo: finiteString(data.logoURI) ?? finiteString(data.logo),
    priceUsd: price,
    marketCap: finiteNumber(data.marketCap),
    liquidity: finiteNumber(data.liquidity),
    volume24h: finiteNumber(data.v24hUSD) ?? finiteNumber(data.volume24hUSD),
    priceChange24h: finiteNumber(data.priceChange24hPercent) ?? finiteNumber(data.priceChange24h),
    holderCount: finiteNumber(data.holder) ?? finiteNumber(data.holderCount),
    source: "birdeye",
    updatedAt: Date.now(),
    stale: false,
  };
}

export function mapBirdeyePrice(raw: unknown): number | null {
  const root = asRecord(raw);
  const data = asRecord(root?.data) ?? root;
  if (!data) return null;
  return finiteNumber(data.value) ?? finiteNumber(data.price);
}

export function mapBirdeyeMarketData(raw: unknown, mint: string): TokenMarketData | null {
  const root = asRecord(raw);
  const data = asRecord(root?.data) ?? root;
  if (!data) return null;
  const price = finiteNumber(data.price);
  if (price == null && finiteNumber(data.market_cap) == null && finiteNumber(data.liquidity) == null) {
    return null;
  }
  return {
    mint: finiteString(data.address) ?? mint,
    symbol: finiteString(data.symbol),
    name: finiteString(data.name),
    logo: finiteString(data.logo_uri) ?? finiteString(data.logoURI),
    priceUsd: price,
    marketCap: finiteNumber(data.market_cap) ?? finiteNumber(data.marketCap),
    liquidity: finiteNumber(data.liquidity),
    volume24h: finiteNumber(data.volume_24h_usd) ?? finiteNumber(data.v24hUSD),
    priceChange24h: finiteNumber(data.price_change_24h_percent),
    holderCount: finiteNumber(data.holder),
    source: "birdeye",
    updatedAt: Date.now(),
    stale: false,
  };
}

export type BirdeyeTrendingToken = {
  mint: string;
  symbol: string | null;
  name: string | null;
  logo: string | null;
  priceUsd: number | null;
  liquidity: number | null;
  volume24h: number | null;
  rank: number;
};

export function mapBirdeyeTrending(raw: unknown): BirdeyeTrendingToken[] {
  const root = asRecord(raw);
  const data = asRecord(root?.data);
  const list = Array.isArray(data?.tokens)
    ? data.tokens
    : Array.isArray(root?.tokens)
      ? root.tokens
      : Array.isArray(raw)
        ? raw
        : [];
  const out: BirdeyeTrendingToken[] = [];
  list.forEach((item, index) => {
    const row = asRecord(item);
    if (!row) return;
    const mint = finiteString(row.address);
    if (!mint) return;
    out.push({
      mint,
      symbol: finiteString(row.symbol),
      name: finiteString(row.name),
      logo: finiteString(row.logoURI) ?? finiteString(row.logo),
      priceUsd: finiteNumber(row.price),
      liquidity: finiteNumber(row.liquidity),
      volume24h: finiteNumber(row.volume24hUSD) ?? finiteNumber(row.v24hUSD),
      rank: finiteNumber(row.rank) ?? index + 1,
    });
  });
  return out;
}

export type BirdeyeWalletAnalytics = {
  wallet: string;
  totalUsd: number | null;
};

export function mapBirdeyeWallet(raw: unknown, wallet: string): BirdeyeWalletAnalytics | null {
  const root = asRecord(raw);
  const data = asRecord(root?.data) ?? root;
  if (!data) return null;
  const total =
    finiteNumber(data.totalUsd) ??
    finiteNumber(data.total_usd) ??
    finiteNumber(data.netWorth) ??
    finiteNumber(data.net_worth) ??
    finiteNumber(data.total);
  if (total == null) return null;
  return { wallet, totalUsd: total };
}

async function birdeyeGet<T>(resource: string, path: string): Promise<ProviderResult<T>> {
  const auth = headers();
  if (!auth) return fail(503, "missing_key", "BIRDEYE_API_KEY is not configured.");
  const cached = memoryGet<ProviderResult<T>>(`birdeye:${resource}`);
  if (cached) return cached;
  const dbHit = await readProviderCache<T>("birdeye", resource, resource);
  if (dbHit && !dbHit.stale) return { ok: true, data: dbHit.value, source: "birdeye", updatedAt: dbHit.updatedAt, stale: false };

  const result = await providerGetJson<T>({
    provider: "birdeye",
    resource,
    url: `${BASE}${path}`,
    headers: auth,
  });
  if (!result.ok) {
    if (dbHit) return { ok: true, data: dbHit.value, source: "birdeye", updatedAt: dbHit.updatedAt, stale: true };
    return fail(result.status, result.code, result.message);
  }
  const ok = wrap(result.data);
  const ttl =
    resource.startsWith("price:")
      ? PROVIDER_TTL_MS.tokenPrice
      : resource.startsWith("trend")
        ? PROVIDER_TTL_MS.trending
        : resource.startsWith("wallet")
          ? PROVIDER_TTL_MS.walletIdentity
          : PROVIDER_TTL_MS.tokenOverview;
  memorySet(`birdeye:${resource}`, ok, ttl);
  void writeProviderCache("birdeye", resource, resource, result.data, ttl);
  return ok;
}

export function getTokenOverview(mint: string): Promise<ProviderResult<TokenMarketData>> {
  return coalesce(`birdeye:overview:${mint}`, async () => {
    const result = await birdeyeGet<unknown>(`overview:${mint}`, `/defi/token_overview?address=${encodeURIComponent(mint)}`);
    if (!result.ok) return result;
    const mapped = mapBirdeyeOverview(result.data, mint);
    if (!mapped) return fail(502, "empty", "Birdeye overview had no market fields.");
    return { ...result, data: mapped };
  });
}

export function getTokenPrice(mint: string): Promise<ProviderResult<number>> {
  return coalesce(`birdeye:price:${mint}`, async () => {
    const result = await birdeyeGet<unknown>(`price:${mint}`, `/defi/price?address=${encodeURIComponent(mint)}`);
    if (!result.ok) return result;
    const price = mapBirdeyePrice(result.data);
    if (price == null) return fail(502, "empty", "Birdeye price missing.");
    return { ...result, data: price };
  });
}

export function getTokenMarketData(mint: string): Promise<ProviderResult<TokenMarketData>> {
  return coalesce(`birdeye:market:${mint}`, async () => {
    const result = await birdeyeGet<unknown>(
      `market:${mint}`,
      `/defi/v3/token/market-data?address=${encodeURIComponent(mint)}`,
    );
    if (!result.ok) return result;
    const mapped = mapBirdeyeMarketData(result.data, mint);
    if (!mapped) return fail(502, "empty", "Birdeye market-data had no fields.");
    return { ...result, data: mapped };
  });
}

export function getTrendingTokens(limit = 20): Promise<ProviderResult<BirdeyeTrendingToken[]>> {
  const capped = Math.min(Math.max(limit, 1), 20);
  return coalesce(`birdeye:trending:${capped}`, async () => {
    const result = await birdeyeGet<unknown>(
      `trending:${capped}`,
      `/defi/token_trending?sort_by=rank&sort_type=asc&offset=0&limit=${capped}`,
    );
    if (!result.ok) return result;
    const tokens = mapBirdeyeTrending(result.data);
    if (!tokens.length) return fail(502, "empty", "Birdeye trending was empty.");
    return { ...result, data: tokens };
  });
}

export function getWalletAnalytics(wallet: string): Promise<ProviderResult<BirdeyeWalletAnalytics>> {
  return coalesce(`birdeye:wallet:${wallet}`, async () => {
    const result = await birdeyeGet<unknown>(
      `wallet:${wallet}`,
      `/wallet/v2/current-net-worth?wallet=${encodeURIComponent(wallet)}&limit=20&sort_by=value&sort_type=desc`,
    );
    if (!result.ok) return result;
    const mapped = mapBirdeyeWallet(result.data, wallet);
    if (!mapped) return fail(502, "empty", "Birdeye wallet analytics missing.");
    return { ...result, data: mapped };
  });
}

export async function birdeyeSolUsd(): Promise<number | null> {
  const price = await getTokenPrice(SOL_MINT);
  return price.ok ? price.data : null;
}

export function birdeyeConfigured(): boolean {
  return Boolean(process.env.BIRDEYE_API_KEY?.trim());
}
