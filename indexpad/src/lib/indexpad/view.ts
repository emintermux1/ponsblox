import type { Address } from "viem";
import type { AdapterCode, IndexComponent, PonsIndex, PonsToken } from "@/types";
import { slugFromSymbol } from "./format";

export type PerformanceTimeframe = "1H" | "1D" | "1W" | "1M" | "ALL";

export const PERFORMANCE_TIMEFRAMES: PerformanceTimeframe[] = [
  "1H",
  "1D",
  "1W",
  "1M",
  "ALL",
];

export type IndexPerformancePoint = {
  at: number;
  value: number;
};

export type IndexPerformanceView = {
  indexId: string;
  timeframe: PerformanceTimeframe;
  asOf: number;
  valueQuote: string | null;
  change24hBps: number | null;
  change7dBps: number | null;
  points: IndexPerformancePoint[];
  status: AdapterCode | "ok";
  message: string | null;
  componentReturns: Array<{
    symbol: string;
    change24hBps: number | null;
  }>;
};

export type CompositionRow = {
  symbol: string;
  name: string;
  weightBps: number;
  tokenAddress: Address | null;
  logo: string;
  priceQuote: string | null;
  change24hBps: number | null;
  contributionBps: number | null;
};

export type PublicIndexView = {
  source: "live" | "example";
  slug: string;
  logo: string;
  creator: string | null;
  holders: number | null;
  marketCapQuote: string | null;
  valueQuote: string | null;
  change24hBps: number | null;
  change7dBps: number | null;
  weightingMethod: string;
  index: PonsIndex;
  rows: CompositionRow[];
};

export function indexSlug(index: PonsIndex, explicit?: string): string {
  if (explicit && explicit.trim()) return slugFromSymbol(explicit);
  return slugFromSymbol(index.symbol) || slugFromSymbol(index.id) || index.id;
}

export function buildCompositionRows(
  components: IndexComponent[],
  tokens: PonsToken[],
  returns: Array<{ symbol: string; change24hBps: number | null }>,
): CompositionRow[] {
  const byAddress = new Map(tokens.map((token) => [token.address.toLowerCase(), token]));
  const bySymbol = new Map(tokens.map((token) => [token.symbol.toUpperCase(), token]));
  const returnBySymbol = new Map(
    returns.map((row) => [row.symbol.toUpperCase(), row.change24hBps]),
  );

  return components.map((component) => {
    const address = component.tokenAddress;
    const token =
      (address ? byAddress.get(address.toLowerCase()) : undefined) ??
      bySymbol.get(component.symbol.toUpperCase());
    const change24hBps = returnBySymbol.get(component.symbol.toUpperCase()) ?? null;
    const contributionBps =
      change24hBps === null ? null : Math.round((component.weightBps * change24hBps) / 10_000);

    return {
      symbol: component.symbol,
      name: token?.name || component.symbol,
      weightBps: component.weightBps,
      tokenAddress: address,
      logo: token?.logo || "",
      priceQuote: token?.priceQuote ?? null,
      change24hBps,
      contributionBps,
    };
  });
}
