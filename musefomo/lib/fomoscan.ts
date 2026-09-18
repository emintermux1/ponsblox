import { cacheGet, cacheSet } from "@/lib/cache";
import { FOMOSCAN_CACHE_MS, FOMO_BUDGET_MS } from "@/lib/constants";
import { raceTimeout } from "@/lib/fast-fetch";
import { harvestPublicSocial } from "@/lib/providers/public-social";
import { providerGetJson, providerOpen } from "@/lib/providers/runtime";
import {
  readFomoLeaderboard,
  readFomoTheses,
  readFomoTrader,
  readProviderCache,
  writeFomoTheses,
  writeProviderCache,
} from "@/lib/providers/store";
import type {
  FomoScanBoard,
  FomoScanBoardEntry,
  FomoScanPnl,
  FomoScanPnlWindow,
  FomoScanThesis,
  FomoScanThesisPage,
  FomoScanUser,
  LeaderboardWindow,
} from "@/lib/types";

/**
 * Official FomoScan Identity API 1.1.0 — https://api.fomoscan.sh/openapi.json
 * (also listed on https://www.fomoscan.dev/ and https://fomoscan.sh/api).
 *
 * Called from this client:
 *   GET /v2/me
 *   GET /v2/user/handle/{handle}
 *   GET /v2/user/wallet/{address}
 *   GET /v2/user/id/{id}
 *   GET /v2/user/handle/{handle}/pnl
 *   GET /v2/thesis
 *   GET /v2/thesis/token/{tokenAddress}
 *   GET /v2/thesis/user/{id}
 *   GET /v2/leaderboard/traders-fomoscan
 *   GET /v2/leaderboard/traders
 *   GET /v2/leaderboard/tokens/trending
 *   GET /v2/leaderboard/tokens/most-held
 *
 * Present in OpenAPI but unused here (not invented — just not wired):
 *   POST /v2/user/handle/{handle}/resolve (billed live crawl — not on hot paths)
 *   GET /v2/user/handles/pnl
 *   GET /v2/thesis/user/{id}/token/{tokenAddress}
 *   GET /v2/leaderboard/{affiliates,clans,creators-revshare,tokens/graduated}
 *   /v2/pump/* and /v2/ws
 *
 * Not in OpenAPI: search, followers graph, Muse ranks. Do not invent them.
 */

export type FomoScanResult<T> =
  | { ok: true; data: T; asOf: string | null; resolve?: string | null; stale?: boolean }
  | { ok: false; status: number; code: string; message: string; pending?: unknown };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Envelope = {
  data?: unknown;
  meta?: { asOf?: string; requestId?: string };
  error?: { code?: string; message?: string };
};

const lastGood = new Map<string, { data: unknown; asOf: string | null }>();
const missingFieldLogged = new Set<string>();

let quotaBlockedUntil = 0;
let lastQuotaMessage = "This feed is paused";

export function fomoscanQuotaBlocked(): boolean {
  return Date.now() < quotaBlockedUntil;
}

export function fomoscanQuotaMessage(): string {
  return lastQuotaMessage;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function logMissing(label: string, keys: string[], used: string | null) {
  const id = `${label}:${keys.join(",")}:${used ?? "none"}`;
  if (missingFieldLogged.has(id)) return;
  missingFieldLogged.add(id);
  if (used && used !== keys[0]) {
    console.warn(`[fomoscan] ${label}: missing ${keys[0]}, using ${used}`);
    return;
  }
  if (!used) console.warn(`[fomoscan] ${label}: none of ${keys.join(", ")}`);
}

function firstString(row: Record<string, unknown>, keys: string[], label: string): string | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) {
      logMissing(label, keys, key);
      return value;
    }
  }
  logMissing(label, keys, null);
  return null;
}

function firstNumber(row: Record<string, unknown>, keys: string[], label: string): number | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      logMissing(label, keys, key);
      return value;
    }
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
      logMissing(label, keys, key);
      return Number(value);
    }
  }
  logMissing(label, keys, null);
  return null;
}

