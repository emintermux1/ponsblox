import { FOMO_BUDGET_MS, PROVIDER_TTL_MS } from "@/lib/constants";
import { assertNever } from "@/lib/never";
import { coalesce, memoryGet, memorySet, providerGetJson } from "@/lib/providers/runtime";
import { readProviderCache, writeProviderCache } from "@/lib/providers/store";
import {
  asRecord,
  finiteNumber,
  finiteString,
  type ProviderResult,
  type TokenMarketData,
} from "@/lib/providers/types";
import type { Candle, ChartTimeframe } from "@/lib/types";

/** Official GMGN OpenAPI — the HTTP `gmgn-cli` wraps (`https://www.npmjs.com/package/gmgn-cli`). */
const BASE = "https://openapi.gmgn.ai";
const CHAIN = "sol";
const TIMEOUT_MS = FOMO_BUDGET_MS;

export type GmgnTrendingToken = {
  mint: string;
  symbol: string | null;
  name: string | null;
  logo: string | null;
  priceUsd: number | null;
  liquidity: number | null;
  volume24h: number | null;
  marketCap: number | null;
  priceChange24h: number | null;
  holderCount: number | null;
  pairAddress: string | null;
  rank: number;
};

export type GmgnPairHit = {
  pairAddress: string;
  liquidity: number;
  symbol: string | null;
  name: string | null;
  imageUrl: string | null;
  priceUsd: number | null;
  priceChange24h: number | null;
  volume24h: number | null;
  marketCap: number | null;
  dexId: string | null;
};

export type GmgnKlineWindow = {
  resolution: "1m" | "5m" | "15m" | "1h" | "4h";
  lookbackSec: number;
};

function wrap<T>(data: T): ProviderResult<T> {
  return { ok: true, data, source: "gmgn", updatedAt: Date.now(), stale: false };
}

function fail(status: number, code: string, message: string): ProviderResult<never> {
  return { ok: false, source: "gmgn", status, code, message };
}

function headers(): Record<string, string> | null {
  const key = process.env.GMGN_API_KEY?.trim();
  if (!key) return null;
  return { "x-api-key": key };
}

export function gmgnConfigured(): boolean {
  return Boolean(process.env.GMGN_API_KEY?.trim());
}

export function gmgnKlineWindow(timeframe: ChartTimeframe): GmgnKlineWindow {
  switch (timeframe) {
    case "1H":
      return { resolution: "1m", lookbackSec: 60 * 60 };
    case "4H":
      return { resolution: "5m", lookbackSec: 4 * 60 * 60 };
    case "1D":
      return { resolution: "15m", lookbackSec: 24 * 60 * 60 };
    case "7D":
      return { resolution: "1h", lookbackSec: 7 * 24 * 60 * 60 };
    case "1M":
      return { resolution: "4h", lookbackSec: 30 * 24 * 60 * 60 };
    default:
      return assertNever(timeframe, "timeframe");
  }
}

function unwrapData(raw: unknown): Record<string, unknown> | null {
  const root = asRecord(raw);
  if (!root) return null;
  const data = asRecord(root.data);
  return data ?? root;
}

function listFrom(raw: unknown, keys: string[]): unknown[] {
  if (Array.isArray(raw)) return raw;
  const root = asRecord(raw);
  if (!root) return [];
  const data = asRecord(root.data) ?? root;
  for (const key of keys) {
    const value = data[key];
    if (Array.isArray(value)) return value;
  }
  if (Array.isArray(root.data)) return root.data;
  return [];
}

function priceObject(value: unknown): Record<string, unknown> | null {
  return asRecord(value);
}

function tokenPriceUsd(data: Record<string, unknown>): number | null {
  const nested = priceObject(data.price);
  return finiteNumber(nested?.price) ?? finiteNumber(data.price);
}

function tokenVolume24h(data: Record<string, unknown>): number | null {
  const nested = priceObject(data.price);
  return (
    finiteNumber(nested?.volume_24h) ??
    finiteNumber(nested?.volume24h) ??
    finiteNumber(data.volume) ??
    finiteNumber(data.volume_24h)
  );
}

function tokenChange24h(data: Record<string, unknown>): number | null {
  const nested = priceObject(data.price);
  const direct =
    finiteNumber(data.price_change_percent) ??
    finiteNumber(data.price_change_percent1h) ??
    finiteNumber(nested?.price_change_percent);
  if (direct != null) return direct;
  const current = finiteNumber(nested?.price);
  const start = finiteNumber(nested?.price_24h);
  if (current == null || start == null || start === 0) return null;
  return ((current - start) / start) * 100;
}

