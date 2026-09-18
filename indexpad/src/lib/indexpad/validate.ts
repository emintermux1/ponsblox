import { isAddress } from "viem";
import type { CreateIndexInput, IndexComponent, PonsIndex, PonsIndexStatus } from "@/types";

const WEIGHT_SUM_BPS = 10_000;

export function validateComponents(components: IndexComponent[]): string | null {
  if (components.length === 0) return "Add at least one component";
  let sum = 0;
  for (const row of components) {
    if (!row.symbol.trim()) return "Each component needs a symbol";
    if (!Number.isInteger(row.weightBps) || row.weightBps <= 0) {
      return "Weights must be positive integer basis points";
    }
    if (row.tokenAddress && !isAddress(row.tokenAddress)) {
      return `${row.symbol} has an invalid token address`;
    }
    sum += row.weightBps;
  }
  if (sum !== WEIGHT_SUM_BPS) {
    return `Component weights must sum to 100% (${WEIGHT_SUM_BPS} bps), got ${sum}`;
  }
  return null;
}

export function validateCreateIndex(input: CreateIndexInput): string | null {
  if (!input.name.trim()) return "Name is required";
  if (!/^[A-Za-z0-9]{2,11}$/.test(input.symbol.trim())) return "Symbol must be 2–11 letters or digits";
  return validateComponents(input.components);
}

function asStatus(value: unknown): PonsIndexStatus {
  switch (value) {
    case "draft":
    case "launched":
    case "failed":
      return value;
    default:
      return "draft";
  }
}

function asComponent(raw: unknown): IndexComponent | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.symbol !== "string" || typeof row.weightBps !== "number") return null;
  const tokenAddress =
    typeof row.tokenAddress === "string" && isAddress(row.tokenAddress) ? row.tokenAddress : null;
  return {
    symbol: row.symbol,
    weightBps: row.weightBps,
    tokenAddress,
  };
}

export function parsePonsIndex(raw: unknown): PonsIndex | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.name !== "string" || typeof row.symbol !== "string") {
    return null;
  }
  const components = Array.isArray(row.components)
    ? row.components.map(asComponent).filter((c): c is IndexComponent => Boolean(c))
    : [];
  return {
    id: row.id,
    name: row.name,
    symbol: row.symbol,
    description: typeof row.description === "string" ? row.description : "",
    components,
    coinAddress:
      typeof row.coinAddress === "string" && isAddress(row.coinAddress) ? row.coinAddress : null,
    createdAt: typeof row.createdAt === "number" ? row.createdAt : 0,
    status: asStatus(row.status),
  };
}

export function parseIndexList(raw: unknown): PonsIndex[] {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object"
      ? ((raw as Record<string, unknown>).indexes ??
          (raw as Record<string, unknown>).data ??
          (raw as Record<string, unknown>).items)
      : [];
  if (!Array.isArray(list)) return [];
  return list.map(parsePonsIndex).filter((row): row is PonsIndex => Boolean(row));
}
