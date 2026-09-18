import { cacheSWR } from "@/lib/cache";
import { finitePrice, publicJson, publicText, raceTimeout } from "@/lib/fast-fetch";
import { looksLikeEvm, looksLikeMint } from "@/lib/format";
import { isPadTrendSymbol } from "@/lib/meme-rank";
import {
  listBlockscoutTokens,
  PONS_FACTORY,
  PONS_LAUNCHPAD,
  quoteDexRobinhood,
  readBlockscoutToken,
  readPonsCurve,
  RHC_TOKEN,
  searchDexRobinhood,
  type BlockscoutToken,
  type DexRobinhoodQuote,
} from "@/lib/rhc-rpc";
import type { DiscoverTokenRow } from "@/lib/types";

/**
 * Live Pons board — scrape pons.family / sibling factory logs, then quote.
 * Pad leftovers (SNAPPAD, GITPAD, LONGER, …) never ride this rail.
 */
const PONS_JSON_URLS = [
  "https://pons.family/api/trending",
  "https://pons.family/api/tokens",
  "https://pons.family/api/coins",
  "https://pons.family/api/launches",
  "https://pons.family/api/explore",
  "https://www.pons.family/api/trending",
  "https://www.ponsfamily.com/api/trending",
  "https://www.ponsfamily.com/api/tokens",
  "https://www.ponsfamily.com/api/launches",
] as const;

const PONS_HTML_URLS = [
  "https://pons.family",
  "https://pons.family/launchpad",
  "https://www.ponsfamily.com",
  "https://www.ponsfamily.com/launchpad",
] as const;

const RAIL_CACHE_MS = 45_000;
const QUOTE_MS = 2_000;
const EVM_RE = /0x[a-fA-F0-9]{40}/g;
const SKIP_ADDR = new Set([
  PONS_FACTORY.toLowerCase(),
  "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
  "0x0000000000000000000000000000000000000000",
]);

type LooseToken = {
  mint?: string;
  address?: string;
  tokenAddress?: string;
  symbol?: string;
  name?: string;
  imageUrl?: string;
  image?: string;
  logo?: string;
  priceUsd?: string | number;
  price?: string | number;
  volumeUsd?: string | number;
  volume?: string | number | { h24?: string | number };
  marketCap?: string | number;
  fdv?: string | number;
};

function asList(raw: unknown): LooseToken[] {
  if (Array.isArray(raw)) return raw as LooseToken[];
  if (!raw || typeof raw !== "object") return [];
  const root = raw as Record<string, unknown>;
  const nested = root.tokens ?? root.coins ?? root.data ?? root.items ?? root.trending ?? root.launches;
  return Array.isArray(nested) ? (nested as LooseToken[]) : [];
}

function collectEvm(text: string | null | undefined, into: Set<string>) {
  if (!text) return;
  for (const match of text.match(EVM_RE) ?? []) {
    const addr = match.toLowerCase();
    if (!SKIP_ADDR.has(addr) && looksLikeEvm(addr)) into.add(addr);
  }
}

function rowFromLive(item: LooseToken, rank: number): DiscoverTokenRow | null {
  const mint = item.mint ?? item.address ?? item.tokenAddress ?? "";
  const price = finitePrice(item.priceUsd) ?? finitePrice(item.price);
  const volume =
    finitePrice(item.volumeUsd) ??
    finitePrice(typeof item.volume === "object" ? item.volume?.h24 : item.volume);
  if (!mint || !(looksLikeMint(mint) || looksLikeEvm(mint))) return null;
  if (price == null) return null;
  if (!(item.symbol || item.name)) return null;
  if (isPadTrendSymbol(item.symbol) || isPadTrendSymbol(item.name)) return null;
  const evm = looksLikeEvm(mint);
  return {
    rank,
    mint,
    symbol: item.symbol ?? null,
    name: item.name ?? null,
    imageUrl: item.imageUrl ?? item.image ?? item.logo ?? null,
    priceUsd: price,
    volumeUsd: volume,
    volumeLamports: null,
    marketCap: finitePrice(item.marketCap) ?? finitePrice(item.fdv),
    priceChange24h: null,
    holders: null,
    trades: null,
    pairAddress: null,
    chain: evm ? "robinhood" : "solana",
    chainTag: evm ? "Pons" : null,
    href: evm ? RHC_TOKEN(mint) : `/token/${mint}`,
    source: "market",
  };
}