function firstBool(row: Record<string, unknown>, keys: string[], label: string): boolean | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "boolean") {
      logMissing(label, keys, key);
      return value;
    }
  }
  logMissing(label, keys, null);
  return null;
}

function firstArray(row: Record<string, unknown>, keys: string[], label: string): unknown[] {
  for (const key of keys) {
    const value = row[key];
    if (Array.isArray(value)) {
      logMissing(label, keys, key);
      return value;
    }
  }
  logMissing(label, keys, null);
  return [];
}

function looksLikePage(row: Record<string, unknown>): boolean {
  return "items" in row || "entries" in row || ("count" in row && "hasMore" in row);
}

function looksLikeUser(row: Record<string, unknown>): boolean {
  return "handle" in row && ("profilePicture" in row || "solanaAddress" in row || "id" in row);
}

function unwrap(body: unknown): { data: unknown; asOf: string | null } {
  const row = asRecord(body);
  if (!row) return { data: body, asOf: null };
  if (looksLikePage(row) || looksLikeUser(row) || "windows" in row) {
    const meta = asRecord(row.meta);
    const asOf =
      (typeof meta?.asOf === "string" ? meta.asOf : null) ??
      (typeof row.asOf === "string" ? row.asOf : null);
    return { data: body, asOf };
  }
  if ("data" in row && row.data !== undefined) {
    const meta = asRecord(row.meta);
    return {
      data: row.data,
      asOf: typeof meta?.asOf === "string" ? meta.asOf : null,
    };
  }
  return { data: body, asOf: null };
}

export function normalizeThesis(raw: unknown): FomoScanThesis | null {
  const row = asRecord(raw);
  if (!row) return null;
  const id = firstString(row, ["id"], "thesis.id");
  if (!id) return null;
  return {
    id,
    tokenAddress: firstString(row, ["tokenAddress"], "thesis.tokenAddress"),
    tokenNetwork: firstString(row, ["tokenNetwork"], "thesis.tokenNetwork"),
    tokenSymbol: firstString(row, ["tokenSymbol"], "thesis.tokenSymbol"),
    authorId: firstString(row, ["authorId"], "thesis.authorId"),
    authorHandle: firstString(row, ["authorHandle"], "thesis.authorHandle"),
    authorName: firstString(row, ["authorName"], "thesis.authorName"),
    authorIsDev: firstBool(row, ["authorIsDev"], "thesis.authorIsDev"),
    thesis: firstString(row, ["thesis"], "thesis.thesis"),
    likeCount: firstNumber(row, ["likeCount"], "thesis.likeCount"),
    holdingsUsd: firstNumber(row, ["holdingsUsd"], "thesis.holdingsUsd"),
    authorTradeUsd: firstNumber(row, ["authorTradeUsd"], "thesis.authorTradeUsd"),
    pnl: firstNumber(row, ["pnl"], "thesis.pnl"),
    realizedPnlUsd: firstNumber(row, ["realizedPnlUsd"], "thesis.realizedPnlUsd"),
    unrealizedPnlUsd: firstNumber(row, ["unrealizedPnlUsd"], "thesis.unrealizedPnlUsd"),
    percentageRealizedPnl: firstNumber(row, ["percentageRealizedPnl"], "thesis.percentageRealizedPnl"),
    percentageUnrealizedPnl: firstNumber(
      row,
      ["percentageUnrealizedPnl"],
      "thesis.percentageUnrealizedPnl",
    ),
    tokenAmount: firstNumber(row, ["tokenAmount"], "thesis.tokenAmount"),
    closedAt: firstNumber(row, ["closedAt"], "thesis.closedAt"),
    fomoCreatedAt: firstNumber(row, ["fomoCreatedAt"], "thesis.fomoCreatedAt"),
    updatedAt: firstNumber(row, ["updatedAt"], "thesis.updatedAt"),
    source: "fomoscan",
  };
}

