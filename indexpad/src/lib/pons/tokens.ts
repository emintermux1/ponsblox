import { isAddress, type Address } from "viem";
import { serverEnv } from "@/lib/env";
import type { AdapterResult, PonsToken } from "@/types";
import { readPonsToken, scanRecentLaunches } from "./factory";

function asList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== "object") return [];
  const root = raw as Record<string, unknown>;
  const nested = root.tokens ?? root.data ?? root.items;
  return Array.isArray(nested) ? nested : [];
}

function addressFromLoose(item: unknown): Address | null {
  if (!item || typeof item !== "object") return null;
  const row = item as Record<string, unknown>;
  const raw = row.address ?? row.token ?? row.tokenAddress;
  if (typeof raw !== "string" || !isAddress(raw)) return null;
  return raw;
}

async function catalogAddresses(): Promise<Address[]> {
  const base = serverEnv("PONS_API_BASE").replace(/\/$/, "");
  if (!base) return [];
  const key = serverEnv("PONS_API_KEY");
  const headers: HeadersInit = { Accept: "application/json" };
  if (key) headers.Authorization = `Bearer ${key}`;
  const res = await fetch(`${base}/tokens`, { headers, cache: "no-store" });
  if (!res.ok) throw new Error(`PONS_API_BASE returned ${res.status}`);
  const body: unknown = await res.json();
  return asList(body)
    .map(addressFromLoose)
    .filter((addr): addr is Address => Boolean(addr));
}

export async function getPonsTokens(): Promise<AdapterResult<PonsToken[]>> {
  try {
    const fromCatalog = await catalogAddresses().catch(() => [] as Address[]);
    const fromFactory = await scanRecentLaunches();
    const addresses = [...new Set([...fromCatalog, ...fromFactory].map((a) => a.toLowerCase() as Address))];
    const rows = (
      await Promise.all(addresses.map((addr) => readPonsToken(addr).catch(() => null)))
    ).filter((row): row is PonsToken => Boolean(row));
    return { ok: true, data: rows };
  } catch (error) {
    return {
      ok: false,
      code: "upstream",
      message: error instanceof Error ? error.message : "Pons factory read failed",
    };
  }
}

export async function getPonsToken(address: string): Promise<AdapterResult<PonsToken>> {
  if (!isAddress(address)) {
    return { ok: false, code: "invalid", message: "Not a valid token address" };
  }
  try {
    const token = await readPonsToken(address);
    if (!token) {
      return { ok: false, code: "not_found", message: "Not a Pons factory launch" };
    }
    return { ok: true, data: token };
  } catch (error) {
    return {
      ok: false,
      code: "upstream",
      message: error instanceof Error ? error.message : "Pons token read failed",
    };
  }
}
