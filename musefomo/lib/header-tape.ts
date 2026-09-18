import { cachePeek } from "@/lib/cache";
import { JUP_MINT, SOL_MINT, TAPE_BUDGET_MS, TAPE_CACHE_MS, USDC_MINT } from "@/lib/constants";
import { peekRankedMemes, refreshTrendingPublic } from "@/lib/discovery";
import { seedHomeMemes } from "@/lib/home-paint";
import { looksLikeMint } from "@/lib/format";
import { humanProfileHref, museProfileHref } from "@/lib/profile-href";
import { type WhalePrint } from "@/lib/tape";
import { isBlogLearnThesisId, isRealTraderThesis, looksLikeBlogLearnCardText } from "@/lib/thesis-guard";
import { asHttpsLogo } from "@/lib/token-logo";
import type { DiscoverTokenRow, FeedEvent, FomoScanThesis } from "@/lib/types";

export const HEADER_TAPE_TTL_MS = TAPE_CACHE_MS;
export const HEADER_TAPE_BUDGET_MS = TAPE_BUDGET_MS;

const MAJOR_MINTS = new Set<string>([SOL_MINT, USDC_MINT, JUP_MINT]);
const MAJOR_SYMBOLS = new Set([
  "AAVE",
  "ADA",
  "AVAX",
  "BNSOL",
  "BTC",
  "CBTC",
  "DAI",
  "DOT",
  "ETH",
  "HNT",
  "INF",
  "IOT",
  "JITOSOL",
  "JLP",
  "JUP",
  "LINK",
  "MATIC",
  "MNDE",
  "MOBILE",
  "MSOL",
  "NEAR",
  "ORCA",
  "POL",
  "PYTH",
  "PYUSD",
  "RAY",
  "RENDER",
  "SOL",
  "UNI",
  "USD1",
  "USDC",
  "USDS",
  "USDT",
  "WBTC",
  "WETH",
  "WNEAR",
  "WSOL",
  "XSOL",
]);

export type HeaderTapeKind = "meme" | "thesis" | "print";

export type HeaderTapeItem = {
  kind: HeaderTapeKind;
  id: string;
  href: string;
  symbol: string | null;
  mint: string | null;
  logo: string | null;
  handle: string | null;
  name: string | null;
  priceUsd: number | null;
  change24h: number | null;
  usd: number | null;
  side: "buy" | "sell" | null;
  snippet: string | null;
};

export type HeaderTapePayload = {
  items: HeaderTapeItem[];
  memes: HeaderTapeItem[];
  theses: HeaderTapeItem[];
  prints: HeaderTapeItem[];
  source: string;
};

type MemeSeed = {
  mint: string;
  symbol: string | null;
  name: string | null;
  logo: string | null;
  priceUsd: number | null;
  change24h: number | null;
  pairAddress: string | null;
  rank: number;
  via: "live";
};