async function scrapePonsAddresses(): Promise<string[]> {
  const [htmls, rsc] = await Promise.all([
    Promise.all(PONS_HTML_URLS.map((url) => publicText(url, QUOTE_MS).catch(() => null))),
    publicText("https://www.ponsfamily.com/launchpad", QUOTE_MS).catch(() => null),
  ]);
  const into = new Set<string>();
  for (const html of [...htmls, rsc]) collectEvm(html, into);
  return [...into];
}

async function factoryLogAddresses(): Promise<string[]> {
  const body = await publicJson<{
    items?: Array<{ topics?: string[]; data?: string; decoded?: { parameters?: Array<{ value?: unknown }> } }>;
  }>(`https://robinhoodchain.blockscout.com/api/v2/addresses/${PONS_FACTORY}/logs?limit=50`, QUOTE_MS);
  const into = new Set<string>();
  for (const item of body?.items ?? []) {
    collectEvm((item.topics ?? []).join(" "), into);
    collectEvm(item.data, into);
    for (const param of item.decoded?.parameters ?? []) {
      if (typeof param.value === "string") collectEvm(param.value, into);
    }
  }
  into.delete(PONS_FACTORY.toLowerCase());
  return [...into];
}

function fromScout(item: BlockscoutToken): DiscoverTokenRow | null {
  return rowFromLive(
    {
      address: item.address_hash,
      symbol: item.symbol,
      name: item.name,
      imageUrl: item.icon_url ?? undefined,
      priceUsd: item.exchange_rate ?? undefined,
      volumeUsd: item.volume_24h ?? undefined,
      marketCap: item.circulating_market_cap ?? undefined,
    },
    0,
  );
}

function fromQuote(address: string, quote: DexRobinhoodQuote): DiscoverTokenRow | null {
  return rowFromLive(
    {
      address,
      symbol: quote.symbol ?? undefined,
      name: quote.name ?? undefined,
      imageUrl: quote.imageUrl ?? undefined,
      priceUsd: quote.priceUsd,
      volumeUsd: quote.volumeUsd ?? undefined,
      marketCap: quote.marketCap ?? undefined,
    },
    0,
  );
}

