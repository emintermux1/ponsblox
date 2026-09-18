import type { Address } from "viem";

export type DraftComponent = {
  id: string;
  symbol: string;
  name: string;
  logo: string;
  priceQuote: string | null;
  tokenAddress: Address | null;
  weightPct: number;
};

export type CreatedView = {
  name: string;
  symbol: string;
  slug: string;
  components: DraftComponent[];
};

export type WizardStep = "tokens" | "composition" | "details" | "review";

export const WIZARD_STEPS: WizardStep[] = ["tokens", "composition", "details", "review"];

export const STEP_LABEL: Record<WizardStep, string> = {
  tokens: "Coins",
  composition: "Weights",
  details: "Details",
  review: "Review",
};

/** Draft-only blotter when getPonsTokens() is empty. Never returned by getPonsIndexes(). */
export function exampleDraftRows(): DraftComponent[] {
  return [
    { id: "draft-aaa", symbol: "AAA", name: "Draft AAA", logo: "", priceQuote: null, tokenAddress: null, weightPct: 40 },
    { id: "draft-bbb", symbol: "BBB", name: "Draft BBB", logo: "", priceQuote: null, tokenAddress: null, weightPct: 30 },
    { id: "draft-ccc", symbol: "CCC", name: "Draft CCC", logo: "", priceQuote: null, tokenAddress: null, weightPct: 20 },
    { id: "draft-ddd", symbol: "DDD", name: "Draft DDD", logo: "", priceQuote: null, tokenAddress: null, weightPct: 10 },
  ];
}

export function isDraftRow(row: DraftComponent): boolean {
  return row.id.startsWith("draft-") || row.tokenAddress == null;
}
