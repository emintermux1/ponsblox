import { PUBLIC_GET_MS } from "@/lib/constants";
import { raceTimeout } from "@/lib/fast-fetch";

type Entry<T> = { value: T; expiresAt: number };

const store = new Map<string, Entry<unknown>>();
const lastGood = new Map<string, unknown>();
const inflight = new Map<string, Promise<unknown>>();

export function cacheGet<T>(key: string): T | null {
  const hit = store.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    store.delete(key);
    return null;
  }
  return hit.value as T;
}

export function cachePeek<T>(key: string): { value: T; fresh: boolean } | null {
  const hit = store.get(key);
  if (hit && hit.expiresAt > Date.now()) return { value: hit.value as T, fresh: true };
  if (lastGood.has(key)) return { value: lastGood.get(key) as T, fresh: false };
  return null;
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): T {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
  lastGood.set(key, value);
  return value;
}

function trackInflight<T>(key: string, work: Promise<T>): Promise<T> {
  inflight.set(key, work);
  return work.finally(() => {
    if (inflight.get(key) === work) inflight.delete(key);
  });
}

export async function cacheWrap<T>(
  key: string,
  ttlMs: number,
  load: () => Promise<T>,
): Promise<T> {
  const existing = cacheGet<T>(key);
  if (existing !== null) return existing;
  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;
  return trackInflight(
    key,
    load().then((value) => cacheSet(key, value, ttlMs)),
  );
}

/** Same as cacheWrap, but skip storing a miss so a 429/empty does not freeze the UI. */
export async function cacheWrapIf<T>(
  key: string,
  ttlMs: number,
  load: () => Promise<T>,
  persist: (value: T) => boolean,
): Promise<T> {
  const existing = cacheGet<T>(key);
  if (existing !== null) return existing;
  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;
  return trackInflight(
    key,
    load().then((value) => {
      if (persist(value)) cacheSet(key, value, ttlMs);
      return value;
    }),
  );
}

export function cacheDelete(key: string) {
  store.delete(key);
}

export function cacheDeletePrefix(prefix: string) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

/** Serve last-good instantly and refresh in the background. Cold miss waits on load. */
export async function cacheSWR<T>(
  key: string,
  ttlMs: number,
  load: () => Promise<T>,
  persist: (value: T) => boolean = () => true,
): Promise<T> {
  const peek = cachePeek<T>(key);
  if (peek?.fresh) return peek.value;
  const pending = inflight.get(key);
  if (pending) return peek ? peek.value : (pending as Promise<T>);
  const work = trackInflight(
    key,
    load().then((value) => {
      if (persist(value)) cacheSet(key, value, ttlMs);
      return value;
    }),
  );
  if (peek) {
    void work;
    return peek.value;
  }
  return work;
}

/**
 * Public GET primitive: fresh/stale cache is instant; cold miss waits at most `budgetMs`.
 * One inflight load per key until it settles — never pile leftover pooler checkouts.
 */
export async function cachePublic<T>(
  key: string,
  ttlMs: number,
  load: () => Promise<T>,
  fallback: T,
  persist: (value: T) => boolean = () => true,
  budgetMs = PUBLIC_GET_MS,
): Promise<T> {
  const peek = cachePeek<T>(key);
  if (peek?.fresh) return peek.value;
  const pending = inflight.get(key);
  if (peek) {
    if (!pending) {
      void cacheWrapIf(key, ttlMs, load, persist);
    }
    return peek.value;
  }
  if (pending) return raceTimeout(pending as Promise<T>, fallback, budgetMs);
  return raceTimeout(cacheWrapIf(key, ttlMs, load, persist), fallback, budgetMs);
}