export function normalizeThesisPage(raw: unknown): FomoScanThesisPage {
  if (Array.isArray(raw)) {
    const items = raw.map(normalizeThesis).filter((item): item is FomoScanThesis => Boolean(item));
    console.warn("[fomoscan] thesis page: payload was an array; using it as items");
    return { count: items.length, hasMore: false, nextBefore: null, updatedAt: null, items, source: "fomoscan" };
  }
  const row = asRecord(raw) ?? {};
  const items = firstArray(row, ["items"], "thesis.items")
    .map(normalizeThesis)
    .filter((item): item is FomoScanThesis => Boolean(item));
  return {
    count: firstNumber(row, ["count"], "thesis.count") ?? items.length,
    hasMore: firstBool(row, ["hasMore"], "thesis.hasMore") ?? false,
    nextBefore: firstString(row, ["nextBefore"], "thesis.nextBefore"),
    updatedAt: firstNumber(row, ["updatedAt"], "thesis.updatedAt"),
    items,
    tokenAddress: firstString(row, ["tokenAddress"], "thesisPage.tokenAddress") ?? undefined,
    tokenNetwork: firstString(row, ["tokenNetwork"], "thesisPage.tokenNetwork"),
    symbol: firstString(row, ["symbol"], "thesisPage.symbol"),
    source: "fomoscan",
  };
}

export function normalizeBoardEntry(raw: unknown, index: number): FomoScanBoardEntry | null {
  const row = asRecord(raw);
  if (!row) return null;
  const handle = firstString(row, ["handle", "symbol"], "board.handle");
  const id =
    firstString(row, ["id", "tokenAddress", "mint"], "board.id") ?? handle;
  if (!id) return null;
  return {
    rank: firstNumber(row, ["rank"], "board.rank") ?? index + 1,
    id,
    handle,
    // traders board uses `label`; traders-fomoscan uses official `displayName`
    label: firstString(row, ["label", "displayName"], "board.label"),
    avatarUrl: firstString(row, ["avatarUrl"], "board.avatarUrl"),
    // traders uses official `pnl`; traders-fomoscan uses official `netUsd`
    pnl: firstNumber(row, ["pnl", "netUsd"], "board.pnl"),
    volume: firstNumber(row, ["volume", "volumeUsd"], "board.volume"),
    followers: firstNumber(row, ["followers"], "board.followers"),
    numTrades: firstNumber(row, ["numTrades", "trades"], "board.numTrades"),
    memberCount: firstNumber(row, ["memberCount"], "board.memberCount"),
    marketCap: firstNumber(row, ["marketCap"], "board.marketCap"),
    price: firstNumber(row, ["price"], "board.price"),
    liquidity: firstNumber(row, ["liquidity"], "board.liquidity"),
  };
}

export function normalizeBoard(raw: unknown, fallbackBoard: string): FomoScanBoard {
  if (Array.isArray(raw)) {
    console.warn("[fomoscan] board: payload was an array; using it as entries");
    const entries = raw
      .map((row, index) => normalizeBoardEntry(row, index))
      .filter((row): row is FomoScanBoardEntry => Boolean(row));
    return {
      board: fallbackBoard,
      window: null,
      capturedAt: Date.now(),
      count: entries.length,
      entries,
      source: "fomoscan",
    };
  }
  const row = asRecord(raw) ?? {};
  const entries = firstArray(row, ["entries"], "board.entries")
    .map((entry, index) => normalizeBoardEntry(entry, index))
    .filter((entry): entry is FomoScanBoardEntry => Boolean(entry));
  return {
    board: firstString(row, ["board"], "board.board") ?? fallbackBoard,
    window: firstString(row, ["window"], "board.window"),
    capturedAt:
      firstNumber(row, ["capturedAt", "updatedAt"], "board.capturedAt") ?? Date.now(),
    count: firstNumber(row, ["count"], "board.count") ?? entries.length,
    entries,
    source: "fomoscan",
  };
}

