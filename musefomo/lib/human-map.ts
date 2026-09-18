import { LEADERBOARD_WINDOWS } from "@/lib/constants";
import type { FomoScanBoardEntry, FomoScanPnl, FomoScanThesis, FomoScanUser, LeaderboardWindow } from "@/lib/types";

export type HumanProfileSource = "fomoscan" | "fomo-public" | "cache";

export type HumanProfileStats = {
  pnl: number | null;
  volume: number | null;
  trades: number | null;
  winRate: number | null;
  rank: number | null;
  followers: number | null;
  returnPct: number | null;
  window: LeaderboardWindow | null;
};

export type HumanEquityPoint = { t: number; v: number };

export type HumanBookRow = {
  id: string;
  symbol: string | null;
  mint: string | null;
  image: string | null;
  valueUsd: number | null;
  pnlUsd: number | null;
  side: "buy" | "sell" | "closed" | null;
  at: number | null;
};

export function mergeFomoUsers(prev: FomoScanUser | null, next: FomoScanUser): FomoScanUser {
  if (!prev) return next;
  return {
    id: next.id || prev.id,
    handle: next.handle || prev.handle,
    name: next.name ?? prev.name,
    bio: next.bio ?? prev.bio,
    banner: next.banner ?? prev.banner,
    profilePicture: next.profilePicture ?? prev.profilePicture,
    twitter: next.twitter ?? prev.twitter,
    solanaAddress: next.solanaAddress ?? prev.solanaAddress,
    evmAddress: next.evmAddress ?? prev.evmAddress,
    followers: next.followers ?? prev.followers,
    socials: next.socials ?? prev.socials,
    source: next.source ?? prev.source ?? "fomoscan",
  };
}

export function findBoardTrader(
  boards: Partial<Record<LeaderboardWindow, { entries?: FomoScanBoardEntry[] | null }>> | null | undefined,
  handle: string,
): { entry: FomoScanBoardEntry; window: LeaderboardWindow } | null {
  const key = handle.replace(/^@/, "").trim().toLowerCase();
  if (!key || !boards) return null;
  for (const window of LEADERBOARD_WINDOWS) {
    const entry = boards[window]?.entries?.find(
      (row) => (row.handle ?? "").toLowerCase() === key || (row.id ?? "").toLowerCase() === key,
    );
    if (entry) return { entry, window };
  }
  return null;
}

export function thesesForAuthor(items: FomoScanThesis[], trader: { id: string; handle: string }): FomoScanThesis[] {
  const keys = new Set(
    [trader.handle, trader.id]
      .map((value) => value.replace(/^@/, "").trim().toLowerCase())
      .filter(Boolean),
  );
  if (!keys.size) return [];
  return items.filter((item) => {
    const handle = (item.authorHandle ?? "").replace(/^@/, "").trim().toLowerCase();
    const id = (item.authorId ?? "").trim().toLowerCase();
    return (handle && keys.has(handle)) || (id && keys.has(id));
  });
}

export function userFromHarvestItems(handle: string, items: FomoScanThesis[]): FomoScanUser | null {
  const key = handle.replace(/^@/, "").trim().toLowerCase();
  if (!key) return null;
  const item = items.find((row) => {
    const author = (row.authorHandle ?? "").replace(/^@/, "").trim().toLowerCase();
    const id = (row.authorId ?? "").trim().toLowerCase();
    return author === key || id === key;
  });
  if (!item) return null;
  const found = item.authorHandle || item.authorId || handle;
  return {
    id: item.authorId || found,
    handle: item.authorHandle || found,
    name: item.authorName,
    bio: null,
    banner: null,
    profilePicture: item.authorAvatar ?? null,
    twitter: null,
    solanaAddress: null,
    evmAddress: null,
    followers: null,
    source: "fomoscan",
  };
}

export function userFromBoardEntry(entry: FomoScanBoardEntry): FomoScanUser | null {
  const handle = entry.handle || entry.id;
  if (!handle) return null;
  return {
    id: entry.id || handle,
    handle,
    name: entry.label,
    bio: null,
    banner: null,
    profilePicture: entry.avatarUrl,
    twitter: null,
    solanaAddress: null,
    evmAddress: null,
    followers: entry.followers,
    source: "fomoscan",
  };
}

export function statsFromBoardEntry(
  entry: FomoScanBoardEntry,
  window: LeaderboardWindow | null = null,
): HumanProfileStats {
  return {
    pnl: entry.pnl,
    volume: entry.volume,
    trades: entry.numTrades,
    winRate: null,
    rank: entry.rank,
    followers: entry.followers,
    returnPct: null,
    window,
  };
}

export function statsFromPnl(pnl: FomoScanPnl, window: LeaderboardWindow = "24h"): HumanProfileStats {
  const day = pnl.windows[window] ?? pnl.windows["24h"] ?? pnl.windows.all;
  return {
    pnl: day?.netUsd ?? null,
    volume: day?.volumeUsd ?? null,
    trades: day?.trades ?? null,
    winRate: null,
    rank: day?.rank ?? null,
    followers: pnl.followers,
    returnPct: day?.returnPct ?? null,
    window,
  };
}