function tokenMarketCap(data: Record<string, unknown>, priceUsd: number | null): number | null {
  const direct = finiteNumber(data.market_cap) ?? finiteNumber(data.marketCap);
  if (direct != null) return direct;
  const supply = finiteNumber(data.circulating_supply) ?? finiteNumber(data.total_supply);
  if (priceUsd == null || supply == null) return null;
  return priceUsd * supply;
}

function poolAddress(data: Record<string, unknown>): string | null {
  const pool = asRecord(data.pool);
  return (
    finiteString(data.biggest_pool_address) ??
    finiteString(data.migrated_pool) ??
    finiteString(pool?.pool_address) ??
    finiteString(data.pool_address)
  );
}

export function mapGmgnTokenInfo(raw: unknown, mint: string): TokenMarketData | null {
  const data = unwrapData(raw);
  const token = data ? (asRecord(data.token) ?? data) : null;
  if (!token) return null;
  const address = finiteString(token.address) ?? mint;
  const symbol = finiteString(token.symbol);
  const name = finiteString(token.name);
  const priceUsd = tokenPriceUsd(token);
  if (priceUsd == null && !symbol && !name) return null;
  const pool = asRecord(token.pool);
  return {
    mint: address,
    symbol,
    name,
    logo: finiteString(token.logo) ?? finiteString(token.logo_url),
    priceUsd,
    marketCap: tokenMarketCap(token, priceUsd),
    liquidity: finiteNumber(token.liquidity) ?? finiteNumber(pool?.liquidity),
    volume24h: tokenVolume24h(token),
    priceChange24h: tokenChange24h(token),
    holderCount: finiteNumber(token.holder_count) ?? finiteNumber(asRecord(token.stat)?.holder_count),
    source: "gmgn",
    updatedAt: Date.now(),
    stale: false,
  };
}

export function mapGmgnPair(raw: unknown): GmgnPairHit | null {
  const data = unwrapData(raw);
  const token = data ? (asRecord(data.token) ?? data) : null;
  if (!token) return null;
  const pairAddress = poolAddress(token);
  if (!pairAddress) return null;
  const priceUsd = tokenPriceUsd(token);
  const pool = asRecord(token.pool);
  return {
    pairAddress,
    liquidity: finiteNumber(token.liquidity) ?? finiteNumber(pool?.liquidity) ?? 0,
    symbol: finiteString(token.symbol),
    name: finiteString(token.name),
    imageUrl: finiteString(token.logo),
    priceUsd,
    priceChange24h: tokenChange24h(token),
    volume24h: tokenVolume24h(token),
    marketCap: tokenMarketCap(token, priceUsd),
    dexId: finiteString(pool?.exchange) ?? finiteString(token.exchange),
  };
}

export function mapGmgnTrending(raw: unknown): GmgnTrendingToken[] {
  const out: GmgnTrendingToken[] = [];
  listFrom(raw, ["rank", "list", "tokens"]).forEach((item, index) => {
    const row = asRecord(item);
    if (!row) return;
    const mint = finiteString(row.address) ?? finiteString(row.token_address);
    if (!mint) return;
    out.push({
      mint,
      symbol: finiteString(row.symbol),
      name: finiteString(row.name),
      logo: finiteString(row.logo),
      priceUsd: finiteNumber(row.price),
      liquidity: finiteNumber(row.liquidity),
      volume24h: finiteNumber(row.volume),
      marketCap: finiteNumber(row.market_cap),
      priceChange24h:
        finiteNumber(row.price_change_percent) ?? finiteNumber(row.price_change_percent1h),
      holderCount: finiteNumber(row.holder_count),
      pairAddress: finiteString(row.biggest_pool_address) ?? finiteString(row.pool_address),
      rank: finiteNumber(row.rank) ?? index + 1,
    });
  });
  return out;
}

export function mapGmgnKline(raw: unknown): Candle[] {
  const rows = listFrom(raw, ["list", "kline"]);
  return rows
    .map((item) => {
      const row = asRecord(item);
      if (!row) return null;
      const time = finiteNumber(row.time) ?? finiteNumber(row.t);
      const open = finiteNumber(row.open) ?? finiteNumber(row.o);
      const high = finiteNumber(row.high) ?? finiteNumber(row.h);
      const low = finiteNumber(row.low) ?? finiteNumber(row.l);
      const close = finiteNumber(row.close) ?? finiteNumber(row.c);
      if (time == null || close == null || open == null || high == null || low == null) return null;
      return {
        time: time > 1e12 ? Math.floor(time / 1000) : time,
        open,
        high,
        low,
        close,
      };
    })
    .filter((row): row is Candle => row != null)
    .sort((a, b) => a.time - b.time);
}