async function resolvePonsFamilyRows(): Promise<DiscoverTokenRow[]> {
  const [bodies, scraped, logs, scout, dexBags] = await Promise.all([
    Promise.all(PONS_JSON_URLS.map((url) => publicJson<unknown>(url, QUOTE_MS).catch(() => null))),
    scrapePonsAddresses().catch(() => [] as string[]),
    factoryLogAddresses().catch(() => [] as string[]),
    listBlockscoutTokens().catch(() => [] as BlockscoutToken[]),
    Promise.all(
      ["pons", "PONS"].map((query) => searchDexRobinhood(query).catch(() => new Map<string, DexRobinhoodQuote>())),
    ),
  ]);

  const byMint = new Map<string, DiscoverTokenRow>();
  const candidates = new Set<string>();
  const fromApi = new Set<string>();

  for (const body of bodies) {
    for (const item of asList(body)) {
      const row = rowFromLive(item, 0);
      if (row) byMint.set(row.mint.toLowerCase(), row);
      const mint = item.mint ?? item.address ?? item.tokenAddress ?? "";
      if (looksLikeEvm(mint)) {
        candidates.add(mint.toLowerCase());
        fromApi.add(mint.toLowerCase());
      }
    }
  }

  for (const addr of [...scraped, ...logs]) {
    if (looksLikeEvm(addr)) candidates.add(addr.toLowerCase());
  }

  const scoutByAddr = new Map(
    scout
      .filter((item) => looksLikeEvm(item.address_hash ?? ""))
      .map((item) => [item.address_hash!.toLowerCase(), item]),
  );

  for (const bag of dexBags) {
    for (const [address, quote] of bag) {
      candidates.add(address.toLowerCase());
      const row = fromQuote(address, quote);
      if (!row) continue;
      const key = row.mint.toLowerCase();
      const prev = byMint.get(key);
      if (!prev || (row.volumeUsd ?? 0) > (prev.volumeUsd ?? 0)) byMint.set(key, row);
    }
  }

  const needQuote = [...candidates].filter((addr) => !byMint.get(addr)?.priceUsd).slice(0, 24);
  const quotes = await quoteDexRobinhood(needQuote).catch(() => new Map<string, DexRobinhoodQuote>());
  for (const [address, quote] of quotes) {
    const row = fromQuote(address, quote);
    if (!row) continue;
    const key = row.mint.toLowerCase();
    const prev = byMint.get(key);
    if (!prev || (row.volumeUsd ?? 0) > (prev.volumeUsd ?? 0)) byMint.set(key, row);
  }

  for (const addr of [...candidates].slice(0, 24)) {
    const scoutHit = scoutByAddr.get(addr);
    if (!scoutHit) continue;
    const row = fromScout(scoutHit);
    if (!row) continue;
    const prev = byMint.get(addr);
    if (!prev || (row.volumeUsd ?? 0) > (prev.volumeUsd ?? 0) || prev.priceUsd == null) {
      byMint.set(addr, prev ? { ...row, imageUrl: row.imageUrl ?? prev.imageUrl } : row);
    }
  }

  const missingMeta = [...candidates]
    .filter((addr) => !byMint.get(addr)?.symbol || byMint.get(addr)?.priceUsd == null)
    .slice(0, 8);
  const extras = await Promise.all(
    missingMeta.map(async (mint) => {
      const [meta, curve] = await Promise.all([
        readBlockscoutToken(mint).catch(() => null),
        readPonsCurve(mint).catch(() => null),
      ]);
      return { mint, meta, curve };
    }),
  );
  for (const extra of extras) {
    if (!extra.curve?.exists || !extra.meta) continue;
    const next = fromScout(extra.meta);
    if (next) byMint.set(extra.mint, next);
  }

  const verifyKeys = [...new Set([...candidates, ...byMint.keys()])].filter((addr) => looksLikeEvm(addr)).slice(0, 16);
  const verified = await Promise.all(
    verifyKeys.map(async (key) => ({
      key,
      curve: await readPonsCurve(key).catch(() => null),
    })),
  );
  const ponsKeys = new Set(verified.filter((item) => item.curve?.exists).map((item) => item.key));
  const fromPonsPage = new Set([...scraped, ...logs].map((addr) => addr.toLowerCase()));
  const allowed = new Set([...ponsKeys, ...fromPonsPage, ...fromApi]);

  return [...byMint.values()]
    .filter((row) => row.priceUsd != null && Boolean(row.symbol || row.name))
    .filter((row) => !isPadTrendSymbol(row.symbol) && !isPadTrendSymbol(row.name))
    .filter((row) => !looksLikeEvm(row.mint) || allowed.has(row.mint.toLowerCase()))
    .sort((a, b) => (b.volumeUsd ?? 0) - (a.volumeUsd ?? 0) || (b.marketCap ?? 0) - (a.marketCap ?? 0))
    .slice(0, 24)
    .map((row, index) => ({
      ...row,
      rank: index + 1,
      chain: looksLikeEvm(row.mint) ? "robinhood" : row.chain,
      chainTag: looksLikeEvm(row.mint) ? "Pons" : row.chainTag,
      href: looksLikeEvm(row.mint) ? PONS_LAUNCHPAD(row.mint) : (row.href ?? `/token/${row.mint}`),
    }));
}

export async function loadPonsLongRail(): Promise<DiscoverTokenRow[]> {
  return cacheSWR(
    "discover:pons-family:v2",
    RAIL_CACHE_MS,
    () => raceTimeout(resolvePonsFamilyRows(), [], 4_000),
    (rows) => rows.some((row) => row.priceUsd != null && Boolean(row.symbol || row.name)),
  );
}
