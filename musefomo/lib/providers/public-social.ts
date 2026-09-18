import { cachePeek, cacheWrapIf } from "@/lib/cache";
import { FOMO_BUDGET_MS, HOUR_MS, LEADERBOARD_WINDOWS } from "@/lib/constants";
import { findBoardTrader, parseEquitySeries, parseFamilyUser, userFromBoardEntry } from "@/lib/human-map";
import { writeFomoLeaderboard, writeFomoTheses, writeFomoTrader, writeProviderCache } from "@/lib/providers/store";
import type { FomoScanBoard, FomoScanBoardEntry, FomoScanThesis, FomoScanUser, LeaderboardWindow } from "@/lib/types";

const PUBLIC_LEADERBOARD_URL = "https://www.fomoscan.sh/leaderboard";
const PAGE_MS = 3_000;

export type PublicTrader = {
  handle: string;
  displayName: string | null;
  avatar: string | null;
  pnlUsd: number;
  volumeUsd: number | null;
  trades: number | null;
  followers: number | null;
};

export function flightBlobFromHtml(html: string): string {
  const pushes = [...html.matchAll(/self\.__next_f\.push\(\[(\d+),("[\s\S]*?")\]\)/g)];
  let blob = "";
  for (const push of pushes) {
    try {
      blob += JSON.parse(push[2]);
    } catch {
      blob += push[2];
    }
  }
  return blob;
}

function nextDataFromHtml(html: string): string {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  return match?.[1] ?? "";
}

function remixStreamFromHtml(html: string): string {
  const chunks: string[] = [];
  for (const match of html.matchAll(/streamController\.enqueue\(("[\s\S]*?")\)/g)) {
    try {
      chunks.push(JSON.parse(match[1]));
    } catch {
      chunks.push(match[1]);
    }
  }
  return chunks.join("");
}

/** Next flight + __NEXT_DATA__ + Remix enqueue + raw HTML. JSON APIs are SPA/431. */
export function payloadBlobFromHtml(html: string): string {
  return [flightBlobFromHtml(html), nextDataFromHtml(html), remixStreamFromHtml(html), html]
    .filter((part) => part.length)
    .join("\n");
}

export function windowSlice(blob: string, window: LeaderboardWindow): string {
  const start = blob.indexOf(`"${window}":{`);
  if (start < 0) return "";
  let end = blob.length;
  for (const key of LEADERBOARD_WINDOWS) {
    if (key === window) continue;
    const idx = blob.indexOf(`"${key}":{`, start + 4);
    if (idx > start && idx < end) end = idx;
  }
  return blob.slice(start, end);
}

export function extractPublicTraders(blob: string): PublicTrader[] {
  const parts = blob.split('{"handle":"').slice(1);
  const seen = new Set<string>();
  const rows: PublicTrader[] = [];
  for (const part of parts) {
    const end = part.indexOf('"');
    const handle = end >= 0 ? part.slice(0, end).trim() : "";
    if (!handle || handle.length > 40 || seen.has(handle.toLowerCase())) continue;
    const pnlUsd = Number(/"pnlUsd":(-?[0-9.]+)/.exec(part)?.[1] ?? NaN);
    if (!Number.isFinite(pnlUsd)) continue;
    const displayRaw = /"displayName":("((?:\\.|[^"\\])*)"|null)/.exec(part);
    const avatarRaw = /"avatar":("((?:\\.|[^"\\])*)"|null)/.exec(part);
    const volumeUsd = Number(/"volumeUsd":(-?[0-9.]+)/.exec(part)?.[1] ?? NaN);
    const trades = Number(/"trades":(\d+)/.exec(part)?.[1] ?? NaN);
    const followers = Number(/"followers":(\d+)/.exec(part)?.[1] ?? NaN);
    seen.add(handle.toLowerCase());
    rows.push({
      handle,
      displayName: displayRaw?.[2] ?? null,
      avatar: avatarRaw?.[2] ?? null,
      pnlUsd,
      volumeUsd: Number.isFinite(volumeUsd) ? volumeUsd : null,
      trades: Number.isFinite(trades) ? trades : null,
      followers: Number.isFinite(followers) ? followers : null,
    });
  }
  return rows.sort((a, b) => b.pnlUsd - a.pnlUsd);
}

