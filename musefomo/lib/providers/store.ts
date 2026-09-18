import { LEADERBOARD_WINDOWS, PROVIDER_TTL_MS, PUBLIC_DB_MS } from "@/lib/constants";
import { publicSql, runtimeSql } from "@/lib/db";
import { queryRowsBudget } from "@/lib/sql-timeout";
import { userFromBoardEntry } from "@/lib/human-map";
import { logWarn } from "@/lib/log";
import type { ProviderId, TokenMarketData } from "@/lib/providers/types";
import type { FomoScanBoard, FomoScanBoardEntry, FomoScanThesis, FomoScanUser, LeaderboardWindow } from "@/lib/types";

let schemaReady: Promise<void> | null = null;

async function queryRows<T>(result: PromiseLike<unknown>): Promise<T[]> {
  return (await result) as T[];
}

export async function ensureProviderCacheSchema(): Promise<boolean> {
  if (!schemaReady) {
    schemaReady = applyProviderCacheSchema().catch((error) => {
      schemaReady = null;
      logWarn("provider.schema_failed", {
        message: error instanceof Error ? error.message : "schema",
      });
      throw error;
    });
  }
  try {
    await Promise.race([
      schemaReady,
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("schema_timeout")), 1_200);
      }),
    ]);
    return true;
  } catch {
    return false;
  }
}

async function applyProviderCacheSchema(): Promise<void> {
  const sql = runtimeSql();
  try {
    await applyProviderCacheDdl(sql);
  } catch (error) {
    const message = error instanceof Error ? error.message : "schema";
    logWarn("provider.schema_failed", { message });
    // Sibling-owned tables may already exist. A CREATE-denied role must still SELECT.
    if (/permission denied/i.test(message)) return;
    throw error;
  }
}

async function applyProviderCacheDdl(sql: ReturnType<typeof runtimeSql>): Promise<void> {
  await sql`
    create table if not exists provider_cache (
      provider text not null,
      resource text not null,
      cache_key text not null,
      payload jsonb not null,
      source_at timestamptz,
      updated_at timestamptz not null default now(),
      expires_at timestamptz not null,
      primary key (provider, resource, cache_key)
    )
  `;
  await sql`create index if not exists provider_cache_expires_idx on provider_cache (expires_at)`;
  await sql`
    create table if not exists provider_health (
      provider text primary key,
      success_count int not null default 0,
      failure_count int not null default 0,
      rate_limited_at timestamptz,
      quota_blocked_until timestamptz,
      last_success_at timestamptz,
      last_failure_at timestamptz,
      last_error text,
      updated_at timestamptz not null default now()
    )
  `;
  await sql`
    create table if not exists provider_request_log (
      id uuid primary key default gen_random_uuid(),
      provider text not null,
      resource text not null,
      status int,
      ok boolean not null,
      duration_ms int,
      at timestamptz not null default now()
    )
  `;
  await sql`create index if not exists provider_request_log_at_idx on provider_request_log (at desc)`;
  await sql`
    create table if not exists external_token_cache (
      mint text primary key,
      symbol text,
      name text,
      logo text,
      price_usd double precision,
      market_cap double precision,
      liquidity double precision,
      volume_24h double precision,
      price_change_24h double precision,
      holder_count int,
      source text not null,
      updated_at timestamptz not null default now(),
      expires_at timestamptz not null
    )
  `;
  await sql`
    create table if not exists external_trader_cache (
      trader_key text primary key,
      handle text,
      display_name text,
      avatar text,
      source text not null,
      updated_at timestamptz not null default now(),
      expires_at timestamptz not null
    )
  `;
  await sql`
    create table if not exists fomo_external_traders (
      id text primary key,
      handle text,
      display_name text,
      avatar text,
      payload jsonb not null,
      updated_at timestamptz not null default now(),
      expires_at timestamptz not null
    )
  `;
  await sql`
    create table if not exists fomo_external_theses (
      id text primary key,
      token_address text,
      author_id text,
      thesis text,
      payload jsonb not null,
      updated_at timestamptz not null default now(),
      expires_at timestamptz not null
    )
  `;
  await sql`
    create table if not exists fomo_external_leaderboard (
      "window" text primary key,
      entries jsonb not null,
      updated_at timestamptz not null default now(),
      expires_at timestamptz not null
    )
  `;
}