export function normalizeUser(raw: unknown): FomoScanUser | null {
  const row = asRecord(raw);
  if (!row) return null;
  const handle = firstString(row, ["handle", "userHandle"], "user.handle");
  const id = firstString(row, ["id", "userId"], "user.id");
  if (!handle && !id) return null;
  return {
    id: id ?? handle ?? "",
    handle: handle ?? id ?? "",
    name: firstString(row, ["name", "displayName"], "user.name"),
    bio: firstString(row, ["bio", "description"], "user.bio"),
    banner: firstString(row, ["banner", "coverPhotoLink"], "user.banner"),
    profilePicture: firstString(row, ["profilePicture", "profilePictureLink", "avatarUrl", "avatar"], "user.profilePicture"),
    twitter: firstString(row, ["twitter"], "user.twitter"),
    solanaAddress: firstString(row, ["solanaAddress", "wallet"], "user.solanaAddress"),
    evmAddress: firstString(row, ["evmAddress"], "user.evmAddress"),
    followers: firstNumber(row, ["followers"], "user.followers"),
    socials: Array.isArray(row.socials)
      ? (row.socials as FomoScanUser["socials"])
      : undefined,
    source: "fomoscan",
  };
}

function normalizePnlWindow(raw: unknown): FomoScanPnlWindow | null {
  const row = asRecord(raw);
  if (!row) return null;
  return {
    netUsd: firstNumber(row, ["netUsd"], "pnl.netUsd"),
    returnPct: firstNumber(row, ["returnPct"], "pnl.returnPct"),
    volumeUsd: firstNumber(row, ["volumeUsd"], "pnl.volumeUsd"),
    trades: firstNumber(row, ["trades"], "pnl.trades"),
    rank: firstNumber(row, ["rank"], "pnl.rank"),
  };
}

export function normalizePnl(raw: unknown): FomoScanPnl | null {
  const row = asRecord(raw);
  if (!row) return null;
  const handle = firstString(row, ["handle"], "pnl.handle");
  if (!handle) return null;
  const windows = asRecord(row.windows) ?? {};
  return {
    handle,
    displayName: firstString(row, ["displayName"], "pnl.displayName"),
    avatarUrl: firstString(row, ["avatarUrl", "profilePicture"], "pnl.avatarUrl"),
    twitter: firstString(row, ["twitter"], "pnl.twitter"),
    followers: firstNumber(row, ["followers"], "pnl.followers"),
    wallet: firstString(row, ["wallet"], "pnl.wallet"),
    evmWallet: firstString(row, ["evmWallet"], "pnl.evmWallet"),
    updatedAt: firstNumber(row, ["updatedAt"], "pnl.updatedAt"),
    windows: {
      "24h": normalizePnlWindow(windows["24h"]),
      "7d": normalizePnlWindow(windows["7d"]),
      "30d": normalizePnlWindow(windows["30d"]),
      all: normalizePnlWindow(windows.all),
    },
  };
}

function staleFromLastGood<T>(
  lastGoodKey: string | undefined,
  extra?: { resolve?: string | null },
): FomoScanResult<T> | null {
  if (!lastGoodKey) return null;
  const cached = lastGood.get(lastGoodKey);
  if (!cached) return null;
  return { ok: true, data: cached.data as T, asOf: cached.asOf, stale: true, resolve: extra?.resolve };
}

function cacheEmpty<T>(): FomoScanResult<T> {
  return {
    ok: false,
    status: 404,
    code: "cache_empty",
    message: "No cached snapshot.",
  };
}

function fomoAuth(): Record<string, string> | null {
  const key = process.env.FOMOSCAN_API_KEY?.trim();
  if (!key) return null;
  return {
    Authorization: `Bearer ${key}`,
    "X-Api-Key": key,
  };
}

function fomoBase(): string {
  return (process.env.FOMOSCAN_API_URL?.trim() || "https://api.fomoscan.sh").replace(/\/$/, "");
}