async function gmgnGet<T>(resource: string, path: string, ttlMs: number): Promise<ProviderResult<T>> {
  const auth = headers();
  if (!auth) return fail(503, "missing_key", "GMGN_API_KEY is not configured.");
  const cached = memoryGet<ProviderResult<T>>(`gmgn:${resource}`);
  if (cached) return cached;
  const dbHit = await readProviderCache<T>("gmgn", resource, resource);
  if (dbHit && !dbHit.stale) {
    return { ok: true, data: dbHit.value, source: "gmgn", updatedAt: dbHit.updatedAt, stale: false };
  }
  const result = await providerGetJson<T>({
    provider: "gmgn",
    resource,
    url: `${BASE}${path}`,
    headers: auth,
    timeoutMs: TIMEOUT_MS,
  });
  if (!result.ok) {
    if (dbHit) return { ok: true, data: dbHit.value, source: "gmgn", updatedAt: dbHit.updatedAt, stale: true };
    return fail(result.status, result.code, result.message);
  }
  const ok = wrap(result.data);
  memorySet(`gmgn:${resource}`, ok, ttlMs);
  void writeProviderCache("gmgn", resource, resource, result.data, ttlMs);
  return ok;
}

export function getTokenInfo(mint: string): Promise<ProviderResult<TokenMarketData>> {
  return coalesce(`gmgn:info:${mint}`, async () => {
    const result = await gmgnGet<unknown>(
      `info:${mint}`,
      `/v1/token/info?chain=${CHAIN}&address=${encodeURIComponent(mint)}`,
      PROVIDER_TTL_MS.tokenOverview,
    );
    if (!result.ok) return result;
    const mapped = mapGmgnTokenInfo(result.data, mint);
    if (!mapped) return fail(502, "empty", "GMGN token info had no market fields.");
    return { ...result, data: mapped };
  });
}

export function getTokenPair(mint: string): Promise<ProviderResult<GmgnPairHit>> {
  return coalesce(`gmgn:pair:${mint}`, async () => {
    const result = await gmgnGet<unknown>(
      `pair:${mint}`,
      `/v1/token/info?chain=${CHAIN}&address=${encodeURIComponent(mint)}`,
      PROVIDER_TTL_MS.tokenOverview,
    );
    if (!result.ok) return result;
    const mapped = mapGmgnPair(result.data);
    if (!mapped) return fail(502, "empty", "GMGN token info had no pool address.");
    return { ...result, data: mapped };
  });
}

export function getTrendingTokens(limit = 20): Promise<ProviderResult<GmgnTrendingToken[]>> {
  const capped = Math.min(Math.max(limit, 1), 50);
  return coalesce(`gmgn:trending:${capped}`, async () => {
    const result = await gmgnGet<unknown>(
      `trending:${capped}`,
      `/v1/market/rank?chain=${CHAIN}&interval=1h&limit=${capped}&orderby=volume`,
      PROVIDER_TTL_MS.trending,
    );
    if (!result.ok) return result;
    const tokens = mapGmgnTrending(result.data);
    if (!tokens.length) return fail(502, "empty", "GMGN trending was empty.");
    return { ...result, data: tokens };
  });
}

export function getTokenKline(
  mint: string,
  timeframe: ChartTimeframe,
): Promise<ProviderResult<Candle[]>> {
  const window = gmgnKlineWindow(timeframe);
  const to = Math.floor(Date.now() / 1000);
  const from = to - window.lookbackSec;
  return coalesce(`gmgn:kline:${mint}:${timeframe}`, async () => {
    const result = await gmgnGet<unknown>(
      `kline:${mint}:${timeframe}`,
      `/v1/market/token_kline?chain=${CHAIN}&address=${encodeURIComponent(mint)}&resolution=${window.resolution}&from=${from}&to=${to}`,
      PROVIDER_TTL_MS.tokenPrice,
    );
    if (!result.ok) return result;
    const candles = mapGmgnKline(result.data);
    if (!candles.length) return fail(502, "empty", "GMGN kline had no bars.");
    return { ...result, data: candles };
  });
}

