export type ExploreSort = "trending" | "new" | "top" | "created" | "traded";

export const EXPLORE_TABS: { id: ExploreSort; label: string }[] = [
  { id: "trending", label: "Trending" },
  { id: "new", label: "New" },
  { id: "top", label: "Top Performing" },
  { id: "created", label: "Most Created" },
  { id: "traded", label: "Most Traded" },
];

export function parseExploreSort(raw: string | string[] | undefined): ExploreSort {
  const value = Array.isArray(raw) ? raw[0] : raw;
  switch (value) {
    case "trending":
    case "new":
    case "top":
    case "created":
    case "traded":
      return value;
    case "top-performing":
    case "performing":
      return "top";
    case "most-created":
      return "created";
    case "most-traded":
      return "traded";
    default:
      return "trending";
  }
}

export type ExploreIndex = {
  id: string;
  slug: string;
  name: string;
  ticker: string;
  logoUrl: string;
  creator: string;
  createdAt: number;
  change24hBps: number | null;
  change7dBps: number | null;
  marketCapQuote: string | null;
  assetCount: number;
  topComponents: Array<{ symbol: string; logo: string }>;
  sparkline: number[] | null;
  volume24h: number | null;
  tradeCount: number | null;
  launchCount: number | null;
};