function rememberOk<T>(
  cacheKey: string,
  lastGoodKey: string | undefined,
  cacheMs: number,
  data: T,
  asOf: string | null,
): FomoScanResult<T> {
  const result: FomoScanResult<T> = { ok: true, data, asOf, stale: false };
  cacheSet(cacheKey, result, cacheMs);
  if (lastGoodKey) lastGood.set(lastGoodKey, { data, asOf });
  return result;
}

async function peekCached<T>(
  cacheKey: string,
  path: string,
  lastGoodKey?: string,
  cacheMs = FOMOSCAN_CACHE_MS.thesis,
): Promise<FomoScanResult<T> | null> {
  const hit = cacheGet<FomoScanResult<T>>(cacheKey);
  if (hit) return hit;
  const last = staleFromLastGood<T>(lastGoodKey);
  if (last) return last;
  const db = await raceTimeout(readProviderCache<T>("fomoscan", path, path), null, 400);
  if (!db) return null;
  const result: FomoScanResult<T> = { ok: true, data: db.value, asOf: null, stale: db.stale };
  if (lastGoodKey) lastGood.set(lastGoodKey, { data: db.value, asOf: null });
  cacheSet(cacheKey, result, cacheMs);
  return result;
}

async function liveFomo<T>(
  path: string,
  cacheKey: string,
  cacheMs: number,
  lastGoodKey?: string,
): Promise<FomoScanResult<T>> {
  if (providerOpen("fomoscan") || Date.now() < quotaBlockedUntil) {
    return (await peekCached<T>(cacheKey, path, lastGoodKey, cacheMs)) ?? cacheEmpty<T>();
  }
  const auth = fomoAuth();
  if (!auth) return (await peekCached<T>(cacheKey, path, lastGoodKey, cacheMs)) ?? cacheEmpty<T>();

  const result = await providerGetJson<unknown>({
    provider: "fomoscan",
    resource: path,
    url: `${fomoBase()}${path}`,
    headers: auth,
    timeoutMs: FOMO_BUDGET_MS,
  });
  if (!result.ok) {
    if (result.status === 402 || result.status === 429) {
      quotaBlockedUntil = Date.now() + 120_000;
      lastQuotaMessage = "This feed is paused";
    }
    return (await peekCached<T>(cacheKey, path, lastGoodKey, cacheMs)) ?? {
      ok: false,
      status: result.status,
      code: result.code,
      message: result.message,
    };
  }
  const unwrapped = unwrap(result.data);
  const ok = rememberOk<T>(cacheKey, lastGoodKey, cacheMs, unwrapped.data as T, unwrapped.asOf);
  void writeProviderCache("fomoscan", path, path, unwrapped.data, cacheMs);
  return ok;
}

async function fomoscanFetch<T>(
  path: string,
  init: RequestInit & { cacheMs?: number; lastGoodKey?: string; live?: boolean } = {},
): Promise<FomoScanResult<T>> {
  const cacheMs = init.cacheMs ?? FOMOSCAN_CACHE_MS.thesis;
  const method = init.method ?? "GET";
  const cacheKey = `${method}:${fomoBase()}${path}`;
  const cached = await peekCached<T>(cacheKey, path, init.lastGoodKey, cacheMs);
  if (cached) {
    if (init.live !== false) void liveFomo<T>(path, cacheKey, cacheMs, init.lastGoodKey);
    return cached;
  }
  if (init.live === false) return cacheEmpty<T>();
  return liveFomo<T>(path, cacheKey, cacheMs, init.lastGoodKey);
}

export function peekFomoScanTrendingTokens() {
  return fomoscanFetch<FomoScanBoard>("/v2/leaderboard/tokens/trending", {
    cacheMs: FOMOSCAN_CACHE_MS.leaderboard,
    lastGoodKey: "board:tokens/trending",
    live: true,
  }).then((board) => (board.ok ? { ...board, data: normalizeBoard(board.data, "tokens/trending") } : board));
}

