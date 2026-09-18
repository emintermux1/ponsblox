import { PROVIDER_TTL_MS } from "@/lib/constants";
import { coalesce, memoryGet, memorySet, providerGetJson } from "@/lib/providers/runtime";
import { readProviderCache, writeProviderCache } from "@/lib/providers/store";
import {
  asRecord,
  finiteNumber,
  finiteString,
  type ProviderResult,
  type TokenMarketData,
} from "@/lib/providers/types";

const BASE = "https://pro-api.solscan.io";

function headers(): Record<string, string> | null {
  const key = process.env.SOLSCAN_API_KEY?.trim();
  if (!key) return null;
  return { token: key };
}

function wrap<T>(data: T): ProviderResult<T> {
  return { ok: true, data, source: "solscan", updatedAt: Date.now(), stale: false };
}

function fail(status: number, code: string, message: string): ProviderResult<never> {
  return { ok: false, source: "solscan", status, code, message };
}

export function mapSolscanMeta(raw: unknown, mint: string): TokenMarketData | null {
  const root = asRecord(raw);
  const data = asRecord(root?.data) ?? root;
  if (!data) return null;
  const address = finiteString(data.address) ?? mint;
  const symbol = finiteString(data.symbol);
  const name = finiteString(data.name);
  const price = finiteNumber(data.price);
  if (!symbol && !name && price == null) return null;
  const meta = asRecord(data.metadata);
  return {
    mint: address,
    symbol,
    name,
    logo: finiteString(data.icon) ?? finiteString(meta?.image),
    priceUsd: price,
    marketCap: finiteNumber(data.market_cap),
    liquidity: null,
    volume24h: finiteNumber(data.total_dex_vol_24h) ?? finiteNumber(data.volume_24h),
    priceChange24h: finiteNumber(data.price_change_24h),
    holderCount: finiteNumber(data.holder),
    source: "solscan",
    updatedAt: Date.now(),
    stale: false,
  };
}

export type SolscanHolderPage = {
  total: number | null;
  owners: Array<{ owner: string; amount: string; valueUsd: number | null; rank: number }>;
};

