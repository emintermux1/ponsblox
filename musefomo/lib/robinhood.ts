import { cacheSWR } from "@/lib/cache";
import { finitePrice, PROVIDER_BUDGET_MS, publicJson, raceTimeout } from "@/lib/fast-fetch";
import { looksLikeEvm, looksLikeMint } from "@/lib/format";
import {
  listBlockscoutTokens,
  RHC_TOKEN,
  searchDexRobinhood,
  type BlockscoutToken,
  type DexRobinhoodQuote,
} from "@/lib/rhc-rpc";
import type { DiscoverTokenRow } from "@/lib/types";

/**
 * xStock tickers from Backed official metadata (name/image) + DexScreener
 * Solana markets (mint + live quote). Metadata JSON has no mint — do not invent one.
 */
const XSTOCK_SYMBOLS = [
  "TSLAx",
  "AAPLx",
  "NVDAx",
  "HOODx",
  "GOOGLx",
  "AMZNx",
  "METAx",
  "MSFTx",
  "NFLXx",
  "SPYx",
  "QQQx",
  "CRCLx",
  "COINx",
  "PLTRx",
  "MSTRx",
  "INTCx",
  "ORCLx",
  "AVGOx",
] as const;

const SEARCH_QUERIES = ["xStock", ...XSTOCK_SYMBOLS] as const;
const RAIL_CACHE_MS = 45_000;
const META_CACHE_MS = 60 * 60_000;

type DexPair = {
  chainId?: string;
  pairAddress?: string;
  baseToken?: { address?: string; symbol?: string; name?: string };
  priceUsd?: string;
  priceChange?: { h24?: number };
  volume?: { h24?: number };
  liquidity?: { usd?: number };
  marketCap?: number;
  fdv?: number;
  info?: { imageUrl?: string };
};

type OfficialMeta = { symbol: string; name: string | null; image: string | null };

function isXStockIdentity(symbol: string | null | undefined, name: string | null | undefined): boolean {
  const ticker = (symbol ?? "").trim();
  const label = (name ?? "").trim();
  if (!ticker && !label) return false;
  if (/xstock/i.test(label) && /x$/i.test(ticker)) return true;
  if (XSTOCK_SYMBOLS.some((item) => item.toLowerCase() === ticker.toLowerCase()) && /stock/i.test(label)) {
    return true;
  }
  return false;
}

export function isXStockRow(row: DiscoverTokenRow): boolean {
  return looksLikeMint(row.mint) && isXStockIdentity(row.symbol, row.name);
}

function asRow(input: {
  mint: string;
  symbol: string | null;
  name: string | null;
  imageUrl: string | null;
  priceUsd: number | null;
  volumeUsd: number | null;
  marketCap: number | null;
  priceChange24h: number | null;
  pairAddress: string | null;
  rank: number;
}): DiscoverTokenRow | null {
  if (!looksLikeMint(input.mint) || !(input.symbol || input.name)) return null;
  if (!isXStockIdentity(input.symbol, input.name)) return null;
  return {
    rank: input.rank,
    mint: input.mint,
    symbol: input.symbol,
    name: input.name,
    imageUrl: input.imageUrl,
    priceUsd: input.priceUsd,
    volumeUsd: input.volumeUsd,
    volumeLamports: null,
    marketCap: input.marketCap,
    priceChange24h: input.priceChange24h,
    holders: null,
    trades: null,
    pairAddress: input.pairAddress,
    source: "market",
  };
}

function fromPair(pair: DexPair): DiscoverTokenRow | null {
  if (pair.chainId && pair.chainId !== "solana") return null;
  const mint = pair.baseToken?.address;
  const price = finitePrice(pair.priceUsd);
  if (!mint) return null;
  return asRow({
    mint,
    symbol: pair.baseToken?.symbol ?? null,
    name: pair.baseToken?.name ?? null,
    imageUrl: pair.info?.imageUrl ?? null,
    priceUsd: price,
    volumeUsd: finitePrice(pair.volume?.h24),
    marketCap: finitePrice(pair.marketCap) ?? finitePrice(pair.fdv),
    priceChange24h:
      typeof pair.priceChange?.h24 === "number" && Number.isFinite(pair.priceChange.h24)
        ? pair.priceChange.h24
        : null,
    pairAddress: pair.pairAddress ?? null,
    rank: 0,
  });
}