export async function readProviderCache<T>(
  provider: ProviderId,
  resource: string,
  key: string,
): Promise<{ value: T; stale: boolean; updatedAt: number } | null> {
  try {
    const rows = await queryRowsBudget<{ payload: T; updated_at: string; expires_at: string }>(
      publicSql()`
      select payload, updated_at::text, expires_at::text
      from provider_cache
      where provider = ${provider}
        and resource = ${resource}
        and cache_key = ${key}
      limit 1
    `,
      PUBLIC_DB_MS,
    );
    const row = rows[0];
    if (!row) return null;
    const updatedAt = Date.parse(row.updated_at);
    const expiresAt = Date.parse(row.expires_at);
    const stale = Number.isFinite(expiresAt) && expiresAt <= Date.now();
    if (stale && Number.isFinite(updatedAt) && Date.now() - updatedAt > 24 * 60 * 60_000) return null;
    return { value: row.payload, stale, updatedAt: Number.isFinite(updatedAt) ? updatedAt : Date.now() };
  } catch {
    return null;
  }
}

export async function writeProviderCache(
  provider: ProviderId,
  resource: string,
  key: string,
  payload: unknown,
  ttlMs: number,
  sourceAt?: number | null,
) {
  if (!(await ensureProviderCacheSchema().catch(() => false))) return;
  const expires = new Date(Date.now() + ttlMs).toISOString();
  const source = sourceAt ? new Date(sourceAt).toISOString() : null;
  try {
    await runtimeSql()`
      insert into provider_cache (provider, resource, cache_key, payload, source_at, updated_at, expires_at)
      values (
        ${provider},
        ${resource},
        ${key},
        ${JSON.stringify(payload)}::jsonb,
        ${source},
        now(),
        ${expires}
      )
      on conflict (provider, resource, cache_key) do update set
        payload = excluded.payload,
        source_at = excluded.source_at,
        updated_at = now(),
        expires_at = excluded.expires_at
    `;
  } catch {
    // cache is optional
  }
}

export async function readTokenCache(mint: string): Promise<TokenMarketData | null> {
  if (!(await ensureProviderCacheSchema().catch(() => false))) return null;
  try {
    const rows = await queryRows<{
      mint: string;
      symbol: string | null;
      name: string | null;
      logo: string | null;
      price_usd: number | null;
      market_cap: number | null;
      liquidity: number | null;
      volume_24h: number | null;
      price_change_24h: number | null;
      holder_count: number | null;
      source: ProviderId;
      updated_at: string;
      expires_at: string;
    }>(runtimeSql()`
      select
        mint, symbol, name, logo, price_usd, market_cap, liquidity, volume_24h,
        price_change_24h, holder_count, source, updated_at::text, expires_at::text
      from external_token_cache
      where mint = ${mint}
      limit 1
    `);
    const row = rows[0];
    if (!row) return null;
    const updatedAt = Date.parse(row.updated_at);
    const expiresAt = Date.parse(row.expires_at);
    const stale = Number.isFinite(expiresAt) && expiresAt <= Date.now();
    if (stale && Number.isFinite(updatedAt) && Date.now() - updatedAt > 24 * 60 * 60_000) return null;
    return {
      mint: row.mint,
      symbol: row.symbol,
      name: row.name,
      logo: row.logo,
      priceUsd: row.price_usd,
      marketCap: row.market_cap,
      liquidity: row.liquidity,
      volume24h: row.volume_24h,
      priceChange24h: row.price_change_24h,
      holderCount: row.holder_count,
      source: row.source,
      updatedAt: Number.isFinite(updatedAt) ? updatedAt : Date.now(),
      stale,
    };
  } catch {
    return null;
  }
}

