import type { IndexLaunch } from "@/types/pons";
import { indexApiBase } from "@/lib/indexpad/http";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const next = value.trim();
  return next || null;
}

function parseLaunch(value: unknown): IndexLaunch | null {
  const row = asRecord(value);
  if (!row) return null;
  const tokenAddress = asString(row.tokenAddress) ?? asString(row.token);
  const name = asString(row.name);
  const ticker = asString(row.ticker) ?? asString(row.symbol);
  if (!tokenAddress || !name || !ticker) return null;
  return {
    id: asString(row.id) ?? tokenAddress,
    indexId: asString(row.indexId) ?? "",
    indexSlug: asString(row.indexSlug) ?? asString(row.slug) ?? "",
    name,
    ticker,
    tokenAddress,
    launcher: asString(row.launcher) ?? asString(row.creator) ?? "",
    createdAt:
      asString(row.createdAt) ??
      (typeof row.createdAt === "number" ? String(row.createdAt) : ""),
    logoUrl: asString(row.logoUrl),
    txHash: asString(row.txHash),
    curveAddress: asString(row.curveAddress),
  };
}

/** Remote launches only. Empty when INDEXPAD_API_BASE is unset — never invented. */
export async function getIndexLaunches(): Promise<IndexLaunch[]> {
  const base = indexApiBase();
  if (!base) return [];
  try {
    const key = process.env.INDEXPAD_API_KEY?.trim();
    const headers: HeadersInit = { Accept: "application/json" };
    if (key) headers.Authorization = `Bearer ${key}`;
    const res = await fetch(`${base}/launches`, { headers, cache: "no-store" });
    if (!res.ok) return [];
    const json: unknown = await res.json();
    const payload = asRecord(json);
    const list = Array.isArray(json)
      ? json
      : Array.isArray(payload?.launches)
        ? payload.launches
        : Array.isArray(payload?.data)
          ? payload.data
          : [];
    return list.map(parseLaunch).filter((row): row is IndexLaunch => row !== null);
  } catch {
    return [];
  }
}
