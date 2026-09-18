import { FOMO_BUDGET_MS, PROVIDER_TTL_MS } from "@/lib/constants";
import { publicJson } from "@/lib/fast-fetch";
import { coalesce, memoryGet, memorySet } from "@/lib/providers/runtime";
import { readProviderCache, writeProviderCache } from "@/lib/providers/store";
import {
  asRecord,
  finiteNumber,
  finiteString,
  type ProviderResult,
  type TokenMarketData,
} from "@/lib/providers/types";

/**
 * Official Pump.fun Frontend API v3 — the HTTP sibling pump CLIs wrap
 * (`frontend-api-v3.pump.fun`, documented by pump.fun frontend + pumpfun-cli).
 */
const BASE = "https://frontend-api-v3.pump.fun";
const TIMEOUT_MS = FOMO_BUDGET_MS;

const TRENDING_PATHS = [
  "/coins/top-runners",
  "/coins?offset=0&limit=50&sort=last_trade_timestamp&order=DESC&includeNsfw=false",
] as const;

export type PumpTrendingToken = {
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

export type PumpPairHit = {
  pairAddress: string;
  liquidity: number;
  symbol: string | null;
  name: string | null;
  imageUrl: string | null;
  priceUsd: number | null;
  marketCap: number | null;
  dexId: string | null;
};

function wrap<T>(data: T): ProviderResult<T> {
  return { ok: true, data, source: "pump", updatedAt: Date.now(), stale: false };
}

function fail(status: number, code: string, message: string): ProviderResult<never> {
  return { ok: false, source: "pump", status, code, message };
}

export function pumpConfigured(): boolean {
  return true;
}

function coinList(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) {
    return raw.map(asRecord).filter((row): row is Record<string, unknown> => row != null);
  }
  const root = asRecord(raw);
  if (!root) return [];
  const nested = root.coins ?? root.data ?? root.results ?? root.tokens;
  if (Array.isArray(nested)) {
    return nested.map(asRecord).filter((row): row is Record<string, unknown> => row != null);
  }
  if (finiteString(root.mint)) return [root];
  return [];
}

function pairFromCoin(row: Record<string, unknown>): string | null {
  return (
    finiteString(row.pump_swap_pool) ??
    finiteString(row.raydium_pool) ??
    finiteString(row.pool_address) ??
    finiteString(row.market_id) ??
    finiteString(row.bonding_curve)
  );
}

function priceFromCoin(row: Record<string, unknown>): number | null {
  return (
    finiteNumber(row.usd_price) ??
    finiteNumber(row.price_usd) ??
    finiteNumber(row.priceUsd) ??
    finiteNumber(row.price)
  );
}

function marketCapFromCoin(row: Record<string, unknown>): number | null {
  return finiteNumber(row.usd_market_cap) ?? finiteNumber(row.market_cap) ?? finiteNumber(row.marketCap);
}

export function mapPumpCoin(raw: unknown, mint: string): TokenMarketData | null {
  const row = coinList(raw)[0] ?? asRecord(raw);
  if (!row) return null;
  const address = finiteString(row.mint) ?? mint;
  const symbol = finiteString(row.symbol);
  const name = finiteString(row.name);
  const priceUsd = priceFromCoin(row);
  const marketCap = marketCapFromCoin(row);
  if (priceUsd == null && marketCap == null && !symbol && !name) return null;
  return {
    mint: address,
    symbol,
    name,
    logo: finiteString(row.image_uri) ?? finiteString(row.imageUri) ?? finiteString(row.thumbnail),
    priceUsd,
    marketCap,
    liquidity: finiteNumber(row.liquidity),
    volume24h: finiteNumber(row.volume_24h) ?? finiteNumber(row.volume24h),
    priceChange24h: finiteNumber(row.price_change_24h) ?? finiteNumber(row.price_change_percent),
    holderCount: finiteNumber(row.holder_count) ?? finiteNumber(row.num_holders),
    source: "pump",
    updatedAt: Date.now(),
    stale: false,
  };
}