export function tradersToBoard(window: LeaderboardWindow, traders: PublicTrader[]): FomoScanBoard {
  const entries: FomoScanBoardEntry[] = traders.map((row, index) => ({
    rank: index + 1,
    id: row.handle,
    handle: row.handle,
    label: row.displayName,
    avatarUrl: row.avatar,
    pnl: row.pnlUsd,
    volume: row.volumeUsd,
    followers: row.followers,
    numTrades: row.trades,
    memberCount: null,
    marketCap: null,
    price: null,
    liquidity: null,
  }));
  return {
    board: "traders",
    window,
    capturedAt: Date.now(),
    count: entries.length,
    entries,
  };
}

export function boardsFromPublicHtml(html: string): Partial<Record<LeaderboardWindow, FomoScanBoard>> {
  const blob = payloadBlobFromHtml(html);
  const out: Partial<Record<LeaderboardWindow, FomoScanBoard>> = {};
  for (const window of LEADERBOARD_WINDOWS) {
    const traders = extractPublicTraders(windowSlice(blob, window));
    if (traders.length) out[window] = tradersToBoard(window, traders);
  }
  if (!out["24h"]) {
    const loose = extractPublicTraders(blob);
    if (loose.length) out["24h"] = tradersToBoard("24h", loose);
  }
  return out;
}

