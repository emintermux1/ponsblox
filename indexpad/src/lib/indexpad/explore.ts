import "server-only";

import type { PonsIndex, PonsToken } from "@/types";
import { getPonsTokens } from "@/lib/pons/tokens";
import { slugFromSymbol } from "./format";
import { getPonsIndexes } from "./indexes";
import { parseIndexExtras, parsePerformancePoints } from "./parse";
import { getIndexPerformance } from "./performance";
import { indexApiConfigured, indexApiFetch } from "./http";
import type { ExploreIndex, ExploreSort } from "./explore-types";

export type { ExploreIndex, ExploreSort } from "./explore-types";
export { EXPLORE_TABS, parseExploreSort } from "./explore-types";

function tokenLogo(tokens: PonsToken[], symbol: string, address: string | null): string {
  const byAddress = address
    ? tokens.find((token) => token.address.toLowerCase() === address.toLowerCase())
    : undefined;
  if (byAddress?.logo) return byAddress.logo;
  const bySymbol = tokens.find((token) => token.symbol.toUpperCase() === symbol.toUpperCase());
  return bySymbol?.logo || "";
}

async function sparklineFor(indexId: string): Promise<number[] | null> {
  if (!indexApiConfigured()) return null;
  try {
    const body = await indexApiFetch<unknown>(
      `/indexes/${encodeURIComponent(indexId)}/performance?timeframe=1D`,
    );
    const record = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
    const points = parsePerformancePoints(record?.points ?? record?.series);
    const values = points.map((point) => point.value);
    return values.length >= 2 ? values : null;
  } catch {
    return null;
  }
}

async function toExploreIndex(index: PonsIndex, tokens: PonsToken[]): Promise<ExploreIndex> {
  const extras = parseIndexExtras(index);
  const [spark, snapshot] = await Promise.all([sparklineFor(index.id), getIndexPerformance(index.id)]);
  const ranked = [...index.components].sort((a, b) => b.weightBps - a.weightBps).slice(0, 3);

  return {
    id: index.id,
    slug: extras.slug || slugFromSymbol(index.symbol) || index.id,
    name: index.name,
    ticker: index.symbol,
    logoUrl: extras.logo,
    creator: extras.creator ?? "",
    createdAt: index.createdAt,
    change24hBps: extras.change24hBps ?? (snapshot.ok ? snapshot.data.change24hBps : null),
    change7dBps: extras.change7dBps,
    marketCapQuote: extras.marketCapQuote,
    assetCount: index.components.length,
    topComponents: ranked.map((row) => ({
      symbol: row.symbol,
      logo: tokenLogo(tokens, row.symbol, row.tokenAddress),
    })),
    sparkline: spark,
    volume24h: extras.volume24h,
    tradeCount: extras.tradeCount,
    launchCount: extras.launchCount,
  };
}

function trendScore(index: ExploreIndex): number {
  const volume = index.volume24h ?? 0;
  const change = index.change24hBps ?? 0;
  return volume * (1 + Math.max(change, 0) / 10_000);
}

export function sortExploreIndexes(rows: ExploreIndex[], sort: ExploreSort): ExploreIndex[] {
  const next = [...rows];
  switch (sort) {
    case "trending":
      return next.sort((a, b) => trendScore(b) - trendScore(a));
    case "new":
      return next.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    case "top":
      return next.sort(
        (a, b) =>
          (b.change24hBps ?? Number.NEGATIVE_INFINITY) -
          (a.change24hBps ?? Number.NEGATIVE_INFINITY),
      );
    case "created":
      return next.sort((a, b) => {
        const launches = (b.launchCount ?? 0) - (a.launchCount ?? 0);
        if (launches !== 0) return launches;
        return (b.createdAt ?? 0) - (a.createdAt ?? 0);
      });
    case "traded":
      return next.sort((a, b) => {
        const volume = (b.volume24h ?? 0) - (a.volume24h ?? 0);
        if (volume !== 0) return volume;
        return (b.tradeCount ?? 0) - (a.tradeCount ?? 0);
      });
    default: {
      const _exhaustive: never = sort;
      return _exhaustive;
    }
  }
}

/** Live catalog via getPonsIndexes(). Empty array when INDEXPAD_API_BASE is unset. */
export async function getExploreIndexes(sort: ExploreSort = "trending"): Promise<ExploreIndex[]> {
  const catalog = await getPonsIndexes();
  if (!catalog.ok) {
    throw new Error(catalog.message);
  }
  if (catalog.data.length === 0) return [];

  const tokensResult = await getPonsTokens();
  const tokens = tokensResult.ok ? tokensResult.data : [];
  const cards = await Promise.all(catalog.data.map((index) => toExploreIndex(index, tokens)));
  return sortExploreIndexes(cards, sort);
}
