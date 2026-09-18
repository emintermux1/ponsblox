import { cachePeek, cacheSWR } from "@/lib/cache";
import { THESES_SWR_MS } from "@/lib/constants";
import { FAMILY_HARVEST_CACHE_KEY, harvestFamilyTheses } from "@/lib/family-harvest";
import { normalizeThesis, normalizeThesisPage } from "@/lib/fomoscan";
import { extractPublicTheses, peekPublicHarvest } from "@/lib/providers/public-social";
import { asRecord } from "@/lib/providers/types";
import { listProviderCacheThesisPayloads, readFomoTheses } from "@/lib/providers/store";
import { isRealTraderThesis } from "@/lib/thesis-guard";
import type { FomoScanThesis } from "@/lib/types";

const FEED_TIMEOUT_MS = 2_000;
const FEED_CACHE_MS = THESES_SWR_MS;

export function thesesFromUnknown(raw: unknown, depth = 0): FomoScanThesis[] {
  if (raw == null || depth > 4) return [];
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return thesesFromUnknown(JSON.parse(trimmed) as unknown, depth + 1);
      } catch {
        return extractPublicTheses(trimmed).filter(isRealTraderThesis);
      }
    }
    return extractPublicTheses(trimmed).filter(isRealTraderThesis);
  }
  if (Array.isArray(raw)) {
    return raw.flatMap((item) => {
      const one = normalizeThesis(item);
      return one && isRealTraderThesis(one) ? [one] : thesesFromUnknown(item, depth + 1);
    });
  }
  const page = normalizeThesisPage(raw);
  if (page.items.length) return page.items.filter(isRealTraderThesis);
  const rec = asRecord(raw);
  if (!rec) return [];
  for (const key of ["data", "payload", "theses", "feed", "events", "items"] as const) {
    if (rec[key] == null) continue;
    const inner = thesesFromUnknown(rec[key], depth + 1);
    if (inner.length) return inner;
  }
  const one = normalizeThesis(rec);
  return one && isRealTraderThesis(one) ? [one] : [];
}

export function peekCachedThesisRows(): FomoScanThesis[] {
  const family = cachePeek<FomoScanThesis[]>(FAMILY_HARVEST_CACHE_KEY);
  const cached = cachePeek<FomoScanThesis[]>("feed:cached-theses");
  const cachedV2 = cachePeek<FomoScanThesis[]>("feed:cached-theses:v2");
  const home = cachePeek<{ items?: FomoScanThesis[] }>("home:theses:v1:");
  const harvest = peekPublicHarvest();
  return dedupeTheses([
    ...(family?.value ?? []),
    ...(cached?.value ?? []),
    ...(cachedV2?.value ?? []),
    ...(home?.value.items ?? []),
    ...(harvest?.items ?? []),
  ]);
}

export function dedupeTheses(items: FomoScanThesis[]): FomoScanThesis[] {
  const seen = new Set<string>();
  const out: FomoScanThesis[] = [];
  for (const item of items) {
    if (!isRealTraderThesis(item) || seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

export async function loadCachedTheses(limit = 80): Promise<FomoScanThesis[]> {
  return cacheSWR(
    "feed:cached-theses:v2",
    FEED_CACHE_MS,
    async () => {
      const [table, payloads] = await Promise.all([
        readFomoTheses({ limit }).catch(() => [] as FomoScanThesis[]),
        listProviderCacheThesisPayloads(limit).catch(() => [] as unknown[]),
      ]);
      return dedupeTheses([...table, ...payloads.flatMap((payload) => thesesFromUnknown(payload))]);
    },
    (rows) => rows.length > 0,
  );
}

export async function loadPublicFamilyTheses(): Promise<FomoScanThesis[]> {
  return harvestFamilyTheses();
}

/** Last-good cache stays instant; harvest/cache refresh never blocks the request. */
export function refreshThesisSources(): void {
  void loadCachedTheses().catch(() => undefined);
  void harvestFamilyTheses().catch(() => undefined);
}

export { FEED_CACHE_MS, FEED_TIMEOUT_MS };