export function mapPumpPair(raw: unknown): PumpPairHit | null {
  const row = coinList(raw)[0] ?? asRecord(raw);
  if (!row) return null;
  const pairAddress = pairFromCoin(row);
  if (!pairAddress) return null;
  const complete = row.complete === true || row.complete === 1;
  return {
    pairAddress,
    liquidity: finiteNumber(row.liquidity) ?? 0,
    symbol: finiteString(row.symbol),
    name: finiteString(row.name),
    imageUrl: finiteString(row.image_uri),
    priceUsd: priceFromCoin(row),
    marketCap: marketCapFromCoin(row),
    dexId: complete ? "pumpswap" : "pumpfun",
  };
}

export function mapPumpTrending(raw: unknown): PumpTrendingToken[] {
  return coinList(raw)
    .map((row, index) => {
      const mint = finiteString(row.mint);
      if (!mint) return null;
      return {
        mint,
        symbol: finiteString(row.symbol),
        name: finiteString(row.name),
        logo: finiteString(row.image_uri) ?? finiteString(row.thumbnail),
        priceUsd: priceFromCoin(row),
        liquidity: finiteNumber(row.liquidity),
        volume24h: finiteNumber(row.volume_24h) ?? finiteNumber(row.volume24h),
        marketCap: marketCapFromCoin(row),
        priceChange24h: finiteNumber(row.price_change_24h) ?? finiteNumber(row.price_change_percent),
        holderCount: finiteNumber(row.holder_count),
        pairAddress: pairFromCoin(row),
        rank: finiteNumber(row.rank) ?? index + 1,
      };
    })
    .filter((row): row is PumpTrendingToken => row != null);
}

async function pumpGet<T>(resource: string, path: string, ttlMs: number): Promise<ProviderResult<T>> {
  const cached = memoryGet<ProviderResult<T>>(`pump:${resource}`);
  if (cached) return cached;
  const dbHit = await readProviderCache<T>("pump", resource, resource);
  if (dbHit && !dbHit.stale) {
    return { ok: true, data: dbHit.value, source: "pump", updatedAt: dbHit.updatedAt, stale: false };
  }
  const data = await publicJson<T>(`${BASE}${path}`, TIMEOUT_MS);
  if (data == null) {
    if (dbHit) return { ok: true, data: dbHit.value, source: "pump", updatedAt: dbHit.updatedAt, stale: true };
    return fail(502, "empty", "Pump frontend-api missed.");
  }
  const ok = wrap(data);
  memorySet(`pump:${resource}`, ok, ttlMs);
  void writeProviderCache("pump", resource, resource, data, ttlMs);
  return ok;
}

export function getTokenMeta(mint: string): Promise<ProviderResult<TokenMarketData>> {
  return coalesce(`pump:meta:${mint}`, async () => {
    const result = await pumpGet<unknown>(
      `meta:${mint}`,
      `/coins/${encodeURIComponent(mint)}`,
      PROVIDER_TTL_MS.tokenOverview,
    );
    if (!result.ok) return result;
    const mapped = mapPumpCoin(result.data, mint);
    if (!mapped) return fail(502, "empty", "Pump coin had no market fields.");
    return { ...result, data: mapped };
  });
}

export function getTokenPair(mint: string): Promise<ProviderResult<PumpPairHit>> {
  return coalesce(`pump:pair:${mint}`, async () => {
    const result = await pumpGet<unknown>(
      `pair:${mint}`,
      `/coins/${encodeURIComponent(mint)}`,
      PROVIDER_TTL_MS.tokenOverview,
    );
    if (!result.ok) return result;
    const mapped = mapPumpPair(result.data);
    if (!mapped) return fail(502, "empty", "Pump coin had no pool address.");
    return { ...result, data: mapped };
  });
}

export function getTrendingTokens(limit = 20): Promise<ProviderResult<PumpTrendingToken[]>> {
  const capped = Math.min(Math.max(limit, 1), 50);
  return coalesce(`pump:trending:${capped}`, async () => {
    let last = fail(502, "empty", "Pump trending was empty.");
    for (const path of TRENDING_PATHS) {
      const result = await pumpGet<unknown>(`trending:${capped}:${path}`, path, PROVIDER_TTL_MS.trending);
      if (!result.ok) {
        last = result;
        continue;
      }
      const tokens = mapPumpTrending(result.data).slice(0, capped);
      if (tokens.length) return { ...result, data: tokens };
      last = fail(502, "empty", "Pump trending was empty.");
    }
    return last;
  });
}
