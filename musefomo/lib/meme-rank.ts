import { BONK_MINT, JUP_MINT, SOL_MINT, TRUMP_MINT, USDC_MINT, WIF_MINT } from "@/lib/constants";
import { looksLikeEvm, looksLikeMint } from "@/lib/format";
import { dexLogo } from "@/lib/known-mints";
import { asHttpsLogo } from "@/lib/token-logo";
import type { DiscoverTokenRow } from "@/lib/types";

export const SKIP_TREND_MINTS = new Set([SOL_MINT, USDC_MINT]);

export const PAD_TREND_SYMBOLS = new Set([
  "LONGER",
  "NVDAX3L",
  "REDDITPAD",
  "WIKIPAD",
  "ROBLOXPAD",
  "SKINPAD",
  "GITPAD",
  "SNAPPAD",
  "PONS",
  "SOL",
  "WSOL",
  "USDC",
  "USDT",
]);

export const SEED_MEME_MINTS = [WIF_MINT, BONK_MINT, TRUMP_MINT, JUP_MINT];

export type MemeVia = "pump" | "gecko" | "dex" | "jupiter" | "birdeye" | "book" | "quality";

export type MemeSeed = DiscoverTokenRow & {
  liquidityUsd?: number | null;
  pairCreatedAt?: number | null;
  via?: MemeVia;
};

export type QualityIndex = {
  mints: Set<string>;
  symbols: Set<string>;
  logos: Map<string, string>;
};

const DAY_MS = 86_400_000;
const MAX_UNLISTED_PUMP = 6;
const TARGET_ROWS = 48;
const ANCIENT_MS = 400 * DAY_MS;

export function trendSymbol(value: string | null | undefined): string {
  return (value ?? "").replace(/^\$/, "").trim().toUpperCase();
}

export function isPadTrendSymbol(value: string | null | undefined): boolean {
  return PAD_TREND_SYMBOLS.has(trendSymbol(value));
}

export function isPricedSolanaMeme(row: DiscoverTokenRow): boolean {
  if (!looksLikeMint(row.mint) || looksLikeEvm(row.mint) || row.priceUsd == null) return false;
  if (row.chain === "robinhood") return false;
  if (!(row.symbol || row.name)) return false;
  if (SKIP_TREND_MINTS.has(row.mint)) return false;
  if (isPadTrendSymbol(row.symbol) || isPadTrendSymbol(row.name)) return false;
  return true;
}

function liquidityOf(row: MemeSeed): number {
  return row.liquidityUsd ?? 0;
}

function volumeOf(row: MemeSeed): number {
  return row.volumeUsd ?? 0;
}

function listedOf(row: MemeSeed, quality: QualityIndex): boolean {
  if (quality.mints.has(row.mint)) return true;
  const symbol = trendSymbol(row.symbol);
  return symbol.length > 0 && quality.symbols.has(symbol);
}

function recencyBoost(row: MemeSeed, listed: boolean): number {
  const created = row.pairCreatedAt;
  if (created == null || !Number.isFinite(created) || created <= 0) return listed ? 0.2 : 0;
  const age = Date.now() - created;
  if (age < 14 * DAY_MS) return 1.15;
  if (age < 90 * DAY_MS) return 0.55;
  if (!listed && age > ANCIENT_MS && volumeOf(row) < 50_000) return -1.4;
  return 0;
}

export function memeScore(row: MemeSeed, quality: QualityIndex, sources = 1): number {
  const listed = listedOf(row, quality);
  const volume = Math.max(0, volumeOf(row));
  const liquidity = Math.max(0, liquidityOf(row));
  const pumpOnly = row.via === "pump" && !listed;
  return (
    Math.log1p(volume) +
    0.55 * Math.log1p(liquidity) +
    (listed ? 2.4 : 0) +
    (sources > 1 ? 0.85 : 0) +
    recencyBoost(row, listed) -
    (pumpOnly ? 0.85 : 0)
  );
}