function clipSnippet(value: string | null | undefined, max = 42): string | null {
  const text = value?.replace(/\s+/g, " ").trim() ?? "";
  if (!text) return null;
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function symbolKey(value: string | null | undefined): string {
  return (value ?? "").replace(/^\$/, "").trim().toUpperCase();
}

export function isTapeMajor(input: { mint?: string | null; symbol?: string | null }): boolean {
  const mint = input.mint?.trim() ?? "";
  if (mint && MAJOR_MINTS.has(mint)) return true;
  const symbol = symbolKey(input.symbol);
  return symbol.length > 0 && MAJOR_SYMBOLS.has(symbol);
}

function tokenHref(mint: string | null): string | null {
  return mint && looksLikeMint(mint) ? `/token/${mint}` : null;
}

function thesisHref(input: {
  handle: string | null;
  mint: string | null;
  agent?: boolean;
}): string {
  if (input.handle) return input.agent ? museProfileHref(input.handle) : humanProfileHref(input.handle);
  return tokenHref(input.mint) ?? "/discover";
}

function printHref(input: { mint: string | null; handle: string | null }): string {
  return tokenHref(input.mint) ?? (input.handle ? humanProfileHref(input.handle) : "/discover");
}

function memeItem(row: MemeSeed): HeaderTapeItem | null {
  if (!row.mint || !looksLikeMint(row.mint) || isTapeMajor(row)) return null;
  const symbol = row.symbol ?? row.name;
  if (!symbol) return null;
  return {
    kind: "meme",
    id: `meme:${row.via}:${row.mint}`,
    href: `/token/${row.mint}`,
    symbol,
    mint: row.mint,
    logo: asHttpsLogo(row.logo),
    handle: null,
    name: row.name,
    priceUsd: row.priceUsd,
    change24h: row.change24h,
    usd: null,
    side: null,
    snippet: null,
  };
}

function thesisItem(input: {
  id: string;
  handle: string | null;
  mint: string | null;
  symbol: string | null;
  logo: string | null;
  snippet: string | null;
  agent?: boolean;
}): HeaderTapeItem | null {
  if (!input.handle && !input.mint) return null;
  const snippet = clipSnippet(input.snippet);
  if (!snippet && !input.symbol) return null;
  return {
    kind: "thesis",
    id: input.id,
    href: thesisHref(input),
    symbol: input.symbol,
    mint: input.mint && looksLikeMint(input.mint) ? input.mint : null,
    logo: asHttpsLogo(input.logo),
    handle: input.handle,
    name: input.handle,
    priceUsd: null,
    change24h: null,
    usd: null,
    side: null,
    snippet,
  };
}

function printItem(input: {
  id: string;
  usd: number;
  side: "buy" | "sell";
  mint: string | null;
  symbol: string | null;
  logo: string | null;
  handle: string | null;
  name: string | null;
  allowMajor?: boolean;
}): HeaderTapeItem | null {
  if (!Number.isFinite(input.usd) || input.usd <= 0) return null;
  if (!input.allowMajor && isTapeMajor({ mint: input.mint, symbol: input.symbol })) return null;
  return {
    kind: "print",
    id: input.id,
    href: printHref(input),
    symbol: input.symbol,
    mint: input.mint && looksLikeMint(input.mint) ? input.mint : null,
    logo: asHttpsLogo(input.logo),
    handle: input.handle,
    name: input.name,
    priceUsd: null,
    change24h: null,
    usd: input.usd,
    side: input.side,
    snippet: null,
  };
}

export function printFromWhale(row: WhalePrint, allowMajor = false): HeaderTapeItem | null {
  return printItem({
    id: row.id,
    usd: row.usd,
    side: row.side,
    mint: row.mint,
    symbol: row.symbol,
    logo: row.avatarUrl,
    handle: row.handle,
    name: row.name,
    allowMajor,
  });
}

function dedupeItems(rows: Array<HeaderTapeItem | null | undefined>): HeaderTapeItem[] {
  const seen = new Set<string>();
  const out: HeaderTapeItem[] = [];
  for (const row of rows) {
    if (!row || seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
  }
  return out;
}

export function weaveHeaderTape(
  memes: HeaderTapeItem[],
  prints: HeaderTapeItem[],
  theses: HeaderTapeItem[],
): HeaderTapeItem[] {
  const out: HeaderTapeItem[] = [];
  const limit = Math.max(memes.length, prints.length, theses.length);
  for (let i = 0; i < limit; i += 1) {
    const meme = memes[i];
    const print = prints[i];
    const thesis = theses[i];
    if (meme) out.push(meme);
    if (print) out.push(print);
    if (thesis) out.push(thesis);
  }
  return out.slice(0, 48);
}

function seedsFromRanked(rows: DiscoverTokenRow[]): MemeSeed[] {
  return rows.map((row, index) => ({
    mint: row.mint,
    symbol: row.symbol,
    name: row.name,
    logo: asHttpsLogo(row.imageUrl),
    priceUsd: row.priceUsd,
    change24h: row.priceChange24h,
    pairAddress: row.pairAddress ?? null,
    rank: row.rank || index + 1,
    via: "live" as const,
  }));
}

function mergeSeeds(groups: MemeSeed[][]): MemeSeed[] {
  const seen = new Set<string>();
  const out: MemeSeed[] = [];
  for (const group of groups) {
    for (const row of group) {
      if (!row.mint || seen.has(row.mint) || isTapeMajor(row)) continue;
      seen.add(row.mint);
      out.push(row);
    }
  }
  return out;
}

function thesesFromFeedEvents(events: FeedEvent[] | undefined): HeaderTapeItem[] {
  if (!events?.length) return [];
  return dedupeItems(
    events.map((event) => {
      if (event.action !== "thesis" && !event.thesis) return null;
      if (isBlogLearnThesisId(event.id) || looksLikeBlogLearnCardText(event.thesis ?? "")) return null;
      return thesisItem({
        id: `feed:${event.id}`,
        handle: event.actor.handle,
        mint: event.token?.mint ?? null,
        symbol: event.token?.symbol ?? null,
        logo: event.token?.imageUrl ?? null,
        snippet: event.thesis,
        agent: event.actor.kind === "agent",
      });
    }),
  );
}

function thesesFromFomo(items: FomoScanThesis[]): HeaderTapeItem[] {
  return dedupeItems(
    items.filter(isRealTraderThesis).map((item) =>
      thesisItem({
        id: `fomo:${item.id}`,
        handle: item.authorHandle,
        mint: item.tokenAddress,
        symbol: item.tokenSymbol,
        logo: item.tokenImage ?? null,
        snippet: item.thesis,
        agent: false,
      }),
    ),
  );
}


function peekFeedTheses(): HeaderTapeItem[] {
  const keys = ["home-feed:v9:for-you:", "home-feed:v9:thesis:"] as const;
  const items: HeaderTapeItem[] = [];
  for (const key of keys) {
    const hit = cachePeek<{
      events?: FeedEvent[];
      theses?: FomoScanThesis[];
      fomoscan?: { items?: FomoScanThesis[] };
      agentTheses?: FomoScanThesis[];
    }>(key);
    if (!hit?.value) continue;
    items.push(...thesesFromFeedEvents(hit.value.events));
    items.push(...thesesFromFomo(hit.value.theses ?? []));
    items.push(...thesesFromFomo(hit.value.fomoscan?.items ?? []));
    items.push(...thesesFromFomo(hit.value.agentTheses ?? []));
  }
  return dedupeItems(items);
}

function collectMemes(): MemeSeed[] {
  void refreshTrendingPublic();
  const live = mergeSeeds([seedsFromRanked(peekRankedMemes())]).slice(0, 24);
  return live.length ? live : mergeSeeds([seedsFromRanked(seedHomeMemes())]).slice(0, 24);
}

export async function listHeaderTape(): Promise<HeaderTapePayload> {
  const memes = dedupeItems(collectMemes().map(memeItem)).slice(0, 24);
  return {
    items: memes,
    memes,
    theses: [],
    prints: [],
    source: memes.length ? "memes" : "empty",
  };
}