export async function writeTokenCache(row: TokenMarketData, ttlMs: number) {
  if (!(await ensureProviderCacheSchema().catch(() => false))) return;
  const expires = new Date(Date.now() + ttlMs).toISOString();
  try {
    await runtimeSql()`
      insert into external_token_cache (
        mint, symbol, name, logo, price_usd, market_cap, liquidity, volume_24h,
        price_change_24h, holder_count, source, updated_at, expires_at
      ) values (
        ${row.mint}, ${row.symbol}, ${row.name}, ${row.logo}, ${row.priceUsd},
        ${row.marketCap}, ${row.liquidity}, ${row.volume24h}, ${row.priceChange24h},
        ${row.holderCount == null ? null : Math.round(row.holderCount)}, ${row.source}, now(), ${expires}
      )
      on conflict (mint) do update set
        symbol = coalesce(excluded.symbol, external_token_cache.symbol),
        name = coalesce(excluded.name, external_token_cache.name),
        logo = coalesce(excluded.logo, external_token_cache.logo),
        price_usd = coalesce(excluded.price_usd, external_token_cache.price_usd),
        market_cap = coalesce(excluded.market_cap, external_token_cache.market_cap),
        liquidity = coalesce(excluded.liquidity, external_token_cache.liquidity),
        volume_24h = coalesce(excluded.volume_24h, external_token_cache.volume_24h),
        price_change_24h = coalesce(excluded.price_change_24h, external_token_cache.price_change_24h),
        holder_count = coalesce(excluded.holder_count, external_token_cache.holder_count),
        source = excluded.source,
        updated_at = now(),
        expires_at = excluded.expires_at
    `;
  } catch {
    // optional
  }
}

export async function writeTraderCache(input: {
  key: string;
  handle: string | null;
  displayName: string | null;
  avatar: string | null;
  source: ProviderId;
  ttlMs: number;
}) {
  if (!(await ensureProviderCacheSchema().catch(() => false))) return;
  const expires = new Date(Date.now() + input.ttlMs).toISOString();
  try {
    await runtimeSql()`
      insert into external_trader_cache (trader_key, handle, display_name, avatar, source, updated_at, expires_at)
      values (${input.key}, ${input.handle}, ${input.displayName}, ${input.avatar}, ${input.source}, now(), ${expires})
      on conflict (trader_key) do update set
        handle = coalesce(excluded.handle, external_trader_cache.handle),
        display_name = coalesce(excluded.display_name, external_trader_cache.display_name),
        avatar = coalesce(excluded.avatar, external_trader_cache.avatar),
        source = excluded.source,
        updated_at = now(),
        expires_at = excluded.expires_at
    `;
  } catch {
    // optional
  }
}

export async function writeFomoTrader(user: FomoScanUser) {
  if (!(await ensureProviderCacheSchema().catch(() => false))) return;
  const expires = new Date(Date.now() + PROVIDER_TTL_MS.traderProfile).toISOString();
  try {
    await runtimeSql()`
      insert into fomo_external_traders (id, handle, display_name, avatar, payload, updated_at, expires_at)
      values (
        ${user.id},
        ${user.handle},
        ${user.name},
        ${user.profilePicture},
        jsonb_strip_nulls(${JSON.stringify(user)}::jsonb),
        now(),
        ${expires}
      )
      on conflict (id) do update set
        handle = excluded.handle,
        display_name = coalesce(excluded.display_name, fomo_external_traders.display_name),
        avatar = coalesce(excluded.avatar, fomo_external_traders.avatar),
        payload = coalesce(jsonb_strip_nulls(fomo_external_traders.payload), '{}'::jsonb)
          || jsonb_strip_nulls(excluded.payload),
        updated_at = now(),
        expires_at = excluded.expires_at
    `;
  } catch {
    // optional
  }
}

export async function readFomoTrader(idOrHandle: string): Promise<FomoScanUser | null> {
  if (!(await ensureProviderCacheSchema().catch(() => false))) return null;
  const key = idOrHandle.replace(/^@/, "").trim();
  try {
    const rows = await queryRows<{ payload: FomoScanUser; expires_at: string }>(runtimeSql()`
      select payload, expires_at::text
      from fomo_external_traders
      where id = ${key} or lower(handle) = ${key.toLowerCase()}
      order by updated_at desc
      limit 1
    `);
    const row = rows[0];
    if (!row) return null;
    return row.payload;
  } catch {
    return null;
  }
}