export function mergeStats(
  primary: HumanProfileStats | null,
  fallback: HumanProfileStats | null,
): HumanProfileStats | null {
  if (!primary && !fallback) return null;
  if (!primary) return fallback;
  if (!fallback) return primary;
  return {
    pnl: primary.pnl ?? fallback.pnl,
    volume: primary.volume ?? fallback.volume,
    trades: primary.trades ?? fallback.trades,
    winRate: primary.winRate ?? fallback.winRate,
    rank: primary.rank ?? fallback.rank,
    followers: primary.followers ?? fallback.followers,
    returnPct: primary.returnPct ?? fallback.returnPct,
    window: primary.window ?? fallback.window,
  };
}

export function statsHaveValues(stats: HumanProfileStats | null): boolean {
  if (!stats) return false;
  return (
    stats.pnl != null ||
    stats.volume != null ||
    stats.trades != null ||
    stats.winRate != null ||
    stats.rank != null ||
    stats.followers != null ||
    stats.returnPct != null
  );
}

export function bookFromTheses(items: FomoScanThesis[]): {
  positions: HumanBookRow[];
  swaps: HumanBookRow[];
} {
  const latest = new Map<string, FomoScanThesis>();
  for (const item of items) {
    if (item.closedAt != null) continue;
    if (item.holdingsUsd == null && item.tokenAmount == null) continue;
    const key = item.tokenAddress ?? item.id;
    const prev = latest.get(key);
    if (!prev || (item.fomoCreatedAt ?? 0) > (prev.fomoCreatedAt ?? 0)) latest.set(key, item);
  }
  const positions = [...latest.values()].map((item) => thesisBookRow(item, "position"));
  const swaps = items
    .filter((item) => item.authorTradeUsd != null)
    .slice()
    .sort((a, b) => (b.fomoCreatedAt ?? 0) - (a.fomoCreatedAt ?? 0))
    .map((item) => thesisBookRow(item, "swap"));
  return { positions, swaps };
}

function thesisBookRow(item: FomoScanThesis, kind: "position" | "swap"): HumanBookRow {
  return {
    id: `${kind}:${item.id}`,
    symbol: item.tokenSymbol,
    mint: item.tokenAddress,
    image: item.tokenImage ?? null,
    valueUsd: kind === "position" ? item.holdingsUsd : item.authorTradeUsd,
    pnlUsd: item.unrealizedPnlUsd ?? item.realizedPnlUsd ?? item.pnl,
    side: item.closedAt != null ? "closed" : null,
    at: item.fomoCreatedAt,
  };
}

export function parseEquitySeries(raw: unknown): HumanEquityPoint[] | null {
  if (!Array.isArray(raw) || raw.length < 2) return null;
  const points: HumanEquityPoint[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const t = finite(rec.t ?? rec.timestamp ?? rec.time ?? rec.at);
    const v = finite(rec.v ?? rec.equity ?? rec.pnl ?? rec.value ?? rec.netUsd);
    if (t == null || v == null) continue;
    points.push({ t, v });
  }
  if (points.length < 2) return null;
  return points.sort((a, b) => a.t - b.t);
}

export function parseFamilyUser(raw: unknown, handle: string): FomoScanUser | null {
  const row = walkHandleRecord(raw, handle);
  if (!row) return null;
  const foundHandle = stringField(row, ["handle", "userHandle"]) ?? handle;
  const id = stringField(row, ["id", "userId"]) ?? foundHandle;
  return {
    id,
    handle: foundHandle,
    name: stringField(row, ["name", "displayName"]),
    bio: stringField(row, ["bio", "description"]),
    banner: stringField(row, ["banner", "coverPhotoLink"]),
    profilePicture: stringField(row, ["profilePicture", "profilePictureLink", "avatarUrl", "avatar"]),
    twitter: stringField(row, ["twitter"]),
    solanaAddress: stringField(row, ["solanaAddress", "wallet"]),
    evmAddress: stringField(row, ["evmAddress"]),
    followers: finite(row.followers),
    source: "fomoscan",
  };
}

function walkHandleRecord(raw: unknown, handle: string): Record<string, unknown> | null {
  const want = handle.replace(/^@/, "").trim().toLowerCase();
  const seen = new Set<unknown>();
  const stack: unknown[] = [raw];
  while (stack.length) {
    const cur = stack.pop();
    if (!cur || typeof cur !== "object" || seen.has(cur)) continue;
    seen.add(cur);
    if (Array.isArray(cur)) {
      stack.push(...cur);
      continue;
    }
    const rec = cur as Record<string, unknown>;
    const found = stringField(rec, ["handle", "userHandle"]);
    if (found && found.replace(/^@/, "").toLowerCase() === want) return rec;
    stack.push(...Object.values(rec));
  }
  return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
}

function stringField(row: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function finite(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}
