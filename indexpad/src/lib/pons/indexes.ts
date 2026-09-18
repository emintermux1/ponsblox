import { slugFromSymbol } from "@/lib/indexpad/format";
import { getPonsIndexes as getOfficialIndexes } from "@/lib/indexpad/indexes";
import type { IndexComponent, IndexLaunch, PonsIndex } from "@/types/pons";
import type { PonsIndex as OfficialIndex } from "@/types";
import { getIndexLaunches as getRemoteIndexLaunches } from "./launches";

export type ExploreSort = "trending" | "new" | "top" | "created" | "traded";

export const EXPLORE_TABS: { id: ExploreSort; label: string }[] = [
  { id: "trending", label: "Trending" },
  { id: "new", label: "New" },
  { id: "top", label: "Top Performing" },
  { id: "created", label: "Most Created" },
  { id: "traded", label: "Most Traded" },
];

export function parseExploreSort(raw: string | string[] | undefined): ExploreSort {
  const value = Array.isArray(raw) ? raw[0] : raw;
  switch (value) {
    case "trending":
    case "new":
    case "top":
    case "created":
    case "traded":
      return value;
    case "top-performing":
    case "performing":
      return "top";
    case "most-created":
      return "created";
    case "most-traded":
      return "traded";
    default:
      return "trending";
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const next = value.trim();
  return next || null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function asSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/^\$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseComponent(value: unknown): IndexComponent | null {
  const row = asRecord(value);
  if (!row) return null;
  const ticker = asString(row.ticker) ?? asString(row.symbol);
  if (!ticker) return null;
  return {
    ticker,
    symbol: asString(row.symbol) ?? ticker,
    name: asString(row.name) ?? undefined,
    weight: asNumber(row.weight) ?? undefined,
    weightBps: asNumber(row.weightBps) ?? undefined,
    logoUrl: asString(row.logoUrl) ?? asString(row.logo) ?? asString(row.image),
  };
}

export function asPonsIndex(value: unknown): PonsIndex | null {
  const row = asRecord(value);
  if (!row) return null;
  const ticker = asString(row.ticker) ?? asString(row.symbol);
  const name = asString(row.name);
  if (!ticker || !name) return null;
  const slug = asString(row.slug) ?? asSlug(ticker) ?? asString(row.id);
  if (!slug) return null;
  const rawComponents = Array.isArray(row.components) ? row.components : [];
  const components = rawComponents
    .map(parseComponent)
    .filter((item): item is IndexComponent => item != null);
  return {
    id: asString(row.id) ?? slug,
    slug,
    name,
    ticker,
    logoUrl: asString(row.logoUrl) ?? asString(row.logo) ?? asString(row.image),
    creator: asString(row.creator) ?? asString(row.creatorWallet) ?? asString(row.owner) ?? "",
    createdAt: asNumber(row.createdAt) ?? asNumber(row.created_at),
    change24h: asNumber(row.change24h) ?? asNumber(row.change_24h),
    change7d: asNumber(row.change7d) ?? asNumber(row.change_7d),
    marketCap: asNumber(row.marketCap) ?? asNumber(row.market_cap) ?? asNumber(row.mcap),
    assetCount: asNumber(row.assetCount) ?? asNumber(row.assets) ?? (components.length || null),
    components,
    launchedCoinAddress: asString(row.launchedCoinAddress) ?? asString(row.coinAddress),
    launchedAt: asString(row.launchedAt) ?? asNumber(row.launchedAt),
  };
}

function toWalletIndex(index: OfficialIndex): PonsIndex {
  return {
    id: index.id,
    slug: slugFromSymbol(index.symbol) || index.id,
    name: index.name,
    ticker: index.symbol,
    creator: "",
    createdAt: index.createdAt,
    assetCount: index.components.length,
    launchedCoinAddress: index.coinAddress,
    components: index.components.map((component) => ({
      ticker: component.symbol,
      weightBps: component.weightBps,
    })),
  };
}

export async function getPonsIndexes(): Promise<PonsIndex[]> {
  const result = await getOfficialIndexes();
  if (!result.ok) return [];
  return result.data.map(toWalletIndex);
}

export async function getIndexLaunches(): Promise<IndexLaunch[]> {
  return getRemoteIndexLaunches();
}