export function peekFomoScanMostHeldTokens() {
  return fomoscanFetch<FomoScanBoard>("/v2/leaderboard/tokens/most-held", {
    cacheMs: FOMOSCAN_CACHE_MS.leaderboard,
    lastGoodKey: "board:tokens/most-held",
    live: true,
  }).then((board) => (board.ok ? { ...board, data: normalizeBoard(board.data, "tokens/most-held") } : board));
}

export async function peekFomoScanTraderBoard(window: LeaderboardWindow = "24h") {
  const cached = await readFomoLeaderboard(window);
  if (cached?.entries?.length) {
    return {
      ok: true as const,
      data: normalizeBoard(cached, cached.board || "traders"),
      asOf: null,
      stale: true,
    };
  }
  return fomoscanFetch<FomoScanBoard>(
    `/v2/leaderboard/traders-fomoscan?window=${encodeURIComponent(window)}`,
    {
      cacheMs: FOMOSCAN_CACHE_MS.leaderboard,
      lastGoodKey: `board:traders-fomoscan:${window}`,
      live: false,
    },
  ).then((ours) => (ours.ok ? { ...ours, data: normalizeBoard(ours.data, "traders-fomoscan") } : ours));
}

export function getFomoScanUserByHandle(handle: string) {
  const clean = handle.replace(/^@/, "");
  return fomoscanFetch<FomoScanUser>(`/v2/user/handle/${encodeURIComponent(clean)}`, {
    cacheMs: FOMOSCAN_CACHE_MS.user,
    lastGoodKey: `user:handle:${clean.toLowerCase()}`,
    live: false,
  });
}

export function getFomoScanUserByWallet(address: string) {
  return fomoscanFetch<FomoScanUser>(`/v2/user/wallet/${encodeURIComponent(address)}`, {
    cacheMs: FOMOSCAN_CACHE_MS.user,
    lastGoodKey: `user:wallet:${address}`,
    live: false,
  });
}

export function getFomoScanUserById(id: string) {
  return fomoscanFetch<FomoScanUser>(`/v2/user/id/${encodeURIComponent(id)}`, {
    cacheMs: FOMOSCAN_CACHE_MS.user,
    lastGoodKey: `user:id:${id}`,
    live: false,
  });
}

export function resolveFomoScanHandle(handle: string) {
  return fomoscanFetch<FomoScanUser>(
    `/v2/user/handle/${encodeURIComponent(handle.replace(/^@/, ""))}/resolve`,
    { method: "POST", live: false },
  );
}

export function getFomoScanUserPnl(handle: string) {
  const clean = handle.replace(/^@/, "");
  return fomoscanFetch<FomoScanPnl>(`/v2/user/handle/${encodeURIComponent(clean)}/pnl`, {
    cacheMs: FOMOSCAN_CACHE_MS.pnl,
    lastGoodKey: `pnl:${clean.toLowerCase()}`,
    live: false,
  });
}

async function thesesFromLastGood(mint?: string): Promise<FomoScanResult<FomoScanThesisPage> | null> {
  const cached = await readFomoTheses({ mint, limit: 40 });
  if (!cached.length) return null;
  return {
    ok: true,
    data: normalizeThesisPage({ items: cached, tokenAddress: mint }),
    asOf: null,
    stale: true,
  };
}

async function thesesAfterMiss(mint?: string): Promise<FomoScanResult<FomoScanThesisPage>> {
  const lastGood = await thesesFromLastGood(mint);
  if (lastGood) return lastGood;
  const harvested = await harvestPublicSocial().catch(() => null);
  if (harvested && harvested.theses > 0) {
    const after = await thesesFromLastGood(mint);
    if (after) return after;
  }
  return cacheEmpty<FomoScanThesisPage>();
}

export async function getFomoScanTheses(before?: string) {
  const query = before ? `?before=${encodeURIComponent(before)}` : "";
  const result = await fomoscanFetch<unknown>(`/v2/thesis${query}`, {
    cacheMs: FOMOSCAN_CACHE_MS.thesis,
    lastGoodKey: `thesis:list:${before ?? ""}`,
    live: true,
  });
  if (result.ok) {
    const page = normalizeThesisPage(result.data);
    if (page.items.length) {
      void writeFomoTheses(page.items);
      return { ...result, data: page };
    }
  }
  const fallback = await thesesAfterMiss();
  if (fallback.ok) return fallback;
  return result.ok ? { ...result, data: normalizeThesisPage(result.data) } : result;
}