export async function listCachedTokenMarkets(limit = 48): Promise<TokenMarketData[]> {
  if (!(await ensureProviderCacheSchema().catch(() => false))) return [];
  try {
    const rows = await queryRows<{
      mint: string;
      symbol: string | null;
      name: string | null;
      logo: string | null;
      price_usd: number | null;
      market_cap: number | null;
      liquidity: number | null;
      volume_24h: number | null;
      price_change_24h: number | null;
      holder_count: number | null;
      source: ProviderId;
      updated_at: string;
    }>(runtimeSql()`
      select
        mint, symbol, name, logo, price_usd, market_cap, liquidity, volume_24h,
        price_change_24h, holder_count, source, updated_at::text
      from external_token_cache
      order by updated_at desc
      limit ${limit}
    `);
    return rows.map((row) => {
      const updatedAt = Date.parse(row.updated_at);
      return {
        mint: row.mint,
        symbol: row.symbol,
        name: row.name,
        logo: row.logo,
        priceUsd: row.price_usd,
        marketCap: row.market_cap,
        liquidity: row.liquidity,
        volume24h: row.volume_24h,
        priceChange24h: row.price_change_24h,
        holderCount: row.holder_count,
        source: row.source,
        updatedAt: Number.isFinite(updatedAt) ? updatedAt : Date.now(),
        stale: false,
      };
    });
  } catch {
    return [];
  }
}

export async function countCachedTokens(): Promise<number> {
  if (!(await ensureProviderCacheSchema().catch(() => false))) return 0;
  try {
    const rows = await queryRows<{ n: string }>(runtimeSql()`
      select count(*)::text as n from external_token_cache
    `);
    return Number(rows[0]?.n ?? 0);
  } catch {
    return 0;
  }
}

export async function writeFomoTheses(items: FomoScanThesis[]) {
  if (!items.length || !(await ensureProviderCacheSchema().catch(() => false))) return;
  const expires = new Date(Date.now() + PROVIDER_TTL_MS.fomoThesis).toISOString();
  await Promise.all(
    items.slice(0, 40).map(async (item) => {
      try {
        await runtimeSql()`
          insert into fomo_external_theses (id, token_address, author_id, thesis, payload, updated_at, expires_at)
          values (
            ${item.id},
            ${item.tokenAddress},
            ${item.authorId},
            ${item.thesis},
            ${JSON.stringify(item)}::jsonb,
            now(),
            ${expires}
          )
          on conflict (id) do update set
            token_address = excluded.token_address,
            author_id = excluded.author_id,
            thesis = excluded.thesis,
            payload = excluded.payload,
            updated_at = now(),
            expires_at = excluded.expires_at
        `;
      } catch {
        // optional
      }
    }),
  );
}

export async function readFomoTheses(input?: {
  mint?: string;
  author?: string;
  limit?: number;
}): Promise<FomoScanThesis[]> {
  if (!(await ensureProviderCacheSchema().catch(() => false))) return [];
  const limit = input?.limit ?? 40;
  const mint = input?.mint?.trim() ?? null;
  const author = input?.author?.replace(/^@/, "").trim() ?? null;
  try {
    const rows = mint
      ? await queryRows<{ payload: FomoScanThesis }>(runtimeSql()`
          select payload
          from fomo_external_theses
          where token_address = ${mint}
          order by updated_at desc
          limit ${limit}
        `)
      : author
        ? await queryRows<{ payload: FomoScanThesis }>(runtimeSql()`
            select payload
            from fomo_external_theses
            where author_id = ${author}
              or lower(payload->>'authorHandle') = ${author.toLowerCase()}
              or lower(payload->>'authorId') = ${author.toLowerCase()}
            order by updated_at desc
            limit ${limit}
          `)
      : await queryRows<{ payload: FomoScanThesis }>(runtimeSql()`
          select payload
          from fomo_external_theses
          order by updated_at desc
          limit ${limit}
        `);
    return rows.map((row) => row.payload).filter((row) => row && typeof row.id === "string");
  } catch {
    return [];
  }
}

/** Existing thesis blobs written by siblings. Read-only — never drop the table. */
export async function listProviderCacheThesisPayloads(limit = 40): Promise<unknown[]> {
  if (!(await ensureProviderCacheSchema().catch(() => false))) return [];
  try {
    const rows = await queryRows<{ payload: unknown }>(runtimeSql()`
      select payload
      from provider_cache
      where resource ilike ${"%thesis%"}
         or cache_key ilike ${"%thesis%"}
      order by updated_at desc
      limit ${limit}
    `);
    return rows.map((row) => row.payload);
  } catch {
    return [];
  }
}

export async function countCachedTheses(): Promise<number> {
  if (!(await ensureProviderCacheSchema().catch(() => false))) return 0;
  try {
    const rows = await queryRows<{ n: string }>(runtimeSql()`
      select count(*)::text as n from fomo_external_theses
    `);
    return Number(rows[0]?.n ?? 0);
  } catch {
    return 0;
  }
}

