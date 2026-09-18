export const SOL_MINT = "So11111111111111111111111111111111111111112";
export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const BONK_MINT = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";
export const JUP_MINT = "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN";
export const WIF_MINT = "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm";
export const TRUMP_MINT = "6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN";
export const SOL_DECIMALS = 9;

export const LIQUID_MINTS = [SOL_MINT, USDC_MINT, BONK_MINT, JUP_MINT, WIF_MINT, TRUMP_MINT] as const;

export const LIQUID_MINT_ALIASES: Record<string, string> = {
  sol: SOL_MINT,
  wsol: SOL_MINT,
  usdc: USDC_MINT,
  bonk: BONK_MINT,
  jup: JUP_MINT,
  jupiter: JUP_MINT,
  wif: WIF_MINT,
  trump: TRUMP_MINT,
};

export const DEFAULT_SLIPPAGE_BPS = 100;
export const QUOTE_TTL_MS = 20_000;
export const QUOTE_BUDGET_MS = 3_000;
export const PUBLIC_GET_MS = 1_800;
/** Public homepage / people / leaderboard / feed — fail-open before the pooler checkout hangs. */
export const PUBLIC_DB_MS = 250;
export const HOUR_MS = 60 * 60_000;
/** Background thesis refresh. Never block TTFB on this window. */
export const THESES_SWR_MS = 2 * 60_000;

export const FOMOSCAN_CACHE_MS = {
  me: HOUR_MS,
  user: HOUR_MS,
  thesis: HOUR_MS,
  leaderboard: HOUR_MS,
  pnl: HOUR_MS,
} as const;

export const PROVIDER_TTL_MS = {
  tokenPrice: 15_000,
  tokenOverview: 45_000,
  trending: 90_000,
  holders: 3 * 60_000,
  walletIdentity: 12 * 60 * 60_000,
  fomoLeaderboard: HOUR_MS,
  fomoThesis: HOUR_MS,
  traderProfile: 20 * 60_000,
  providerLog: 24 * 60 * 60_000,
} as const;

export const WHALE_BUY_USD = 19_000;

export const QUICK_BUY_SOL = [0.01, 0.05, 0.1, 0.25, 0.5, 1] as const;
export const QUICK_BUY_USD = [1, 5, 10, 25] as const;
export const CHART_TIMEFRAMES = ["1H", "4H", "1D", "7D", "1M"] as const;

export const AGENT_STATUSES = ["pending_claim", "claimed", "revoked"] as const;
export const AGENT_SESSION_STATUSES = ["pending", "active", "paused", "expired", "revoked"] as const;

export const DEFAULT_MAX_TRADE_SOL = 0.5;
export const DEFAULT_MAX_DAILY_SOL = 2;
export const DEFAULT_SESSION_DAYS = 30;
export const TRADE_SIDES = ["buy", "sell"] as const;
export const TRADE_STATUSES = [
  "quoted",
  "awaiting_signature",
  "submitted",
  "confirming",
  "confirmed",
  "failed",
  "expired",
] as const;
export const FEED_KINDS = ["trade", "thesis", "follow"] as const;
export const FEED_TABS = ["for-you", "following", "thesis"] as const;
export const FEED_ACTIONS = ["buy", "sell", "thesis", "close", "realized_pnl", "follow"] as const;
export const LEADERBOARD_WINDOWS = ["24h", "7d", "30d", "all"] as const;
export const LEADERBOARD_WINDOW_LABELS: Record<(typeof LEADERBOARD_WINDOWS)[number], string> = {
  "24h": "24H",
  "7d": "7D",
  "30d": "30D",
  all: "ALL",
};

export const SEARCH_MIN_CHARS = 2;
export const SEARCH_LIMIT = 8;
export const SEARCH_DEBOUNCE_MS = 280;
export const SEARCH_CACHE_MS = 2_000;
export const TAPE_CACHE_MS = 2_000;
export const TAPE_BUDGET_MS = 2_000;
export const PUBLIC_CACHE_2S = "public, s-maxage=2, stale-while-revalidate=20";
export const DISCOVER_CACHE_MS = 90_000;
export const DISCOVER_SECTION_LIMIT = 16;
export const PROVIDER_BUDGET_MS = 2_000;
export const FOMO_BUDGET_MS = 2_000;
export const MUSE_BOARD_LIMIT = 40;

export const MINT_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export const HANDLE_RE = /^[a-z0-9_]{2,32}$/;
