import { cachePeek, cacheSWR } from "@/lib/cache";
import { publicJson } from "@/lib/fast-fetch";
import { looksLikeEvm, looksLikeMint } from "@/lib/format";
import { asHttpsLogo } from "@/lib/token-logo";
import type { QualityIndex } from "@/lib/meme-rank";

const LIST_MS = 2_000;
const CACHE_MS = 45 * 60_000;

const LIST_SOURCES = [
  { id: "jupiter-strict", url: "https://token.jup.ag/strict", chain: "solana" as const },
  { id: "jupiter-verified", url: "https://lite-api.jup.ag/tokens/v2/tag?query=verified", chain: "solana" as const },
  { id: "phantom-tokens", url: "https://api.phantom.app/tokens/v1", chain: "solana" as const },
  { id: "phantom-solana", url: "https://api.phantom.app/tokens/v1/solana", chain: "solana" as const },
  { id: "solflare-utl", url: "https://token-list-api.solana.cloud/v1/list?chainId=101&start=0&limit=250", chain: "solana" as const },
  { id: "uniswap", url: "https://tokens.uniswap.org", chain: "evm" as const },
  { id: "metamask-uniswap", url: "https://tokens.coingecko.com/uniswap/all.json", chain: "evm" as const },
] as const;

export type QualityListsLive = QualityIndex & {
  lived: string[];
};

function asTokenArray(raw: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(raw)) return raw.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"));
  if (!raw || typeof raw !== "object") return [];
  const root = raw as Record<string, unknown>;
  const nested = root.tokens ?? root.content ?? root.data ?? root.results ?? root.items;
  if (Array.isArray(nested)) {
    return nested.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"));
  }
  return [];
}

function tokenMint(item: Record<string, unknown>): string {
  const raw = item.address ?? item.id ?? item.mint ?? item.tokenAddress ?? "";
  return typeof raw === "string" ? raw.trim() : "";
}

function tokenSymbol(item: Record<string, unknown>): string {
  const raw = item.symbol ?? item.ticker ?? "";
  return typeof raw === "string" ? raw.replace(/^\$/, "").trim().toUpperCase() : "";
}

function tokenLogo(item: Record<string, unknown>): string | null {
  const raw = item.logoURI ?? item.logo_uri ?? item.icon ?? item.logo ?? item.imageUrl ?? item.image;
  return asHttpsLogo(typeof raw === "string" ? raw : null);
}

function ingest(
  raw: unknown,
  chain: "solana" | "evm",
  into: QualityListsLive,
): number {
  let added = 0;
  for (const item of asTokenArray(raw)) {
    const mint = tokenMint(item);
    const symbol = tokenSymbol(item);
    const logo = tokenLogo(item);
    if (chain === "solana" && looksLikeMint(mint) && !looksLikeEvm(mint)) {
      into.mints.add(mint);
      if (logo && !into.logos.has(mint)) into.logos.set(mint, logo);
      added += 1;
    }
    if (symbol && (chain === "solana" || looksLikeEvm(mint) || !mint)) {
      into.symbols.add(symbol);
      added += 1;
    }
  }
  return added;
}

async function resolveQualityLists(): Promise<QualityListsLive> {
  const bodies = await Promise.all(
    LIST_SOURCES.map(async (source) => ({
      id: source.id,
      chain: source.chain,
      body: await publicJson<unknown>(source.url, LIST_MS).catch(() => null),
    })),
  );
  const into: QualityListsLive = {
    mints: new Set<string>(),
    symbols: new Set<string>(),
    logos: new Map<string, string>(),
    lived: [],
  };
  for (const hit of bodies) {
    if (!hit.body) continue;
    const added = ingest(hit.body, hit.chain, into);
    if (added > 0) into.lived.push(hit.id);
  }
  return into;
}

const EMPTY_LISTS: QualityListsLive = {
  mints: new Set(),
  symbols: new Set(),
  logos: new Map(),
  lived: [],
};

export function peekQualityLists(): QualityListsLive {
  return cachePeek<QualityListsLive>("discover:quality-lists:v1")?.value ?? EMPTY_LISTS;
}

export async function loadQualityLists(): Promise<QualityListsLive> {
  return cacheSWR(
    "discover:quality-lists:v1",
    CACHE_MS,
    resolveQualityLists,
    (row) => row.mints.size > 0 || row.symbols.size > 0,
  ).catch(() => EMPTY_LISTS);
}
