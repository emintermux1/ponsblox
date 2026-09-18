import type { IndexLaunch, PonsIndex } from "@/types/pons";
import { parseStoredIndex } from "@/lib/indexpad/launch-store";

const PREFIX = "indexpad";
const serverCreated = new Map<string, PonsIndex[]>();
const serverSaved = new Map<string, string[]>();
const serverLaunches = new Map<string, IndexLaunch[]>();

function walletKey(wallet: string): string {
  return wallet.trim().toLowerCase();
}

function storageKey(kind: "created" | "launches" | "saved", wallet: string): string {
  return `${PREFIX}:${kind}:${walletKey(wallet)}`;
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

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function uniqueIndexes(rows: PonsIndex[]): PonsIndex[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const id = (row.id || row.slug).toLowerCase();
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function uniqueLaunches(rows: IndexLaunch[]): IndexLaunch[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const id = (row.id || row.tokenAddress).toLowerCase();
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function readCreatedIndexes(wallet: string): PonsIndex[] {
  const key = walletKey(wallet);
  const memory = serverCreated.get(key) ?? [];
  const stored = readJson<unknown[]>(storageKey("created", wallet), [])
    .map((row) => parseStoredIndex(row))
    .filter((row): row is PonsIndex => Boolean(row));
  return uniqueIndexes([...memory, ...stored]);
}

export function writeCreatedIndex(wallet: string, index: PonsIndex): void {
  const key = walletKey(wallet);
  const next = uniqueIndexes([index, ...readCreatedIndexes(wallet)]);
  serverCreated.set(key, next);
  writeJson(storageKey("created", wallet), next);
}

export function readAllCreatedIndexes(): PonsIndex[] {
  const fromMemory = [...serverCreated.values()].flat();
  if (typeof window === "undefined") return uniqueIndexes(fromMemory);
  const stored: PonsIndex[] = [];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (!key) continue;
    if (
      key.startsWith(`${PREFIX}:created:`) ||
      key === `${PREFIX}:indexes` ||
      key === `${PREFIX}.indexes`
    ) {
      for (const row of readJson<unknown[]>(key, [])) {
        const parsed = parseStoredIndex(row);
        if (parsed) stored.push(parsed);
      }
    }
  }
  return uniqueIndexes([...fromMemory, ...stored]);
}

export function readLocalLaunches(wallet: string): IndexLaunch[] {
  const key = walletKey(wallet);
  const memory = serverLaunches.get(key) ?? [];
  const stored = readJson<IndexLaunch[]>(storageKey("launches", wallet), []);
  return uniqueLaunches([...memory, ...stored]);
}

export function readSavedSlugs(wallet: string): string[] {
  const key = walletKey(wallet);
  const memory = serverSaved.get(key) ?? [];
  const stored = readJson<string[]>(storageKey("saved", wallet), []);
  return [...new Set([...memory, ...stored].map((slug) => slug.toLowerCase()))];
}

export function toggleSavedIndex(wallet: string, slug: string): string[] {
  const key = walletKey(wallet);
  const needle = slug.trim().toLowerCase();
  const current = readSavedSlugs(wallet);
  const next = current.includes(needle)
    ? current.filter((item) => item !== needle)
    : [needle, ...current];
  serverSaved.set(key, next);
  writeJson(storageKey("saved", wallet), next);
  return next;
}

export async function listIndexes(): Promise<PonsIndex[]> {
  return readAllCreatedIndexes();
}

export function rememberIndex(index: PonsIndex): void {
  writeCreatedIndex(index.creator || "local", index);
}

export function writeLocalLaunch(wallet: string, launch: IndexLaunch): void {
  const key = walletKey(wallet);
  const next = uniqueLaunches([launch, ...readLocalLaunches(wallet)]);
  serverLaunches.set(key, next);
  writeJson(storageKey("launches", wallet), next);
}
