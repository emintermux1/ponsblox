import { thesisAvatar } from "@/lib/avatars";
import { cacheDeletePrefix, cachePublic } from "@/lib/cache";
import { LIQUID_MINTS, TAPE_BUDGET_MS, TAPE_CACHE_MS, WHALE_BUY_USD } from "@/lib/constants";
import { listRecentConfirmedTrades } from "@/lib/db";
import { raceTimeout } from "@/lib/fast-fetch";
import { looksLikeMint } from "@/lib/format";
import { heliusPairSwaps } from "@/lib/helius";
import { getSolanaTrendingBoard, getSolUsd, getTokenMarket } from "@/lib/market";
import { mapPool } from "@/lib/pool";
import type { FomoScanThesis } from "@/lib/types";

export type WhalePrint = {
  id: string;
  usd: number;
  symbol: string | null;
  mint: string | null;
  handle: string | null;
  name: string | null;
  avatarUrl: string | null;
  source: "fomoscan" | "geckoterminal" | "helius" | "dflow" | "dexscreener";
  side: "buy" | "sell";
  at: number | null;
};

type GeckoPoolList = {
  data?: Array<{ attributes?: { address?: string; name?: string } }>;
};

type GeckoTrades = {
  data?: Array<{
    id?: string;
    attributes?: {
      kind?: string;
      volume_in_usd?: string;
      block_timestamp?: string;
      tx_hash?: string;
    };
  }>;
};

const localPrints: WhalePrint[] = [];
const GECKO_HEADERS = {
  Accept: "application/json",
  "User-Agent": "MuseFOMO/1.0 (+https://musefomo.family)",
};

export function rememberFillPrint(print: WhalePrint) {
  localPrints.unshift(print);
  if (localPrints.length > 40) localPrints.length = 40;
  cacheDeletePrefix("tape:");
}

export function listRememberedPrints(): WhalePrint[] {
  return localPrints.slice();
}

export function forgetTapeCaches() {
  cacheDeletePrefix("tape:");
  cacheDeletePrefix("helius:swaps:");
  cacheDeletePrefix("pool-trades:");
}

