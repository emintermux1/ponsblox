import type { PonsIndex } from "@/types";
import type { IndexExtras } from "./parse";

/** Preview copy only — never returned from getPonsIndexes(). */
export const EXAMPLE_PINT_SLUG = "pint";

export const EXAMPLE_PINT_INDEX: PonsIndex = {
  id: "example-pint",
  name: "Pons Intelligence Index",
  symbol: "PINT",
  description: "Example composition for layout preview. Not a live index and not a quoted market.",
  components: [
    { symbol: "AAA", weightBps: 4000, tokenAddress: null },
    { symbol: "BBB", weightBps: 3000, tokenAddress: null },
    { symbol: "CCC", weightBps: 2000, tokenAddress: null },
    { symbol: "DDD", weightBps: 1000, tokenAddress: null },
  ],
  coinAddress: null,
  createdAt: 0,
  status: "draft",
};

export const EXAMPLE_PINT_EXTRAS: IndexExtras = {
  slug: EXAMPLE_PINT_SLUG,
  logo: "",
  creator: null,
  holders: null,
  marketCapQuote: null,
  valueQuote: null,
  change24hBps: null,
  change7dBps: null,
  weightingMethod: "Fixed weights",
  volume24h: null,
  tradeCount: null,
  launchCount: null,
};