export async function getFomoScanTokenTheses(tokenAddress: string, before?: string) {
  const query = before ? `?before=${encodeURIComponent(before)}` : "";
  const result = await fomoscanFetch<unknown>(
    `/v2/thesis/token/${encodeURIComponent(tokenAddress)}${query}`,
    {
      cacheMs: FOMOSCAN_CACHE_MS.thesis,
      lastGoodKey: `thesis:token:${tokenAddress}:${before ?? ""}`,
      live: true,
    },
  );
  if (result.ok) {
    const page = normalizeThesisPage({ ...(asRecord(result.data) ?? {}), tokenAddress });
    if (page.items.length) {
      void writeFomoTheses(page.items);
      return { ...result, data: page };
    }
  }
  const fallback = await thesesAfterMiss(tokenAddress);
  if (fallback.ok) return fallback;
  return result.ok ? { ...result, data: normalizeThesisPage(result.data) } : result;
}

export function getFomoScanUserTheses(id: string, before?: string) {
  const query = before ? `?before=${encodeURIComponent(before)}` : "";
  return fomoscanFetch<FomoScanThesisPage>(`/v2/thesis/user/${encodeURIComponent(id)}${query}`, {
    cacheMs: FOMOSCAN_CACHE_MS.thesis,
    lastGoodKey: `thesis:user:${id}:${before ?? ""}`,
    live: true,
  }).then((result) => {
    if (!result.ok) return result;
    const page = normalizeThesisPage(result.data);
    if (page.items.length) void writeFomoTheses(page.items);
    return { ...result, data: page };
  });
}

export async function getFomoScanTraderBoard(window: LeaderboardWindow = "24h") {
  const live = await fomoscanFetch<FomoScanBoard>(
    `/v2/leaderboard/traders-fomoscan?window=${encodeURIComponent(window)}`,
    {
      cacheMs: FOMOSCAN_CACHE_MS.leaderboard,
      lastGoodKey: `board:traders-fomoscan:${window}`,
      live: true,
    },
  );
  if (live.ok) {
    const board = normalizeBoard(live.data, "traders-fomoscan");
    if (board.entries.length) return { ...live, data: board };
  }
  const cached = await readFomoLeaderboard(window);
  if (cached?.entries?.length) {
    return {
      ok: true as const,
      data: normalizeBoard(cached, cached.board || "traders"),
      asOf: null,
      stale: true,
    };
  }
  const harvested = await harvestPublicSocial().catch(() => null);
  const board = harvested?.boards[window];
  if (board?.entries.length) {
    return { ok: true as const, data: normalizeBoard(board, "traders"), asOf: null, stale: true };
  }
  return live.ok ? { ...live, data: normalizeBoard(live.data, "traders") } : live;
}

export async function getFomoScanTrendingTokens() {
  return peekFomoScanTrendingTokens();
}

export async function getFomoScanMostHeldTokens() {
  return peekFomoScanMostHeldTokens();
}

export function getFomoScanMe() {
  return fomoscanFetch<Record<string, unknown>>("/v2/me", {
    cacheMs: FOMOSCAN_CACHE_MS.me,
    lastGoodKey: "me",
    live: false,
  });
}

function mappedUser(result: FomoScanResult<FomoScanUser>): FomoScanResult<FomoScanUser> {
  if (!result.ok) return result;
  const user = normalizeUser(result.data);
  if (user) return { ...result, data: user };
  return {
    ok: false,
    status: 502,
    code: "invalid_user",
    message: "FomoScan returned a user payload we could not map (no handle or id).",
    pending: result.data,
  };
}

