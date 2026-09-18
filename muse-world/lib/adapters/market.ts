import "server-only";

import type { WorldEventKind } from "@/types/world";

export type MarketPulse = {
  kind: WorldEventKind | "QUIET";
  ticker: string | null;
  source: "gecko" | "sim";
};

type GeckoPool = {
  attributes?: {
    name?: string;
    volume_usd?: { h1?: string };
  };
};

let lastPulse: MarketPulse = { kind: "QUIET", ticker: null, source: "sim" };
let lastAt = 0;

function tickerFromName(name: string | undefined): string | null {
  if (!name) {
    return null;
  }
  const token = name.split("/")[0]?.trim();
  if (!token || token.length > 8) {
    return null;
  }
  return token.toUpperCase();
}

export async function peekMarketPulse(): Promise<MarketPulse> {
  const now = Date.now();
  if (now - lastAt < 12_000) {
    return lastPulse;
  }
  lastAt = now;
  try {
    const response = await fetch(
      "https://api.geckoterminal.com/api/v2/networks/solana/trending_pools?page=1",
      {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(1800),
        next: { revalidate: 20 },
      },
    );
    if (!response.ok) {
      lastPulse = { kind: "QUIET", ticker: null, source: "sim" };
      return lastPulse;
    }
    const body = (await response.json()) as { data?: GeckoPool[] };
    const row = body.data?.[0];
    const ticker = tickerFromName(row?.attributes?.name);
    const volume = Number(row?.attributes?.volume_usd?.h1 ?? 0);
    lastPulse = {
      kind: volume > 40_000 ? "TREND_SPIKE" : "VIRAL_POST",
      ticker,
      source: "gecko",
    };
    return lastPulse;
  } catch {
    lastPulse = { kind: "QUIET", ticker: null, source: "sim" };
    return lastPulse;
  }
}