function betterSeed(prev: MemeSeed, next: MemeSeed, quality: QualityIndex): MemeSeed {
  const listedPrev = listedOf(prev, quality);
  const listedNext = listedOf(next, quality);
  const merged: MemeSeed = {
    ...prev,
    symbol: next.symbol ?? prev.symbol,
    name: next.name ?? prev.name,
    imageUrl:
      asHttpsLogo(prev.imageUrl) ?? asHttpsLogo(next.imageUrl) ?? asHttpsLogo(quality.logos.get(prev.mint)),
    priceUsd: next.priceUsd ?? prev.priceUsd,
    volumeUsd: Math.max(volumeOf(prev), volumeOf(next)) || prev.volumeUsd || next.volumeUsd,
    marketCap: next.marketCap ?? prev.marketCap,
    priceChange24h: next.priceChange24h ?? prev.priceChange24h,
    liquidityUsd: Math.max(liquidityOf(prev), liquidityOf(next)) || prev.liquidityUsd || next.liquidityUsd,
    pairCreatedAt: prev.pairCreatedAt ?? next.pairCreatedAt,
    pairAddress: prev.pairAddress ?? next.pairAddress,
    via: listedNext && !listedPrev ? next.via : prev.via ?? next.via,
  };
  if (volumeOf(next) > volumeOf(prev) && (listedNext || !listedPrev || next.via !== "pump")) {
    return {
      ...merged,
      ...next,
      imageUrl:
        asHttpsLogo(next.imageUrl) ?? asHttpsLogo(prev.imageUrl) ?? asHttpsLogo(quality.logos.get(next.mint)),
      liquidityUsd: Math.max(liquidityOf(prev), liquidityOf(next)) || next.liquidityUsd || prev.liquidityUsd,
      pairCreatedAt: next.pairCreatedAt ?? prev.pairCreatedAt,
      via: next.via ?? prev.via,
    };
  }
  return merged;
}

function pickUnique(rows: MemeSeed[], limit: number): MemeSeed[] {
  const seenMint = new Set<string>();
  const seenSymbol = new Set<string>();
  const out: MemeSeed[] = [];
  for (const row of rows) {
    if (seenMint.has(row.mint)) continue;
    const symbol = trendSymbol(row.symbol);
    if (symbol && seenSymbol.has(symbol)) continue;
    seenMint.add(row.mint);
    if (symbol) seenSymbol.add(symbol);
    out.push(row);
    if (out.length >= limit) break;
  }
  return out;
}

export function rankLiveMemes(rows: MemeSeed[], quality: QualityIndex, limit = TARGET_ROWS): DiscoverTokenRow[] {
  const sourceCounts = new Map<string, number>();
  for (const row of rows) {
    if (!isPricedSolanaMeme(row) || volumeOf(row) <= 0) continue;
    sourceCounts.set(row.mint, (sourceCounts.get(row.mint) ?? 0) + 1);
  }

  const byMint = new Map<string, MemeSeed>();
  for (const row of rows) {
    if (!isPricedSolanaMeme(row) || volumeOf(row) <= 0) continue;
    const next: MemeSeed = {
      ...row,
      imageUrl: asHttpsLogo(row.imageUrl) ?? asHttpsLogo(quality.logos.get(row.mint)) ?? dexLogo(row.mint),
    };
    const prev = byMint.get(next.mint);
    byMint.set(next.mint, prev ? betterSeed(prev, next, quality) : next);
  }

  const scored = [...byMint.values()]
    .map((row) => ({
      row,
      listed: listedOf(row, quality),
      score: memeScore(row, quality, sourceCounts.get(row.mint) ?? 1),
    }))
    .sort((a, b) => b.score - a.score || volumeOf(b.row) - volumeOf(a.row));

  const listed = pickUnique(
    scored.filter((item) => item.listed).map((item) => item.row),
    28,
  );
  const organic = pickUnique(
    scored.filter((item) => !item.listed && item.row.via !== "pump").map((item) => item.row),
    28,
  );
  const pump = pickUnique(
    scored.filter((item) => !item.listed && item.row.via === "pump").map((item) => item.row),
    MAX_UNLISTED_PUMP,
  );

  const merged = pickUnique([...listed, ...organic, ...pump], limit);
  return merged.map((row, index) => ({
    rank: index + 1,
    mint: row.mint,
    symbol: row.symbol,
    name: row.name,
    imageUrl: asHttpsLogo(row.imageUrl) ?? dexLogo(row.mint),
    priceUsd: row.priceUsd,
    volumeUsd: row.volumeUsd,
    volumeLamports: row.volumeLamports ?? null,
    marketCap: row.marketCap,
    priceChange24h: row.priceChange24h,
    holders: row.holders ?? null,
    trades: row.trades ?? null,
    pairAddress: row.pairAddress ?? null,
    source: row.source ?? "market",
  }));
}
