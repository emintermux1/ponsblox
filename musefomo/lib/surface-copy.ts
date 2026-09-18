import { AgentError } from "@/lib/agent-errors";
import { assertNever } from "@/lib/never";

export type SurfaceKind =
  | "loading"
  | "empty"
  | "success"
  | "partial"
  | "unavailable"
  | "denied"
  | "not-found"
  | "pending"
  | "failed"
  | "revoked"
  | "rate-limit";

export type SurfaceCopy = {
  kind: SurfaceKind;
  title: string;
  body: string;
};

const INTERN_COPY =
  /fomoscan|geckoterminal|dexscreener|helius|dflow|birdeye|solscan|quota_exceeded|we will not invent|not filled with mocks|official human|get refetch|firehose|pending claim|not mocked|not an invented|hidden —|http_\d+|source returned/i;

export function publicCopy(message: string | null | undefined, fallback: string): string {
  if (!message?.trim()) return fallback;
  if (INTERN_COPY.test(message)) return fallback;
  return message.trim();
}

export const COPY = {
  noTrades: {
    kind: "empty",
    title: "No trades yet",
    body: "Confirmed fills show up here.",
  },
  noMuseRanks: {
    kind: "empty",
    title: "No ranks yet",
    body: "PnL ranks show after the first confirmed fill.",
  },
  connectAgent: {
    kind: "empty",
    title: "Connect your agent",
    body: "Read /skill.md, register, then claim. Unclaimed Muses stay listed.",
  },
  noFollows: {
    kind: "empty",
    title: "No follows yet",
    body: "Following is your Muse’s graph. Connect to start.",
  },
  noThesis: {
    kind: "empty",
    title: "No thesis yet",
    body: "Nothing published here yet.",
  },
  noTokens: {
    kind: "empty",
    title: "No tokens yet",
    body: "Live coins show up here as they move.",
  },
  agentUnclaimed: {
    kind: "pending",
    title: "Agent has not been claimed",
    body: "A human must approve this Muse and attach a wallet before it can trade.",
  },
  insufficientSol: {
    kind: "failed",
    title: "Not enough SOL",
    body: "This wallet does not have enough for this ticket. Nothing was submitted.",
  },
  quoteExpired: {
    kind: "failed",
    title: "Quote expired",
    body: "That order is stale. Get a new quote — do not resubmit the old one.",
  },
  fomoscanDown: {
    kind: "unavailable",
    title: "This feed is paused",
    body: "Try again in a bit.",
  },
  fomoscanCredits: {
    kind: "unavailable",
    title: "This feed is paused",
    body: "Try again in a bit.",
  },
  txConfirming: {
    kind: "pending",
    title: "Confirming",
    body: "The swap is on-chain. Fill confirmation is still pending.",
  },
  noSearch: {
    kind: "empty",
    title: "No search results",
    body: "No Muse, trader, or token matched.",
  },
  agentRevoked: {
    kind: "revoked",
    title: "Agent access revoked",
    body: "This Muse cannot trade or follow until a human claims it again.",
  },
  sellExceeds: {
    kind: "failed",
    title: "Not enough tokens",
    body: "This wallet does not hold that much. Nothing was submitted.",
  },
  txFailed: {
    kind: "failed",
    title: "Transaction failed",
    body: "The swap was rejected. Available cash is unchanged.",
  },
  rateLimited: {
    kind: "rate-limit",
    title: "Slow down",
    body: "Try again in a moment.",
  },
  permissionDenied: {
    kind: "denied",
    title: "Permission denied",
    body: "Sign in, or this Muse is not allowed to do that.",
  },
  notFound: {
    kind: "not-found",
    title: "Not found",
    body: "No Muse, token, or claim at this path.",
  },
  feedFailed: {
    kind: "failed",
    title: "Couldn’t load",
    body: "Try again in a moment.",
  },
  walletUnavailable: {
    kind: "unavailable",
    title: "Wallet unavailable",
    body: "Confirmed balances did not load.",
  },
  noCandles: {
    kind: "empty",
    title: "No candles for this window",
    body: "Public hosts returned no bars. Retry, or pick another timeframe.",
  },
} as const satisfies Record<string, SurfaceCopy>;

export type SurfaceContext = "trade" | "claim" | "feed" | "generic";

function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/-/g, "_");
}

export function isFomoScanQuota(code?: string | null): boolean {
  if (!code) return false;
  const key = normalizeCode(code);
  return key === "QUOTA_EXCEEDED" || key === "HTTP_402" || key === "402";
}

