import { EXAMPLE_PINT_EXTRAS, EXAMPLE_PINT_INDEX, EXAMPLE_PINT_SLUG } from "@/lib/indexpad/example";
import { parseStoredIndex, readAllCreatedIndexes } from "@/lib/indexpad/launch-store";
import { indexSlug } from "@/lib/indexpad/view";
import type { PonsIndex as CatalogIndex } from "@/types";
import type { IndexComponent, PonsIndex } from "@/types/pons";

export type BackedComponent = {
  ticker: string;
  name?: string;
  weightPct: number;
  logoUrl: string | null;
};

export type BackedIndex = {
  id: string;
  slug: string;
  name: string;
  ticker: string;
  logoUrl: string | null;
  creator: string | null;
  description: string;
  example: boolean;
  components: BackedComponent[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function weightPct(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  if (raw > 1000) return raw / 100;
  if (raw <= 1) return raw * 100;
  return raw;
}

function fromCatalog(
  index: CatalogIndex,
  extras?: { slug?: string | null; logo?: string; creator?: string | null },
): BackedIndex {
  return {
    id: index.id,
    slug: extras?.slug || indexSlug(index),
    name: index.name,
    ticker: index.symbol.replace(/^\$/, "").toUpperCase(),
    logoUrl: extras?.logo || null,
    creator: extras?.creator ?? null,
    description: index.description,
    example: index.id === EXAMPLE_PINT_INDEX.id,
    components: index.components.map((row) => ({
      ticker: row.symbol.replace(/^\$/, "").toUpperCase(),
      weightPct: weightPct(row.weightBps),
      logoUrl: null,
    })),
  };
}

function fromPons(index: PonsIndex, example = false): BackedIndex {
  const components = (index.components ?? []).map((row: IndexComponent) => ({
    ticker: (row.ticker || row.symbol || "").replace(/^\$/, "").toUpperCase(),
    name: row.name,
    weightPct: weightPct(row.weightBps ?? row.weight ?? 0),
    logoUrl: row.logoUrl ?? null,
  }));
  return {
    id: index.id,
    slug: index.slug,
    name: index.name,
    ticker: index.ticker.replace(/^\$/, "").toUpperCase(),
    logoUrl: index.logoUrl ?? null,
    creator: index.creator || null,
    description: "",
    example,
    components,
  };
}

function fromLoose(raw: unknown): BackedIndex | null {
  const pons = parseStoredIndex(raw);
  if (pons) return fromPons(pons);
  if (!isRecord(raw)) return null;
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const symbol =
    (typeof raw.symbol === "string" && raw.symbol) ||
    (typeof raw.ticker === "string" && raw.ticker) ||
    "";
  const id = typeof raw.id === "string" && raw.id ? raw.id : symbol;
  if (!name || !symbol) return null;
  const componentsRaw = Array.isArray(raw.components) ? raw.components : [];
  const components: BackedComponent[] = [];
  for (const item of componentsRaw) {
    if (!isRecord(item)) continue;
    const ticker =
      (typeof item.ticker === "string" && item.ticker) ||
      (typeof item.symbol === "string" && item.symbol) ||
      "";
    const weight =
      typeof item.weightBps === "number"
        ? weightPct(item.weightBps)
        : typeof item.weight === "number"
          ? weightPct(item.weight)
          : 0;
    if (!ticker) continue;
    components.push({
      ticker: ticker.replace(/^\$/, "").toUpperCase(),
      name: typeof item.name === "string" ? item.name : undefined,
      weightPct: weight,
      logoUrl:
        (typeof item.logoUrl === "string" && item.logoUrl) ||
        (typeof item.logo === "string" && item.logo) ||
        null,
    });
  }
  const ticker = symbol.replace(/^\$/, "").toUpperCase();
  return {
    id,
    slug: (typeof raw.slug === "string" && raw.slug) || ticker.toLowerCase(),
    name,
    ticker,
    logoUrl:
      (typeof raw.logoUrl === "string" && raw.logoUrl) ||
      (typeof raw.logo === "string" && raw.logo) ||
      null,
    creator:
      (typeof raw.creator === "string" && raw.creator) ||
      (typeof raw.creatorWallet === "string" && raw.creatorWallet) ||
      null,
    description: typeof raw.description === "string" ? raw.description : "",
    example: false,
    components,
  };
}

export function examplePint(): BackedIndex {
  return fromCatalog(EXAMPLE_PINT_INDEX, EXAMPLE_PINT_EXTRAS);
}

function matchesKey(index: BackedIndex, needle: string): boolean {
  return (
    index.id.toLowerCase() === needle ||
    index.slug.toLowerCase() === needle ||
    index.ticker.toLowerCase() === needle
  );
}

export async function resolveBackedIndex(key: string | null): Promise<BackedIndex | null> {
  const needle = (key || "").trim().toLowerCase().replace(/^\$/, "");
  if (!needle) return null;

  const local = readAllCreatedIndexes()
    .map((row) => fromLoose(row))
    .filter((row): row is BackedIndex => Boolean(row))
    .find((row) => matchesKey(row, needle));
  if (local) return local;

  try {
    const { getPonsIndexes } = await import("@/lib/pons");
    const rows = await getPonsIndexes();
    const list = Array.isArray(rows) ? rows : [];
    const hit = list.map((row) => fromLoose(row)).find((row) => row && matchesKey(row, needle));
    if (hit) return hit;
  } catch {
    /* catalog optional */
  }

  if (needle === EXAMPLE_PINT_SLUG || needle === "pint") {
    return examplePint();
  }

  return null;
}
