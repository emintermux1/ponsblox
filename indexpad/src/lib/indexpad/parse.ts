import type { Address } from "viem";
import { isAddress } from "viem";
import type { IndexComponent, PonsIndex, PonsIndexStatus } from "@/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asAddress(value: unknown): Address | null {
  const text = asString(value);
  if (!text || !isAddress(text)) return null;
  return text;
}

function asStatus(value: unknown): PonsIndexStatus {
  if (value === "draft" || value === "launched" || value === "failed") return value;
  return "draft";
}

export function parseComponent(raw: unknown): IndexComponent | null {
  if (!isRecord(raw)) return null;
  const symbol = asString(raw.symbol);
  const weightBps = asNumber(raw.weightBps ?? raw.weight_bps);
  if (!symbol || weightBps === null || weightBps < 0) return null;
  return {
    symbol: symbol.replace(/^\$/, "").toUpperCase(),
    weightBps: Math.round(weightBps),
    tokenAddress: asAddress(raw.tokenAddress ?? raw.token_address ?? raw.address),
  };
}

export function parsePonsIndex(raw: unknown): PonsIndex | null {
  if (!isRecord(raw)) return null;
  const id = asString(raw.id);
  const name = asString(raw.name);
  const symbol = asString(raw.symbol);
  if (!id || !name || !symbol) return null;

  const rawComponents = Array.isArray(raw.components) ? raw.components : [];
  const components = rawComponents
    .map(parseComponent)
    .filter((row): row is IndexComponent => row !== null);

  return {
    id,
    name,
    symbol: symbol.replace(/^\$/, "").toUpperCase(),
    description: asString(raw.description) || "",
    components,
    coinAddress: asAddress(raw.coinAddress ?? raw.coin_address),
    createdAt: asNumber(raw.createdAt ?? raw.created_at) ?? 0,
    status: asStatus(raw.status),
  };
}

export type IndexExtras = {
  slug: string | null;
  logo: string;
  creator: string | null;
  holders: number | null;
  marketCapQuote: string | null;
  valueQuote: string | null;
  change24hBps: number | null;
  change7dBps: number | null;
  weightingMethod: string | null;
  volume24h: number | null;
  tradeCount: number | null;
  launchCount: number | null;
};

export function parseIndexExtras(raw: unknown): IndexExtras {
  if (!isRecord(raw)) {
    return {
      slug: null,
      logo: "",
      creator: null,
      holders: null,
      marketCapQuote: null,
      valueQuote: null,
      change24hBps: null,
      change7dBps: null,
      weightingMethod: null,
      volume24h: null,
      tradeCount: null,
      launchCount: null,
    };
  }

  const creator = asString(raw.creator ?? raw.creatorWallet ?? raw.creator_wallet);
  const marketCap = raw.marketCapQuote ?? raw.market_cap_quote ?? raw.marketCap;
  const value = raw.valueQuote ?? raw.value_quote ?? raw.value;
  const change24 = asNumber(raw.change24hBps ?? raw.change_24h_bps);
  const change7 = asNumber(raw.change7dBps ?? raw.change_7d_bps);

  return {
    slug: asString(raw.slug),
    logo: asString(raw.logo ?? raw.logoUrl ?? raw.logo_url) || "",
    creator: creator && isAddress(creator) ? creator : creator,
    holders: asNumber(raw.holders),
    marketCapQuote:
      typeof marketCap === "string" || typeof marketCap === "number" ? String(marketCap) : null,
    valueQuote: typeof value === "string" || typeof value === "number" ? String(value) : null,
    change24hBps: change24,
    change7dBps: change7,
    weightingMethod: asString(raw.weightingMethod ?? raw.weighting_method),
    volume24h: asNumber(raw.volume24h ?? raw.volume_24h ?? raw.volume),
    tradeCount: asNumber(raw.tradeCount ?? raw.trades),
    launchCount: asNumber(raw.launchCount ?? raw.launches),
  };
}

export function parsePerformancePoints(raw: unknown): Array<{ at: number; value: number }> {
  if (!Array.isArray(raw)) return [];
  const points: Array<{ at: number; value: number }> = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const at = asNumber(item.at ?? item.t ?? item.time ?? item.timestamp);
    const value = asNumber(item.value ?? item.v ?? item.close);
    if (at === null || value === null) continue;
    points.push({ at, value });
  }
  return points.sort((a, b) => a.at - b.at);
}