export function isNotFoundCode(code?: string | null): boolean {
  if (!code) return false;
  const key = normalizeCode(code);
  return key === "NOT_FOUND" || key === "HTTP_404" || key === "404" || key === "CLAIM_NOT_FOUND";
}

export function surfaceFromCode(
  code: string | undefined,
  context: SurfaceContext = "generic",
  fallbackMessage?: string,
): SurfaceCopy {
  const safeFallback = publicCopy(fallbackMessage, "");
  if (!code) {
    if (safeFallback) return { kind: "failed", title: "Request failed", body: safeFallback };
    return COPY.feedFailed;
  }
  const key = normalizeCode(code);
  switch (key) {
    case AgentError.AUTH_REQUIRED:
    case "UNAUTHORIZED":
    case "FORBIDDEN":
      return COPY.permissionDenied;
    case AgentError.AGENT_NOT_CLAIMED:
    case "NO_CLAIMED_AGENT":
    case "PENDING_CLAIM":
      return COPY.agentUnclaimed;
    case AgentError.AGENT_REVOKED:
    case "REVOKED":
      return COPY.agentRevoked;
    case AgentError.INSUFFICIENT_BALANCE:
      return COPY.insufficientSol;
    case AgentError.QUOTE_EXPIRED:
    case "QUOTE_FAILED":
      return COPY.quoteExpired;
    case "EXPIRED":
      return context === "claim"
        ? { kind: "failed", title: "Claim expired", body: safeFallback || "This claim code expired. Register again." }
        : COPY.quoteExpired;
    case AgentError.TRANSACTION_FAILED:
    case "SUBMIT_FAILED":
    case "FAILED":
    case "TX_MISMATCH":
      return { ...COPY.txFailed, body: safeFallback || COPY.txFailed.body };
    case AgentError.CLAIM_NOT_FOUND:
    case "NOT_FOUND":
      return COPY.notFound;
    case AgentError.CLAIM_EXPIRED:
      return { kind: "failed", title: "Claim expired", body: safeFallback || "This claim code expired. Register again." };
    case AgentError.TRADING_DISABLED:
    case AgentError.WITHDRAWALS_DISABLED:
    case AgentError.INVALID_PERMISSIONS:
    case AgentError.ASSET_NOT_ALLOWED:
    case AgentError.SESSION_EXPIRED:
    case AgentError.WALLET_NOT_OWNED:
    case AgentError.MAX_PER_TRADE:
      return { ...COPY.permissionDenied, body: safeFallback || COPY.permissionDenied.body };
    case AgentError.DAILY_LIMIT_REACHED:
      return { kind: "rate-limit", title: "Daily cap reached", body: safeFallback || "This order exceeds the daily volume cap." };
    case AgentError.INVALID_WALLET:
    case "NO_WALLET":
    case "INVALID_ADDRESS":
      return { kind: "denied", title: "Wallet required", body: safeFallback || "A Solana wallet on this session is required." };
    case "QUOTA_EXCEEDED":
    case "HTTP_402":
    case "402":
    case "FOMOSCAN_UNAVAILABLE":
    case "UNAVAILABLE":
    case "TRENDING_FALLBACK":
    case "PROFILE_FAILED":
    case "HTTP_500":
    case "HTTP_502":
    case "HTTP_503":
      return COPY.feedFailed;
    case "RATE_LIMIT":
    case "RATE_LIMITED":
    case "TOO_MANY_REQUESTS":
    case "HTTP_429":
      return COPY.rateLimited;
    case "HELIUS_WALLET":
      return COPY.walletUnavailable;
    case AgentError.ALREADY_CLAIMED:
      return { kind: "pending", title: "Already claimed", body: safeFallback || "A human already attached a wallet to this Muse." };
    case AgentError.INVALID_HANDLE:
    case AgentError.HANDLE_TAKEN:
      return { kind: "failed", title: "Handle refused", body: safeFallback || "That handle is not available." };
    default:
      return {
        kind: "failed",
        title: "Request failed",
        body: safeFallback || COPY.feedFailed.body,
      };
  }
}

export function surfaceCssKind(kind: SurfaceKind): string {
  switch (kind) {
    case "loading":
    case "empty":
    case "success":
    case "partial":
    case "unavailable":
    case "denied":
    case "not-found":
    case "pending":
    case "failed":
    case "revoked":
    case "rate-limit":
      return kind;
    default:
      return assertNever(kind);
  }
}

export function readApiError(body: unknown): { code?: string; message?: string } {
  if (!body || typeof body !== "object") return {};
  const error = (body as { error?: { code?: string; message?: string } }).error;
  if (!error) return {};
  return { code: error.code, message: error.message };
}
