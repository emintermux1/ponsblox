import { cacheGet, cacheSet } from "@/lib/cache";
import { logWarn } from "@/lib/log";
import { recordProviderHealth, recordProviderRequest } from "@/lib/providers/store";
import type { ProviderId } from "@/lib/providers/types";

type Circuit = {
  failures: number;
  successes: number;
  openUntil: number;
  lastSuccessAt: number;
  lastFailureAt: number;
  lastStatus: number | null;
  quota: boolean;
};

const circuits = new Map<ProviderId, Circuit>();
const inflight = new Map<string, Promise<unknown>>();

function circuitOf(provider: ProviderId): Circuit {
  const existing = circuits.get(provider);
  if (existing) return existing;
  const created: Circuit = {
    failures: 0,
    successes: 0,
    openUntil: 0,
    lastSuccessAt: 0,
    lastFailureAt: 0,
    lastStatus: null,
    quota: false,
  };
  circuits.set(provider, created);
  return created;
}

export function providerOpen(provider: ProviderId): boolean {
  return Date.now() < circuitOf(provider).openUntil;
}

export function providerQuotaBlocked(provider: ProviderId): boolean {
  const row = circuitOf(provider);
  return row.quota && Date.now() < row.openUntil;
}

function openFor(provider: ProviderId, ms: number, quota = false) {
  const row = circuitOf(provider);
  row.openUntil = Math.max(row.openUntil, Date.now() + ms);
  row.quota = quota || row.quota;
}

export function noteProviderSuccess(provider: ProviderId) {
  const row = circuitOf(provider);
  row.successes += 1;
  row.failures = 0;
  row.quota = false;
  row.openUntil = 0;
  row.lastSuccessAt = Date.now();
  row.lastStatus = 200;
  void recordProviderHealth({
    provider,
    ok: true,
    status: 200,
    quota: false,
  });
}

export function noteProviderFailure(
  provider: ProviderId,
  status: number,
  code?: string,
) {
  const row = circuitOf(provider);
  row.failures += 1;
  row.lastFailureAt = Date.now();
  row.lastStatus = status;
  const quota = status === 402 || code === "QUOTA_EXCEEDED";
  if (quota) openFor(provider, 120_000, true);
  else if (status === 429) openFor(provider, 30_000);
  else if (status === 401 || status === 403) openFor(provider, 60_000);
  else if (status >= 500 || row.failures >= 3) openFor(provider, 20_000);
  logWarn("provider.fail", { provider, status, code: code ?? null, failures: row.failures });
  void recordProviderHealth({
    provider,
    ok: false,
    status,
    quota,
    message: code ?? null,
  });
}

export function coalesce<T>(key: string, load: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;
  const pending = load().finally(() => inflight.delete(key));
  inflight.set(key, pending);
  return pending;
}

export async function providerGetJson<T>(input: {
  provider: ProviderId;
  resource: string;
  url: string;
  headers: Record<string, string>;
  timeoutMs?: number;
}): Promise<{ ok: true; status: number; data: T } | { ok: false; status: number; code: string; message: string }> {
  if (providerOpen(input.provider)) {
    return {
      ok: false,
      status: providerQuotaBlocked(input.provider) ? 402 : 503,
      code: providerQuotaBlocked(input.provider) ? "QUOTA_EXCEEDED" : "circuit_open",
      message: `${input.provider} temporarily disabled.`,
    };
  }
  const started = Date.now();
  try {
    const response = await fetch(input.url, {
      headers: { Accept: "application/json", ...input.headers },
      cache: "no-store",
      signal: AbortSignal.timeout(input.timeoutMs ?? 2_000),
    });
    const status = response.status;
    void recordProviderRequest({
      provider: input.provider,
      resource: input.resource,
      status,
      ok: response.ok,
      durationMs: Date.now() - started,
    });
    if (!response.ok) {
      let code = `HTTP_${status}`;
      let message = response.statusText;
      const text = await response.text().catch(() => "");
      if (text) {
        try {
          const body = JSON.parse(text) as {
            error?: { code?: string; message?: string };
            errors?: { code?: number; message?: string };
            message?: string;
          };
          code = body.error?.code ?? (body.errors?.code != null ? String(body.errors.code) : code);
          message = body.error?.message ?? body.errors?.message ?? body.message ?? message;
        } catch {
          // keep status text; never log body
        }
      }
      noteProviderFailure(input.provider, status, code);
      return { ok: false, status, code, message };
    }
    const data = (await response.json()) as T;
    noteProviderSuccess(input.provider);
    return { ok: true, status, data };
  } catch (error) {
    noteProviderFailure(input.provider, 503, "network");
    void recordProviderRequest({
      provider: input.provider,
      resource: input.resource,
      status: 503,
      ok: false,
      durationMs: Date.now() - started,
    });
    return {
      ok: false,
      status: 503,
      code: "network",
      message: error instanceof Error ? error.message : `${input.provider} request failed.`,
    };
  }
}

export function memoryGet<T>(key: string): T | null {
  return cacheGet<T>(key);
}

export function memorySet<T>(key: string, value: T, ttlMs: number): T {
  return cacheSet(key, value, ttlMs);
}