async function officialMeta(symbol: string): Promise<OfficialMeta | null> {
  const body = await publicJson<{
    symbol?: string;
    name?: string;
    image?: string;
  }>(`https://xstocks-metadata.backed.fi/tokens/Solana/${encodeURIComponent(symbol)}/metadata.json`);
  if (!body?.name && !body?.symbol) return null;
  return {
    symbol: body.symbol ?? symbol,
    name: body.name ?? null,
    image: body.image ?? null,
  };
}

async function loadOfficialCatalog(): Promise<Map<string, OfficialMeta>> {
  return cacheSWR(
    "discover:xstock-meta:v1",
    META_CACHE_MS,
    async () => {
      const rows = await Promise.all(XSTOCK_SYMBOLS.map((symbol) => officialMeta(symbol).catch(() => null)));
      const catalog = new Map<string, OfficialMeta>();
      for (const row of rows) {
        if (!row) continue;
        catalog.set(row.symbol.toLowerCase(), row);
      }
      return catalog;
    },
    (catalog) => catalog.size > 0,
  );
}

async function dexSearch(query: string): Promise<DiscoverTokenRow[]> {
  const body = await publicJson<{ pairs?: DexPair[] }>(
    `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`,
  );
  const rows: DiscoverTokenRow[] = [];
  for (const pair of body?.pairs ?? []) {
    const row = fromPair(pair);
    if (row) rows.push(row);
  }
  return rows;
}

async function quoteMints(mints: string[]): Promise<DiscoverTokenRow[]> {
  const unique = [...new Set(mints.filter((mint) => looksLikeMint(mint)))].slice(0, 30);
  if (!unique.length) return [];
  const body = await publicJson<DexPair[] | { pairs?: DexPair[] }>(
    `https://api.dexscreener.com/tokens/v1/solana/${unique.join(",")}`,
  );
  const pairs = Array.isArray(body) ? body : (body?.pairs ?? []);
  const rows: DiscoverTokenRow[] = [];
  for (const pair of pairs) {
    const row = fromPair(pair);
    if (row) rows.push(row);
  }
  return rows;
}