function jsonStringField(window: string, key: string): string | null {
  const quoted = new RegExp(`"${key}":"((?:\\\\.|[^"\\\\])*)"`).exec(window);
  if (quoted?.[1]) return quoted[1].replace(/\\n/g, "\n").replace(/\\"/g, '"');
  const nulled = new RegExp(`"${key}":null`).exec(window);
  if (nulled) return null;
  return null;
}

function jsonNumberField(window: string, key: string): number | null {
  const raw = new RegExp(`"${key}":(-?\\d+(?:\\.\\d+)?)`).exec(window);
  if (!raw) return null;
  const n = Number(raw[1]);
  return Number.isFinite(n) ? n : null;
}

function nextThesisIndex(blob: string, from: number): number {
  const a = blob.indexOf('"thesis":"', from);
  const b = blob.indexOf('\\"thesis\\":\\"', from);
  if (a < 0) return b;
  if (b < 0) return a;
  return Math.min(a, b);
}

export function extractPublicTheses(blob: string): FomoScanThesis[] {
  const seen = new Set<string>();
  const rows: FomoScanThesis[] = [];
  let from = 0;
  while (from < blob.length) {
    const idx = nextThesisIndex(blob, from);
    if (idx < 0) break;
    const window = blob.slice(Math.max(0, idx - 900), Math.min(blob.length, idx + 900)).replace(/\\"/g, '"');
    const thesis = jsonStringField(window, "thesis")?.trim() ?? "";
    const handle = jsonStringField(window, "authorHandle") ?? jsonStringField(window, "handle");
    const id = jsonStringField(window, "id") ?? jsonStringField(window, "authorId");
    from = idx + 10;
    if (!thesis || !(handle || id)) continue;
    if (handle?.toLowerCase() === "igivethesis" && thesis.toLowerCase() === "igivethesis") continue;
    const key = `${(handle ?? id ?? "").toLowerCase()}:${thesis}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      id: id ?? `pub:${handle}:${rows.length}`,
      tokenAddress: jsonStringField(window, "tokenAddress"),
      tokenNetwork: jsonStringField(window, "tokenNetwork"),
      tokenSymbol: jsonStringField(window, "tokenSymbol"),
      authorId: jsonStringField(window, "authorId") ?? id,
      authorHandle: handle,
      authorName: jsonStringField(window, "authorName") ?? jsonStringField(window, "displayName"),
      authorAvatar: jsonStringField(window, "authorAvatar") ?? jsonStringField(window, "avatar") ?? jsonStringField(window, "profilePicture"),
      authorIsDev: null,
      thesis,
      likeCount: jsonNumberField(window, "likeCount"),
      holdingsUsd: jsonNumberField(window, "holdingsUsd"),
      authorTradeUsd: jsonNumberField(window, "authorTradeUsd"),
      pnl: jsonNumberField(window, "pnl"),
      realizedPnlUsd: jsonNumberField(window, "realizedPnlUsd"),
      unrealizedPnlUsd: jsonNumberField(window, "unrealizedPnlUsd"),
      percentageRealizedPnl: jsonNumberField(window, "percentageRealizedPnl"),
      percentageUnrealizedPnl: jsonNumberField(window, "percentageUnrealizedPnl"),
      tokenAmount: jsonNumberField(window, "tokenAmount"),
      closedAt: jsonNumberField(window, "closedAt"),
      fomoCreatedAt: jsonNumberField(window, "fomoCreatedAt") ?? jsonNumberField(window, "updatedAt"),
      updatedAt: jsonNumberField(window, "updatedAt"),
      source: "fomoscan",
    });
  }
  return rows;
}

const HANDLE_RE = /^[A-Za-z0-9_]{2,40}$/;

export function extractFamilyProfileHandles(html: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const match of html.matchAll(/@([A-Za-z0-9_]{2,40}) on fomo/gi)) {
    const handle = match[1];
    if (!handle || !HANDLE_RE.test(handle) || seen.has(handle.toLowerCase())) continue;
    seen.add(handle.toLowerCase());
    out.push(handle);
  }
  return out;
}

async function persistBoard(window: LeaderboardWindow, board: FomoScanBoard) {
  const path = `/v2/leaderboard/traders-fomoscan?window=${window}`;
  await writeFomoLeaderboard(window, board);
  await writeProviderCache("fomoscan", path, path, board, HOUR_MS);
}

export type PublicHarvest = {
  theses: number;
  ranks: number;
  pagesHit: number;
  boards: Partial<Record<LeaderboardWindow, FomoScanBoard>>;
  items: FomoScanThesis[];
};

export const emptyHarvest = (): PublicHarvest => ({ theses: 0, ranks: 0, pagesHit: 0, boards: {}, items: [] });

const HARVEST_CACHE_KEY = "public-social-harvest";

export function peekPublicHarvest(): PublicHarvest | null {
  return cachePeek<PublicHarvest>(HARVEST_CACHE_KEY)?.value ?? null;
}

export function harvestBoardTrader(handle: string, harvest: PublicHarvest | null) {
  if (!harvest) return null;
  const hit = findBoardTrader(harvest.boards, handle);
  if (!hit) return null;
  return { ...hit, items: harvest.items };
}

const PUBLIC_PAGES = [
  PUBLIC_LEADERBOARD_URL,
  "https://www.fomoscan.sh/",
  "https://fomoscan.sh/",
  "https://fomo.family/",
  "https://fomo.family/feed",
  "https://fomo.family/leaderboard",
  "https://fomo.family/theses",
  "https://www.fomo.family/feed",
  "https://www.fomo.family/leaderboard",
  "https://fomo.family/profile/Napoleone",
  "https://fomo.family/profile/humanbeingET",
  "https://fomo.family/profile/LateEarly",
] as const;

const SEED_HANDLES = ["Napoleone", "humanbeingET", "LateEarly"] as const;

async function fetchPublicHtml(url: string, ms = PAGE_MS): Promise<string | null> {
  const response = await fetch(url, {
    headers: {
      Accept: "text/html",
      "User-Agent": "MuseFOMO/1.0 (+https://musefomo.family)",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(ms),
  }).catch(() => null);
  if (!response?.ok) return null;
  return response.text();
}

function ingestHtml(
  html: string,
  boards: Partial<Record<LeaderboardWindow, FomoScanBoard>>,
  theses: FomoScanThesis[],
  seenThesis: Set<string>,
): number {
  let ranks = 0;
  const blob = payloadBlobFromHtml(html);
  const found = boardsFromPublicHtml(html);
  for (const window of LEADERBOARD_WINDOWS) {
    const board = found[window];
    if (!board?.entries.length || boards[window]?.entries.length) continue;
    boards[window] = board;
    ranks += board.entries.length;
    void persistBoard(window, board).catch(() => undefined);
  }
  for (const item of extractPublicTheses(blob)) {
    if (seenThesis.has(item.id)) continue;
    seenThesis.add(item.id);
    theses.push(item);
  }
  for (const handle of extractFamilyProfileHandles(html)) {
    const user = userFromBoardEntry({
      rank: 0,
      id: handle,
      handle,
      label: handle,
      avatarUrl: null,
      pnl: null,
      volume: null,
      followers: null,
      numTrades: null,
      memberCount: null,
      marketCap: null,
      price: null,
      liquidity: null,
    });
    if (user) void writeFomoTrader(user).catch(() => undefined);
  }
  return ranks;
}

async function followPublicProfiles(handles: string[]): Promise<string[]> {
  const unique = [...new Set(handles.map((h) => h.replace(/^@/, "").trim()).filter(Boolean))].slice(0, 8);
  const urls = unique.flatMap((handle) => [
    `https://fomo.family/profile/${encodeURIComponent(handle)}`,
    `https://www.fomoscan.sh/wallet-checker/${encodeURIComponent(handle)}`,
  ]);
  const pages = await Promise.all(urls.map((url) => fetchPublicHtml(url, PAGE_MS)));
  return pages.filter((html): html is string => Boolean(html));
}

async function runHarvest(): Promise<PublicHarvest> {
  const pages = await Promise.all(PUBLIC_PAGES.map((url) => fetchPublicHtml(url, PAGE_MS)));
  const boards: Partial<Record<LeaderboardWindow, FomoScanBoard>> = {};
  const theses: FomoScanThesis[] = [];
  const seenThesis = new Set<string>();
  let ranks = 0;
  let pagesHit = 0;
  for (const html of pages) {
    if (!html) continue;
    pagesHit += 1;
    ranks += ingestHtml(html, boards, theses, seenThesis);
  }
  const known = [
    ...SEED_HANDLES,
    ...(boards["24h"]?.entries ?? []).map((row) => row.handle).filter((h): h is string => Boolean(h)),
  ];
  void followPublicProfiles(known)
    .then((extra) => {
      for (const html of extra) ingestHtml(html, boards, theses, seenThesis);
      if (theses.length) void writeFomoTheses(theses).catch(() => undefined);
    })
    .catch(() => undefined);
  if (theses.length) {
    void writeFomoTheses(theses).catch(() => undefined);
    void writeProviderCache("fomoscan", "thesis-html", "public-harvest", theses, HOUR_MS);
  }
  return { theses: theses.length, ranks, pagesHit, boards, items: theses };
}

export async function harvestPublicSocial(): Promise<PublicHarvest> {
  return cacheWrapIf(HARVEST_CACHE_KEY, HOUR_MS, runHarvest, (row) => row.pagesHit > 0 || row.ranks > 0 || row.theses > 0);
}

export type PublicFamilyProfile = {
  user: FomoScanUser;
  equity: ReturnType<typeof parseEquitySeries>;
  raw: unknown;
};

/** Unauthenticated Fomo family JSON only. 401/431/HTML is a miss — never invent a book. */
export async function fetchPublicFamilyProfile(handle: string): Promise<PublicFamilyProfile | null> {
  const clean = handle.replace(/^@/, "").trim();
  if (!clean) return null;
  const urls = [
    `https://prod-api.fomo.family/v2/users/userHandle/${encodeURIComponent(clean)}`,
    `https://fomo.family/v2/users/userHandle/${encodeURIComponent(clean)}`,
  ];
  const results = await Promise.all(urls.map((url) => publicFamilyJson(url)));
  for (const body of results) {
    if (!body) continue;
    const user = parseFamilyUser(body, clean);
    if (!user) continue;
    const rec = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
    return {
      user,
      equity: parseEquitySeries(rec.equity ?? rec.equityCurve ?? rec.pnlSeries),
      raw: body,
    };
  }
  return null;
}

async function publicFamilyJson(url: string): Promise<unknown | null> {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "MuseFOMO/1.0 (+https://musefomo.family)",
      },
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(FOMO_BUDGET_MS),
    });
    if (response.status !== 200) return null;
    const type = response.headers.get("content-type") ?? "";
    if (!type.includes("json")) return null;
    return await response.json();
  } catch {
    return null;
  }
}
