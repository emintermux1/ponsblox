import { getPonsIndexes as getDeskIndexes } from "@/lib/pons/indexes";
import { getPonsTokens as getFactoryTokens } from "@/lib/pons/tokens";
import type { PonsIndex as DomainIndex, PonsToken } from "@/types";
import type { PonsIndex as DeskIndex } from "@/types/pons";
import { EXAMPLE_PINT_EXTRAS, EXAMPLE_PINT_INDEX, EXAMPLE_PINT_SLUG } from "./example";
import { readAllCreatedIndexes } from "./store";
import {
  buildCompositionRows,
  indexSlug,
  type PublicIndexView,
} from "./view";

function matchesSlug(index: DeskIndex, slug: string): boolean {
  const key = slug.toLowerCase().replace(/^\$/, "");
  return (
    index.id.toLowerCase() === key ||
    index.slug.toLowerCase() === key ||
    index.ticker.toLowerCase().replace(/^\$/, "") === key
  );
}

function deskToDomain(index: DeskIndex): DomainIndex {
  return {
    id: index.id,
    name: index.name,
    symbol: index.ticker.replace(/^\$/, "").toUpperCase(),
    description: "",
    components: (index.components ?? []).map((row) => ({
      symbol: (row.ticker || row.symbol || "").replace(/^\$/, "").toUpperCase(),
      weightBps: Math.round(row.weightBps ?? (row.weight ?? 0) * 100),
      tokenAddress: null,
    })),
    coinAddress: (index.launchedCoinAddress as DomainIndex["coinAddress"]) ?? null,
    createdAt:
      typeof index.createdAt === "number"
        ? index.createdAt
        : typeof index.createdAt === "string"
          ? Date.parse(index.createdAt) || 0
          : 0,
    status: index.launchedCoinAddress ? "launched" : "draft",
  };
}

function viewFromDesk(
  index: DeskIndex,
  tokens: PonsToken[],
  source: PublicIndexView["source"],
): PublicIndexView {
  const domain = deskToDomain(index);
  const logos = new Map(
    (index.components ?? []).map((row) => [
      (row.ticker || row.symbol || "").replace(/^\$/, "").toUpperCase(),
      row.logoUrl || "",
    ]),
  );
  const rows = buildCompositionRows(domain.components, tokens, []).map((row) => ({
    ...row,
    logo: row.logo || logos.get(row.symbol) || index.logoUrl || "",
  }));

  return {
    source,
    slug: index.slug || indexSlug(domain),
    logo: index.logoUrl || "",
    creator: index.creator || null,
    holders: null,
    marketCapQuote:
      index.marketCapQuote ??
      (index.marketCap == null ? null : String(index.marketCap)),
    valueQuote: null,
    change24hBps:
      index.change24hBps ??
      (index.change24h == null ? null : Math.round(index.change24h * 100)),
    change7dBps:
      index.change7dBps ??
      (index.change7d == null ? null : Math.round(index.change7d * 100)),
    weightingMethod: "Fixed weights",
    index: domain,
    rows,
  };
}

function viewFromExample(tokens: PonsToken[]): PublicIndexView {
  return {
    source: "example",
    slug: EXAMPLE_PINT_SLUG,
    logo: EXAMPLE_PINT_EXTRAS.logo,
    creator: EXAMPLE_PINT_EXTRAS.creator,
    holders: EXAMPLE_PINT_EXTRAS.holders,
    marketCapQuote: EXAMPLE_PINT_EXTRAS.marketCapQuote,
    valueQuote: EXAMPLE_PINT_EXTRAS.valueQuote,
    change24hBps: EXAMPLE_PINT_EXTRAS.change24hBps,
    change7dBps: EXAMPLE_PINT_EXTRAS.change7dBps,
    weightingMethod: EXAMPLE_PINT_EXTRAS.weightingMethod || "Fixed weights",
    index: EXAMPLE_PINT_INDEX,
    rows: buildCompositionRows(EXAMPLE_PINT_INDEX.components, tokens, []),
  };
}

export async function getIndexBySlug(slug: string): Promise<PublicIndexView | null> {
  const key = slug.trim().toLowerCase().replace(/^\$/, "");
  if (!key) return null;

  let remote: DeskIndex[] = [];
  try {
    remote = await getDeskIndexes();
  } catch {
    remote = [];
  }

  const created = readAllCreatedIndexes();
  const match = [...remote, ...created].find((row) => matchesSlug(row, key));
  if (match) return viewFromDesk(match, [], "live");
  if (key === EXAMPLE_PINT_SLUG) return viewFromExample([]);
  return null;
}

/** Live + locally created indexes only. Never injects the $PINT example row. */
export async function listLiveIndexViews(): Promise<PublicIndexView[]> {
  const tokensResult = await getFactoryTokens();
  const tokens = tokensResult.ok ? tokensResult.data : [];

  let remote: DeskIndex[] = [];
  try {
    remote = await getDeskIndexes();
  } catch {
    remote = [];
  }

  const created = readAllCreatedIndexes();
  const seen = new Set<string>();
  const views: PublicIndexView[] = [];

  for (const index of [...remote, ...created]) {
    const key = (index.slug || index.id).toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    views.push({
      ...viewFromDesk(index, tokens, "live"),
      volume24h: index.volume24h ?? null,
      tradeCount: index.tradeCount ?? null,
      launchCount: index.launchCount ?? null,
    } as PublicIndexView);
  }

  return views;
}
