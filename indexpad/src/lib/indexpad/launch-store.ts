import type { Address } from "viem";
import type { IndexLaunch as ConfirmedLaunch } from "@/types";
import type { IndexLaunch as StoredLaunch, PonsIndex } from "@/types/pons";

const PREFIX = "indexpad";

function storageKey(kind: "created" | "launches", wallet?: string): string {
  return wallet ? `${PREFIX}:${kind}:${wallet.toLowerCase()}` : `${PREFIX}:${kind}`;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function parseStoredIndex(raw: unknown): PonsIndex | null {
  const row = asRecord(raw);
  if (!row) return null;
  const name = typeof row.name === "string" ? row.name.trim() : "";
  const ticker =
    (typeof row.ticker === "string" && row.ticker) ||
    (typeof row.symbol === "string" && row.symbol) ||
    "";
  if (!name || !ticker) return null;
  const slug =
    (typeof row.slug === "string" && row.slug) ||
    ticker.replace(/^\$/, "").toLowerCase();
  return {
    id: typeof row.id === "string" && row.id ? row.id : slug,
    slug,
    name,
    ticker: ticker.replace(/^\$/, "").toUpperCase(),
    logoUrl: (typeof row.logoUrl === "string" && row.logoUrl) || (typeof row.logo === "string" && row.logo) || null,
    creator:
      (typeof row.creator === "string" && row.creator) ||
      (typeof row.creatorWallet === "string" && row.creatorWallet) ||
      "",
    createdAt: typeof row.createdAt === "number" || typeof row.createdAt === "string" ? row.createdAt : null,
    components: Array.isArray(row.components)
      ? row.components.flatMap((item) => {
          const c = asRecord(item);
          if (!c) return [];
          const token =
            (typeof c.ticker === "string" && c.ticker) ||
            (typeof c.symbol === "string" && c.symbol) ||
            "";
          if (!token) return [];
          return [{
            ticker: token.replace(/^\$/, "").toUpperCase(),
            name: typeof c.name === "string" ? c.name : undefined,
            weight: typeof c.weight === "number" ? c.weight : undefined,
            weightBps: typeof c.weightBps === "number" ? c.weightBps : undefined,
            logoUrl: (typeof c.logoUrl === "string" && c.logoUrl) || (typeof c.logo === "string" && c.logo) || null,
          }];
        })
      : [],
    launchedCoinAddress: typeof row.launchedCoinAddress === "string" ? row.launchedCoinAddress : typeof row.coinAddress === "string" ? row.coinAddress : null,
  };
}

export function readCreatedIndexes(wallet: string): PonsIndex[] {
  return readJson<unknown[]>(storageKey("created", wallet), [])
    .map(parseStoredIndex)
    .filter((row): row is PonsIndex => Boolean(row));
}

export function readAllCreatedIndexes(): PonsIndex[] {
  if (typeof window === "undefined") return [];
  const out: PonsIndex[] = [];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (!key) continue;
    if (key.startsWith(`${PREFIX}:created:`) || key === `${PREFIX}:indexes` || key === `${PREFIX}.indexes`) {
      for (const row of readJson<unknown[]>(key, [])) {
        const parsed = parseStoredIndex(row);
        if (parsed) out.push(parsed);
      }
    }
  }
  const seen = new Set<string>();
  return out.filter((item) => {
    const id = (item.id || item.slug).toLowerCase();
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function readLocalLaunches(wallet: string): StoredLaunch[] {
  return readJson<StoredLaunch[]>(storageKey("launches", wallet), []);
}

export function persistConfirmedLaunch(
  wallet: Address,
  launch: ConfirmedLaunch,
  indexKey: string | null,
): void {
  if (!launch.tokenAddress) return;
  const slug = (indexKey || launch.symbol || "").replace(/^\$/, "").toLowerCase();
  const stored: StoredLaunch = {
    id: launch.tokenAddress,
    indexId: launch.indexId || slug,
    indexSlug: slug,
    name: launch.name,
    ticker: launch.symbol,
    tokenAddress: launch.tokenAddress,
    launcher: wallet,
    createdAt: new Date().toISOString(),
    logoUrl: launch.logo,
  };
  const next = [stored, ...readLocalLaunches(wallet).filter((row) => row.id !== stored.id)];
  writeJson(storageKey("launches", wallet), next);
}

export function matchCreatedIndex(key: string): PonsIndex | null {
  const needle = key.trim().toLowerCase().replace(/^\$/, "");
  if (!needle) return null;
  return (
    readAllCreatedIndexes().find((item) => {
      const slug = item.slug.toLowerCase();
      const ticker = item.ticker.toLowerCase().replace(/^\$/, "");
      return item.id.toLowerCase() === needle || slug === needle || ticker === needle;
    }) ?? null
  );
}