export async function writeFomoLeaderboard(window: string, board: FomoScanBoard) {
  if (!(await ensureProviderCacheSchema().catch(() => false))) return;
  const expires = new Date(Date.now() + PROVIDER_TTL_MS.fomoLeaderboard).toISOString();
  try {
    await runtimeSql()`
      insert into fomo_external_leaderboard ("window", entries, updated_at, expires_at)
      values (${window}, ${JSON.stringify(board)}::jsonb, now(), ${expires})
      on conflict ("window") do update set
        entries = excluded.entries,
        updated_at = now(),
        expires_at = excluded.expires_at
    `;
    void writeFomoTradersFromBoard(board);
  } catch {
    // optional
  }
}

export async function writeFomoTradersFromBoard(board: FomoScanBoard) {
  const entries = board.entries ?? [];
  await Promise.all(
    entries.slice(0, 80).map(async (entry) => {
      const user = userFromBoardEntry(entry);
      if (user) await writeFomoTrader(user);
    }),
  );
}

export async function readFomoTraderFromBoards(
  handle: string,
): Promise<{ entry: FomoScanBoardEntry; window: LeaderboardWindow } | null> {
  const key = handle.replace(/^@/, "").trim().toLowerCase();
  if (!key) return null;
  for (const window of LEADERBOARD_WINDOWS) {
    const board = await readFomoLeaderboard(window);
    const entry = board?.entries.find(
      (row) => row.handle?.toLowerCase() === key || row.id.toLowerCase() === key,
    );
    if (entry) return { entry, window };
  }
  return null;
}

export async function readFomoLeaderboard(window: string): Promise<FomoScanBoard | null> {
  if (!(await ensureProviderCacheSchema().catch(() => false))) return null;
  try {
    const rows = await queryRows<{ entries: FomoScanBoard }>(runtimeSql()`
      select entries
      from fomo_external_leaderboard
      where "window" = ${window}
      limit 1
    `);
    return rows[0]?.entries ?? null;
  } catch {
    return null;
  }
}

export async function recordProviderHealth(input: {
  provider: ProviderId;
  ok: boolean;
  status: number;
  quota: boolean;
  message?: string | null;
}) {
  if (!(await ensureProviderCacheSchema().catch(() => false))) return;
  const quotaUntil = input.quota ? new Date(Date.now() + 120_000).toISOString() : null;
  const rateLimited = input.status === 429 ? new Date().toISOString() : null;
  try {
    await runtimeSql()`
      insert into provider_health (
        provider, success_count, failure_count, rate_limited_at, quota_blocked_until,
        last_success_at, last_failure_at, last_error, updated_at
      ) values (
        ${input.provider},
        ${input.ok ? 1 : 0},
        ${input.ok ? 0 : 1},
        ${rateLimited},
        ${quotaUntil},
        ${input.ok ? new Date().toISOString() : null},
        ${input.ok ? null : new Date().toISOString()},
        ${input.ok ? null : input.message ?? null},
        now()
      )
      on conflict (provider) do update set
        success_count = provider_health.success_count + ${input.ok ? 1 : 0},
        failure_count = case when ${input.ok} then 0 else provider_health.failure_count + 1 end,
        rate_limited_at = coalesce(${rateLimited}, provider_health.rate_limited_at),
        quota_blocked_until = coalesce(${quotaUntil}, provider_health.quota_blocked_until),
        last_success_at = case when ${input.ok} then now() else provider_health.last_success_at end,
        last_failure_at = case when ${input.ok} then provider_health.last_failure_at else now() end,
        last_error = case when ${input.ok} then null else ${input.message ?? null} end,
        updated_at = now()
    `;
  } catch {
    // optional
  }
}

export async function recordProviderRequest(input: {
  provider: ProviderId;
  resource: string;
  status: number | null;
  ok: boolean;
  durationMs: number;
}) {
  if (!(await ensureProviderCacheSchema().catch(() => false))) return;
  try {
    await runtimeSql()`
      insert into provider_request_log (provider, resource, status, ok, duration_ms)
      values (${input.provider}, ${input.resource}, ${input.status}, ${input.ok}, ${input.durationMs})
    `;
    await runtimeSql()`
      delete from provider_request_log
      where at < now() - interval '2 days'
    `;
  } catch {
    // optional
  }
}
