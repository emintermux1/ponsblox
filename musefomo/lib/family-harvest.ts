import { cacheSWR } from "@/lib/cache";
import { THESES_SWR_MS } from "@/lib/constants";
import { extractPublicTheses } from "@/lib/providers/public-social";
import { writeFomoTheses } from "@/lib/providers/store";
import { isRealTraderThesis } from "@/lib/thesis-guard";
import type { FomoScanThesis } from "@/lib/types";

export const FAMILY_HARVEST_TIMEOUT_MS = 2_000;
export const FAMILY_HARVEST_CACHE_MS = THESES_SWR_MS;
export const FAMILY_HARVEST_CACHE_KEY = "feed:public-family-theses:v2";

const FAMILY_UA = "MuseFOMO/1.0 (+https://musefomo.family)";

/**
 * Public pages that may embed real `"thesis":"..."` JSON.
 * /feed is a locked SPA and prod-api 431s — harvest may return [].
 * Never fetch /blog or /blog/learn (educational cards, not theses).
 */
export const FAMILY_PUBLIC_PAGES = [
  "https://fomo.family/",
  "https://fomo.family/feed",
  "https://fomo.family/theses",
] as const;

const FAMILY_JSON_PROBES = [
  "https://fomo.family/api/theses",
  "https://fomo.family/api/feed",
  "https://www.fomo.family/api/theses",
  "https://www.fomo.family/api/feed",
] as const;

export function thesesFromFamilyHtml(html: string): FomoScanThesis[] {
  if (!html.trim()) return [];
  return extractPublicTheses(html).filter(isRealTraderThesis);
}

export function realFamilyThesis(item: FomoScanThesis | null): item is FomoScanThesis {
  return isRealTraderThesis(item);
}

export function dedupeFamilyTheses(items: FomoScanThesis[]): FomoScanThesis[] {
  const seen = new Set<string>();
  const out: FomoScanThesis[] = [];
  for (const item of items) {
    if (!isRealTraderThesis(item) || seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

async function fetchFamily(url: string): Promise<string | null> {
  const response = await fetch(url, {
    headers: {
      Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
      "User-Agent": FAMILY_UA,
    },
    cache: "no-store",
    redirect: "follow",
    signal: AbortSignal.timeout(FAMILY_HARVEST_TIMEOUT_MS),
  }).catch(() => null);
  if (!response || response.status !== 200) return null;
  const body = await response.text().catch(() => "");
  return body || null;
}

async function runFamilyHarvest(): Promise<FomoScanThesis[]> {
  const urls = [...FAMILY_PUBLIC_PAGES, ...FAMILY_JSON_PROBES];
  const hits = await Promise.all(urls.map((url) => fetchFamily(url)));
  const items = dedupeFamilyTheses(hits.flatMap((body) => (body ? thesesFromFamilyHtml(body) : [])));
  if (items.length) void writeFomoTheses(items).catch(() => undefined);
  return items;
}

export async function harvestFamilyTheses(): Promise<FomoScanThesis[]> {
  return cacheSWR(FAMILY_HARVEST_CACHE_KEY, FAMILY_HARVEST_CACHE_MS, runFamilyHarvest, (rows) => rows.length > 0);
}
