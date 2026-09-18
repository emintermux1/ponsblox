import { cancelQuery } from "@/lib/sql-timeout";

export const PROVIDER_BUDGET_MS = 2_000;
export const FOMO_BUDGET_MS = 2_000;
export const PEEK_BUDGET_MS = 1_500;
export const PUBLIC_GET_MS = 1_800;
export const QUOTE_BUDGET_MS = 3_000;

function delayResolve<T>(value: T, ms: number): { promise: Promise<T>; cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const promise = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(value), ms);
  });
  return {
    promise,
    cancel() {
      if (timer) clearTimeout(timer);
    },
  };
}

/** Resolve `fallback` on timeout or if `work` rejects. Cancels leftover thenables (postgres.js queries). */
export async function raceTimeout<T>(work: Promise<T>, fallback: T, ms: number): Promise<T> {
  const late = delayResolve(fallback, ms);
  let timedOut = false;
  const timeoutSide = late.promise.then((value) => {
    timedOut = true;
    cancelQuery(work);
    return value;
  });
  try {
    return await Promise.race([work.catch(() => fallback), timeoutSide]);
  } finally {
    late.cancel();
    if (timedOut) cancelQuery(work);
  }
}

/** Resolve `fallback` on timeout only. Work errors propagate. */
export async function raceOr<T>(work: Promise<T>, fallback: T, ms: number): Promise<T> {
  const late = delayResolve(fallback, ms);
  try {
    return await Promise.race([work, late.promise]);
  } finally {
    late.cancel();
  }
}

export async function publicJson<T>(url: string, ms = PUBLIC_GET_MS): Promise<T | null> {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "MuseFOMO/1.0 (+https://musefomo.family)",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(ms),
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function publicText(url: string, ms = PUBLIC_GET_MS): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html,application/json,text/x-component,*/*",
        "User-Agent": "MuseFOMO/1.0 (+https://musefomo.family)",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(ms),
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

/** FomoScan live reads — hard 2s, never wait on the identity API. */
export async function fomoJson<T>(
  url: string,
  headers?: Record<string, string>,
): Promise<T | null> {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "MuseFOMO/1.0 (+https://musefomo.family)",
        ...headers,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(FOMO_BUDGET_MS),
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export function finitePrice(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}