export function mapSolscanHolders(raw: unknown): SolscanHolderPage | null {
  const root = asRecord(raw);
  const data = asRecord(root?.data) ?? root;
  if (!data) return null;
  const items = Array.isArray(data.items) ? data.items : [];
  return {
    total: finiteNumber(data.total),
    owners: items
      .map((item, index) => {
        const row = asRecord(item);
        if (!row) return null;
        const owner = finiteString(row.owner);
        if (!owner) return null;
        return {
          owner,
          amount: finiteString(row.amount_str) ?? String(row.amount ?? ""),
          valueUsd: finiteNumber(row.value),
          rank: finiteNumber(row.rank) ?? index + 1,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row != null),
  };
}

export type SolscanMarket = {
  poolId: string;
  volume24h: number | null;
  tvl: number | null;
  trades24h: number | null;
};

export function mapSolscanMarkets(raw: unknown): SolscanMarket[] {
  const root = asRecord(raw);
  const list = Array.isArray(root?.data) ? root.data : Array.isArray(raw) ? raw : [];
  return list
    .map((item) => {
      const row = asRecord(item);
      if (!row) return null;
      const poolId = finiteString(row.pool_id);
      if (!poolId) return null;
      return {
        poolId,
        volume24h: finiteNumber(row.total_volume_24h),
        tvl: finiteNumber(row.total_tvl),
        trades24h: finiteNumber(row.total_trades_24h),
      };
    })
    .filter((row): row is SolscanMarket => row != null);
}

export type SolscanTrendingToken = {
  mint: string;
  symbol: string | null;
  name: string | null;
  decimals: number | null;
};

export function mapSolscanTrending(raw: unknown): SolscanTrendingToken[] {
  const root = asRecord(raw);
  const list = Array.isArray(root?.data) ? root.data : Array.isArray(raw) ? raw : [];
  return list
    .map((item) => {
      const row = asRecord(item);
      const mint = finiteString(row?.address);
      if (!mint) return null;
      return {
        mint,
        symbol: finiteString(row?.symbol),
        name: finiteString(row?.name),
        decimals: finiteNumber(row?.decimals),
      };
    })
    .filter((row): row is SolscanTrendingToken => row != null);
}

export type SolscanPortfolio = {
  address: string;
  totalUsd: number | null;
  solLamports: number | null;
  tokens: Array<{
    mint: string;
    symbol: string | null;
    name: string | null;
    amount: number;
    rawAmount: string;
    decimals: number;
    usd: number | null;
    imageUrl: string | null;
  }>;
};

export function mapSolscanPortfolio(raw: unknown, address: string): SolscanPortfolio | null {
  const root = asRecord(raw);
  const data = asRecord(root?.data);
  if (!data) return null;
  const native = asRecord(data.native_balance);
  const tokens = Array.isArray(data.tokens) ? data.tokens : [];
  return {
    address,
    totalUsd: finiteNumber(data.total_value),
    solLamports: finiteNumber(native?.amount),
    tokens: tokens
      .map((item) => {
        const row = asRecord(item);
        const mint = finiteString(row?.token_address);
        if (!mint) return null;
        return {
          mint,
          symbol: finiteString(row?.token_symbol),
          name: finiteString(row?.token_name),
          amount: finiteNumber(row?.balance) ?? 0,
          rawAmount: finiteString(row?.amount_str) ?? String(row?.amount ?? "0"),
          decimals: finiteNumber(row?.token_decimals) ?? 0,
          usd: finiteNumber(row?.value),
          imageUrl: finiteString(row?.token_icon),
        };
      })
      .filter((row): row is NonNullable<typeof row> => row != null),
  };
}

export type SolscanTx = {
  signature: string;
  status: string | null;
  slot: number | null;
  at: number | null;
};

export function mapSolscanTransactions(raw: unknown): SolscanTx[] {
  const root = asRecord(raw);
  const list = Array.isArray(root?.data) ? root.data : Array.isArray(raw) ? raw : [];
  return list
    .map((item) => {
      const row = asRecord(item);
      const signature = finiteString(row?.tx_hash);
      if (!signature) return null;
      const blockTime = finiteNumber(row?.block_time);
      return {
        signature,
        status: finiteString(row?.status),
        slot: finiteNumber(row?.slot),
        at: blockTime != null ? (blockTime > 1e12 ? blockTime : blockTime * 1000) : null,
      };
    })
    .filter((row): row is SolscanTx => row != null);
}

export type SolscanActivity = {
  signature: string;
  type: string | null;
  at: number | null;
};

export function mapSolscanActivities(raw: unknown): SolscanActivity[] {
  const root = asRecord(raw);
  const list = Array.isArray(root?.data) ? root.data : Array.isArray(raw) ? raw : [];
  return list
    .map((item) => {
      const row = asRecord(item);
      const signature = finiteString(row?.trans_id);
      if (!signature) return null;
      const blockTime = finiteNumber(row?.block_time);
      return {
        signature,
        type: finiteString(row?.activity_type),
        at: blockTime != null ? (blockTime > 1e12 ? blockTime : blockTime * 1000) : null,
      };
    })
    .filter((row): row is SolscanActivity => row != null);
}

async function solscanGet<T>(resource: string, path: string, ttlMs: number): Promise<ProviderResult<T>> {
  const auth = headers();
  if (!auth) return fail(503, "missing_key", "SOLSCAN_API_KEY is not configured.");
  const cached = memoryGet<ProviderResult<T>>(`solscan:${resource}`);
  if (cached) return cached;
  const dbHit = await readProviderCache<T>("solscan", resource, resource);
  if (dbHit && !dbHit.stale) {
    return { ok: true, data: dbHit.value, source: "solscan", updatedAt: dbHit.updatedAt, stale: false };
  }
  const result = await providerGetJson<T>({
    provider: "solscan",
    resource,
    url: `${BASE}${path}`,
    headers: auth,
  });
  if (!result.ok) {
    if (dbHit) return { ok: true, data: dbHit.value, source: "solscan", updatedAt: dbHit.updatedAt, stale: true };
    return fail(result.status, result.code, result.message);
  }
  const ok = wrap(result.data);
  memorySet(`solscan:${resource}`, ok, ttlMs);
  void writeProviderCache("solscan", resource, resource, result.data, ttlMs);
  return ok;
}

export function getTokenMeta(mint: string): Promise<ProviderResult<TokenMarketData>> {
  return coalesce(`solscan:meta:${mint}`, async () => {
    const result = await solscanGet<unknown>(
      `meta:${mint}`,
      `/v2.0/token/meta?address=${encodeURIComponent(mint)}`,
      PROVIDER_TTL_MS.tokenOverview,
    );
    if (!result.ok) return result;
    const mapped = mapSolscanMeta(result.data, mint);
    if (!mapped) return fail(502, "empty", "Solscan token meta had no fields.");
    return { ...result, data: mapped };
  });
}

export function getTokenHolders(mint: string): Promise<ProviderResult<SolscanHolderPage>> {
  return coalesce(`solscan:holders:${mint}`, async () => {
    const result = await solscanGet<unknown>(
      `holders:${mint}`,
      `/v2.0/token/holders?address=${encodeURIComponent(mint)}&page=1&page_size=10`,
      PROVIDER_TTL_MS.holders,
    );
    if (!result.ok) return result;
    const mapped = mapSolscanHolders(result.data);
    if (!mapped) return fail(502, "empty", "Solscan holders missing.");
    return { ...result, data: mapped };
  });
}

export function getTokenMarkets(mint: string): Promise<ProviderResult<SolscanMarket[]>> {
  return coalesce(`solscan:markets:${mint}`, async () => {
    const result = await solscanGet<unknown>(
      `markets:${mint}`,
      `/v2.0/token/markets?token=${encodeURIComponent(mint)}&sort_by=volume&page=1&page_size=10`,
      PROVIDER_TTL_MS.tokenOverview,
    );
    if (!result.ok) return result;
    return { ...result, data: mapSolscanMarkets(result.data) };
  });
}

export function getTrendingTokens(limit = 10): Promise<ProviderResult<SolscanTrendingToken[]>> {
  const capped = Math.min(Math.max(limit, 1), 20);
  return coalesce(`solscan:trending:${capped}`, async () => {
    const result = await solscanGet<unknown>(
      `trending:${capped}`,
      `/v2.0/token/trending?limit=${capped}`,
      PROVIDER_TTL_MS.trending,
    );
    if (!result.ok) return result;
    const tokens = mapSolscanTrending(result.data);
    if (!tokens.length) return fail(502, "empty", "Solscan trending was empty.");
    return { ...result, data: tokens };
  });
}

export function getAccountPortfolio(address: string): Promise<ProviderResult<SolscanPortfolio>> {
  return coalesce(`solscan:portfolio:${address}`, async () => {
    const result = await solscanGet<unknown>(
      `portfolio:${address}`,
      `/v2.0/account/portfolio?address=${encodeURIComponent(address)}`,
      30_000,
    );
    if (!result.ok) return result;
    const mapped = mapSolscanPortfolio(result.data, address);
    if (!mapped) return fail(502, "empty", "Solscan portfolio missing.");
    return { ...result, data: mapped };
  });
}

export function getAccountTransactions(address: string): Promise<ProviderResult<SolscanTx[]>> {
  return coalesce(`solscan:txs:${address}`, async () => {
    const result = await solscanGet<unknown>(
      `txs:${address}`,
      `/v2.0/account/transactions?address=${encodeURIComponent(address)}&limit=10`,
      30_000,
    );
    if (!result.ok) return result;
    return { ...result, data: mapSolscanTransactions(result.data) };
  });
}

export function getTokenActivity(mint: string): Promise<ProviderResult<SolscanActivity[]>> {
  return coalesce(`solscan:activity:${mint}`, async () => {
    const result = await solscanGet<unknown>(
      `activity:${mint}`,
      `/v2.0/token/defi/activities?address=${encodeURIComponent(mint)}&page=1&page_size=10&sort_by=block_time&sort_order=desc`,
      30_000,
    );
    if (!result.ok) return result;
    return { ...result, data: mapSolscanActivities(result.data) };
  });
}

export function solscanConfigured(): boolean {
  return Boolean(process.env.SOLSCAN_API_KEY?.trim());
}