export async function liveFomoScanUser(idOrHandle: string): Promise<FomoScanResult<FomoScanUser>> {
  const raw = idOrHandle.replace(/^@/, "").trim();
  if (!raw) {
    return { ok: false, status: 400, code: "invalid_handle", message: "Handle required." };
  }
  if (fomoscanQuotaBlocked() || providerOpen("fomoscan")) {
    return { ok: false, status: 402, code: "QUOTA_EXCEEDED", message: lastQuotaMessage };
  }
  const auth = fomoAuth();
  if (!auth) {
    return { ok: false, status: 401, code: "no_key", message: "FomoScan key missing." };
  }
  const path = UUID_RE.test(raw)
    ? `/v2/user/id/${encodeURIComponent(raw)}`
    : `/v2/user/handle/${encodeURIComponent(raw)}`;
  const result = await providerGetJson<unknown>({
    provider: "fomoscan",
    resource: path,
    url: `${fomoBase()}${path}`,
    headers: auth,
    timeoutMs: FOMO_BUDGET_MS,
  });
  if (!result.ok) {
    if (result.status === 402 || result.status === 429) {
      quotaBlockedUntil = Date.now() + 120_000;
      lastQuotaMessage = "This feed is paused";
    }
    return { ok: false, status: result.status, code: result.code, message: result.message };
  }
  const unwrapped = unwrap(result.data);
  const user = normalizeUser(unwrapped.data);
  if (!user) {
    return {
      ok: false,
      status: 502,
      code: "invalid_user",
      message: "FomoScan returned a user payload we could not map (no handle or id).",
    };
  }
  void writeProviderCache("fomoscan", path, path, unwrapped.data, FOMOSCAN_CACHE_MS.user);
  return { ok: true, data: user, asOf: unwrapped.asOf, stale: false };
}

export async function liveFomoScanPnl(handle: string): Promise<FomoScanResult<FomoScanPnl>> {
  const clean = handle.replace(/^@/, "").trim();
  if (!clean) {
    return { ok: false, status: 400, code: "invalid_handle", message: "Handle required." };
  }
  if (fomoscanQuotaBlocked() || providerOpen("fomoscan")) {
    return { ok: false, status: 402, code: "QUOTA_EXCEEDED", message: lastQuotaMessage };
  }
  const result = await fomoscanFetch<FomoScanPnl>(`/v2/user/handle/${encodeURIComponent(clean)}/pnl`, {
    cacheMs: FOMOSCAN_CACHE_MS.pnl,
    lastGoodKey: `pnl:${clean.toLowerCase()}`,
    live: true,
  });
  if (!result.ok) return result;
  const pnl = normalizePnl(result.data);
  if (!pnl) {
    return { ok: false, status: 502, code: "invalid_pnl", message: "FomoScan PnL could not be mapped." };
  }
  return { ...result, data: pnl };
}

export async function resolveFomoScanTrader(idOrHandle: string): Promise<FomoScanResult<FomoScanUser>> {
  const raw = idOrHandle.replace(/^@/, "").trim();
  if (!raw) {
    return { ok: false, status: 400, code: "invalid_handle", message: "Handle required." };
  }
  const cached = await readFomoTrader(raw);
  if (cached) {
    return { ok: true, data: cached, asOf: null, stale: true };
  }
  const looksUuid = UUID_RE.test(raw);
  if (looksUuid) {
    const byId = mappedUser(await getFomoScanUserById(raw));
    if (byId.ok) return byId;
  }
  const byHandle = mappedUser(await getFomoScanUserByHandle(raw));
  if (byHandle.ok) return byHandle;
  if (!looksUuid && byHandle.status === 404) {
    const byId = mappedUser(await getFomoScanUserById(raw));
    if (byId.ok) return byId;
  }
  return byHandle;
}

export async function readThesisPage(
  result: FomoScanResult<FomoScanThesisPage>,
): Promise<FomoScanResult<FomoScanThesisPage>> {
  if (!result.ok) return result;
  return { ...result, data: normalizeThesisPage(result.data) };
}
