import "server-only";

import {
  assertSource,
  honestyFromLabel,
  marketPulseFromFetch,
  simMarketPulse,
  type MarketPulse,
} from "@/lib/adapters/source";

export type { MarketPulse };

let lastPulse: MarketPulse = simMarketPulse();
let lastAt = 0;

export async function peekMarketPulse(): Promise<MarketPulse> {
  const now = Date.now();
  if (now - lastAt < 12_000) {
    assertSource(honestyFromLabel(lastPulse.source));
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
      lastPulse = marketPulseFromFetch({ status: "http-error" });
      assertSource(honestyFromLabel(lastPulse.source));
      return lastPulse;
    }
    const body: unknown = await response.json();
    lastPulse = marketPulseFromFetch({ status: "ok", body });
    assertSource(honestyFromLabel(lastPulse.source));
    return lastPulse;
  } catch {
    lastPulse = marketPulseFromFetch({ status: "network-error" });
    assertSource(honestyFromLabel(lastPulse.source));
    return lastPulse;
  }
}