function asUsd(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value.replace(/[$,]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function asMs(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return value > 0 && value < 1e12 ? value * 1000 : value;
}

export function thesisTradeUsd(item: FomoScanThesis): number {
  const extra = item as FomoScanThesis & Record<string, unknown>;
  const keys = ["authorTradeUsd", "tradeUsd", "author_trade_usd", "trade_usd", "sizeUsd", "size_usd"] as const;
  for (const key of keys) {
    const usd = asUsd(key in extra ? extra[key] : null);
    if (usd > 0) return usd;
  }
  return 0;
}

function geckoSide(kind?: string): "buy" | "sell" | null {
  const value = kind?.toLowerCase();
  if (value === "buy") return "buy";
  if (value === "sell") return "sell";
  return null;
}

function compactPrints(rows: Array<WhalePrint | null | undefined>): WhalePrint[] {
  return rows.filter((row): row is WhalePrint => Boolean(row));
}

export function thesesOverWhale(items: FomoScanThesis[], avatars = new Map<string, string>()): WhalePrint[] {
  return items
    .map((item) => {
      const usd = thesisTradeUsd(item);
      return {
        id: `thesis:${item.id}`,
        usd,
        symbol: item.tokenSymbol,
        mint: item.tokenAddress,
        handle: item.authorHandle,
        name: item.authorName,
        avatarUrl: thesisAvatar(item, avatars),
        source: "fomoscan" as const,
        side: "buy" as const,
        at: asMs(item.fomoCreatedAt),
      };
    })
    .filter((row) => row.usd >= WHALE_BUY_USD);
}

function mergePrints(rows: WhalePrint[], minUsd = 0, side?: "buy" | "sell"): WhalePrint[] {
  const seen = new Set<string>();
  return [...localPrints, ...rows]
    .filter((row) => {
      if (row.usd < minUsd) return false;
      if (side && row.side !== side) return false;
      if (seen.has(row.id)) return false;
      seen.add(row.id);
      return true;
    })
    .sort((a, b) => (b.at ?? 0) - (a.at ?? 0))
    .slice(0, 40);
}

async function seedMints(): Promise<Array<{ mint: string; symbol: string | null }>> {
  const found = new Map<string, string | null>();
  const fallback = await raceTimeout(getSolanaTrendingBoard().catch(() => []), [], TAPE_BUDGET_MS);
  for (const entry of fallback) {
    if (looksLikeMint(entry.id) && !found.has(entry.id)) found.set(entry.id, entry.handle ?? entry.label);
  }
  for (const mint of LIQUID_MINTS) {
    if (!found.has(mint)) found.set(mint, null);
  }
  if (found.size < 8) {
    const boosts = await fetch("https://api.dexscreener.com/token-boosts/top/v1", {
      headers: { Accept: "application/json", "User-Agent": "MuseFOMO/1.0 (+https://musefomo.family)" },
      cache: "no-store",
      signal: AbortSignal.timeout(TAPE_BUDGET_MS),
    })
      .then((res) => (res.ok ? (res.json() as Promise<Array<{ chainId?: string; tokenAddress?: string }>>) : []))
      .catch(() => []);
    for (const row of Array.isArray(boosts) ? boosts : []) {
      if (row.chainId !== "solana" || !row.tokenAddress || !looksLikeMint(row.tokenAddress)) continue;
      if (!found.has(row.tokenAddress)) found.set(row.tokenAddress, null);
    }
  }
  return [...found.entries()].slice(0, 8).map(([mint, symbol]) => ({ mint, symbol }));
}

async function geckoPrints(mint: string, minUsd: number): Promise<WhalePrint[]> {
  const poolsRes = await fetch(`https://api.geckoterminal.com/api/v2/networks/solana/tokens/${mint}/pools`, {
    headers: GECKO_HEADERS,
    cache: "no-store",
    signal: AbortSignal.timeout(TAPE_BUDGET_MS),
  }).catch(() => null);
  if (!poolsRes?.ok) return [];
  const pools = (await poolsRes.json()) as GeckoPoolList;
  const pool = pools.data?.[0]?.attributes?.address;
  const symbol = pools.data?.[0]?.attributes?.name?.split(" / ")[0] ?? null;
  if (!pool) return [];
  const query = minUsd > 0 ? `?trade_volume_in_usd_greater_than=${minUsd}` : "";
  const tradesRes = await fetch(
    `https://api.geckoterminal.com/api/v2/networks/solana/pools/${pool}/trades${query}`,
    { headers: GECKO_HEADERS, cache: "no-store", signal: AbortSignal.timeout(TAPE_BUDGET_MS) },
  ).catch(() => null);
  if (!tradesRes?.ok) return [];
  const body = (await tradesRes.json()) as GeckoTrades;
  return compactPrints(
    (body.data ?? []).map((row) => {
      const side = geckoSide(row.attributes?.kind);
      const usd = Number(row.attributes?.volume_in_usd ?? 0);
      if (!side || !Number.isFinite(usd) || usd <= 0) return null;
      return {
        id: row.id ?? row.attributes?.tx_hash ?? `${mint}:${usd}:${row.attributes?.block_timestamp}`,
        usd,
        symbol,
        mint,
        handle: null,
        name: null,
        avatarUrl: null,
        source: "geckoterminal" as const,
        side,
        at: row.attributes?.block_timestamp ? Date.parse(row.attributes.block_timestamp) : null,
      };
    }),
  );
}

async function heliusPrints(mint: string): Promise<WhalePrint[]> {
  const [market, solUsd] = await Promise.all([getTokenMarket(mint), getSolUsd()]);
  const addresses = [market.pairAddress, mint].filter((value): value is string => Boolean(value));
  if (!addresses.length) return [];
  const batches = await Promise.all(
    addresses.map((pairAddress) =>
      heliusPairSwaps({
        pairAddress,
        mint,
        symbol: market.symbol,
        priceUsd: market.priceUsd,
        solUsd,
      }).catch(() => []),
    ),
  );
  const swaps = batches.flat();
  return swaps.map((row) => ({
    id: row.id,
    usd: row.usd,
    symbol: row.symbol ?? market.symbol,
    mint: row.mint,
    handle: null,
    name: null,
    avatarUrl: null,
    source: "helius" as const,
    side: row.side,
    at: row.at,
  }));
}

async function marketPrints(mints: Array<{ mint: string; symbol: string | null }>, minUsd: number): Promise<WhalePrint[]> {
  const batches = await mapPool(mints, 4, async (row) => {
    const [gecko, helius] = await Promise.all([
      geckoPrints(row.mint, minUsd).catch(() => []),
      heliusPrints(row.mint).catch(() => []),
    ]);
    return [...gecko, ...helius].map((print) => ({
      ...print,
      symbol: print.symbol ?? row.symbol,
    }));
  });
  return batches.flat();
}

async function localConfirmedPrints(): Promise<WhalePrint[]> {
  try {
    const [trades, solUsd] = await Promise.all([listRecentConfirmedTrades(20), getSolUsd()]);
    return compactPrints(
      trades.map((trade) => {
        const mint = trade.side === "buy" ? trade.outputMint : trade.inputMint;
        const lamports = Number(trade.side === "buy" ? (trade.actualInAmount ?? trade.requestedAmount) : (trade.actualOutAmount ?? "0"));
        const usd = solUsd != null && Number.isFinite(lamports) ? (lamports / 1e9) * solUsd : 0;
        if (usd <= 0) return null;
        return {
          id: trade.signature ?? `dflow:${trade.id}`,
          usd,
          symbol: null,
          mint,
          handle: null,
          name: null,
          avatarUrl: null,
          source: "dflow" as const,
          side: trade.side,
          at: trade.confirmedAt ? Date.parse(trade.confirmedAt) : Date.parse(trade.createdAt),
        };
      }),
    );
  } catch {
    return [];
  }
}

export async function listWhaleTape(): Promise<WhalePrint[]> {
  return cachePublic(
    "tape:whale:v3",
    TAPE_CACHE_MS,
    async () => {
      const [seeds, confirmed] = await Promise.all([seedMints(), localConfirmedPrints()]);
      const fromMarket = await marketPrints(seeds, WHALE_BUY_USD).catch(() => []);
      const whales = mergePrints([...fromMarket, ...confirmed], WHALE_BUY_USD, "buy");
      if (whales.length) return whales;
      const recent = await marketPrints(seeds, 0).catch(() => []);
      return mergePrints([...recent, ...confirmed], 0);
    },
    [],
    (rows) => rows.length > 0,
    TAPE_BUDGET_MS,
  );
}

export async function listTokenTape(mint: string): Promise<WhalePrint[]> {
  return cachePublic(
    `tape:token:v3:${mint}`,
    TAPE_CACHE_MS,
    async () => {
      const [gecko, helius, confirmed] = await Promise.all([
        geckoPrints(mint, 0).catch(() => []),
        heliusPrints(mint).catch(() => []),
        localConfirmedPrints(),
      ]);
      return mergePrints(
        [...gecko, ...helius, ...confirmed.filter((row) => row.mint === mint)],
        0,
      );
    },
    [],
    (rows) => rows.length > 0,
    TAPE_BUDGET_MS,
  );
}