async function resolveRobinhoodRows(): Promise<DiscoverTokenRow[]> {
  const [catalog, searches] = await Promise.all([
    raceTimeout(loadOfficialCatalog(), new Map<string, OfficialMeta>(), PROVIDER_BUDGET_MS),
    raceTimeout(
      Promise.all(SEARCH_QUERIES.map((query) => dexSearch(query).catch(() => [] as DiscoverTokenRow[]))),
      [] as DiscoverTokenRow[][],
      PROVIDER_BUDGET_MS,
    ),
  ]);

  const byMint = new Map<string, DiscoverTokenRow>();
  for (const row of searches.flat()) {
    const meta = catalog.get((row.symbol ?? "").toLowerCase());
    const named: DiscoverTokenRow = {
      ...row,
      symbol: row.symbol ?? meta?.symbol ?? null,
      name: row.name ?? meta?.name ?? null,
      imageUrl: row.imageUrl ?? meta?.image ?? null,
    };
    if (!isXStockRow(named)) continue;
    const prev = byMint.get(named.mint);
    if (!prev || (named.volumeUsd ?? 0) > (prev.volumeUsd ?? 0)) byMint.set(named.mint, named);
  }

  const quoted = await raceTimeout(quoteMints([...byMint.keys()]), [], PROVIDER_BUDGET_MS);
  for (const row of quoted) {
    const prev = byMint.get(row.mint);
    const meta = catalog.get((row.symbol ?? prev?.symbol ?? "").toLowerCase());
    const named: DiscoverTokenRow = {
      ...row,
      symbol: row.symbol ?? prev?.symbol ?? meta?.symbol ?? null,
      name: row.name ?? prev?.name ?? meta?.name ?? null,
      imageUrl: row.imageUrl ?? prev?.imageUrl ?? meta?.image ?? null,
    };
    if (!isXStockRow(named)) continue;
    if (!prev || (named.priceUsd != null && prev.priceUsd == null) || (named.volumeUsd ?? 0) > (prev.volumeUsd ?? 0)) {
      byMint.set(named.mint, named);
    }
  }

  return [...byMint.values()]
    .filter((row) => isXStockRow(row) && (row.symbol || row.name))
    .sort(
      (a, b) =>
        (b.volumeUsd ?? 0) - (a.volumeUsd ?? 0) ||
        (b.marketCap ?? 0) - (a.marketCap ?? 0) ||
        (a.symbol ?? "").localeCompare(b.symbol ?? ""),
    )
    .slice(0, 18)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export async function loadRobinhoodRail(): Promise<DiscoverTokenRow[]> {
  return cacheSWR("discover:robinhood:v2", RAIL_CACHE_MS, resolveRobinhoodRows, (rows) => rows.length > 0);
}

export function isQuotedRobinhoodRow(row: DiscoverTokenRow): boolean {
  return row.priceUsd != null && looksLikeMint(row.mint);
}

const RHC_QUERIES = ["PONS", "LINK", "WETH", "HOOD"] as const;

function rhcRow(input: {
  mint: string;
  symbol: string | null;
  name: string | null;
  imageUrl: string | null;
  priceUsd: number | null;
  volumeUsd: number | null;
  marketCap: number | null;
  holders: number | null;
}): DiscoverTokenRow | null {
  if (!looksLikeEvm(input.mint) || !(input.symbol || input.name)) return null;
  return {
    rank: 0,
    mint: input.mint,
    symbol: input.symbol,
    name: input.name,
    imageUrl: input.imageUrl,
    priceUsd: input.priceUsd,
    volumeUsd: input.volumeUsd,
    volumeLamports: null,
    marketCap: input.marketCap,
    priceChange24h: null,
    holders: input.holders,
    trades: null,
    pairAddress: null,
    chain: "robinhood",
    chainTag: "Robinhood Chain",
    href: RHC_TOKEN(input.mint),
    source: "market",
  };
}

function fromScoutNamed(item: BlockscoutToken): DiscoverTokenRow | null {
  return rhcRow({
    mint: item.address_hash ?? "",
    symbol: item.symbol ?? null,
    name: item.name ?? null,
    imageUrl: item.icon_url ?? null,
    priceUsd: finitePrice(item.exchange_rate),
    volumeUsd: finitePrice(item.volume_24h),
    marketCap: finitePrice(item.circulating_market_cap),
    holders: Number.isFinite(Number(item.holders_count)) ? Number(item.holders_count) : null,
  });
}

async function resolveRobinhoodChainNamed(): Promise<DiscoverTokenRow[]> {
  const [scout, searches] = await Promise.all([
    raceTimeout(listBlockscoutTokens(), [], 2_000),
    raceTimeout(
      Promise.all(RHC_QUERIES.map((query) => searchDexRobinhood(query).catch(() => new Map<string, DexRobinhoodQuote>()))),
      [] as Map<string, DexRobinhoodQuote>[],
      2_000,
    ),
  ]);
  const byMint = new Map<string, DiscoverTokenRow>();
  for (const row of scout.map(fromScoutNamed)) {
    if (row) byMint.set(row.mint.toLowerCase(), row);
  }
  for (const bag of searches) {
    for (const [address, quote] of bag) {
      const row = rhcRow({
        mint: address,
        symbol: quote.symbol,
        name: quote.name,
        imageUrl: quote.imageUrl,
        priceUsd: quote.priceUsd,
        volumeUsd: quote.volumeUsd,
        marketCap: quote.marketCap,
        holders: null,
      });
      if (!row) continue;
      const key = row.mint.toLowerCase();
      const prev = byMint.get(key);
      if (!prev || (row.priceUsd != null && prev.priceUsd == null)) byMint.set(key, row);
    }
  }
  return [...byMint.values()]
    .sort((a, b) => (b.volumeUsd ?? 0) - (a.volumeUsd ?? 0) || (b.marketCap ?? 0) - (a.marketCap ?? 0))
    .slice(0, 24)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export async function loadRobinhoodChainNamed(): Promise<DiscoverTokenRow[]> {
  return cacheSWR("discover:rhc-named:v1", RAIL_CACHE_MS, resolveRobinhoodChainNamed, (rows) =>
    rows.some((row) => Boolean(row.symbol || row.name)),
  );
}
