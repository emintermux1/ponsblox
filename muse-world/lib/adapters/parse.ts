export type GrokBias = "buy" | "pass" | "watch";
export type GrokSource = "bot" | "xai" | "sim";
export type MuseId = "scroller" | "trader" | "chill" | "builder";
export type GrokEventKind = "GROK_REQUESTED" | "GROK_RESPONSE";

export type GrokToolReply = {
  source: "xai";
  summary: string;
  bias: GrokBias;
};

export type GrokWakeResult = {
  woken: boolean;
  pendingIngest: boolean;
  xai: GrokToolReply | null;
};

export type SimGrokReply = {
  source: "sim";
  summary: string;
  bias: "watch";
};

export type GrokReply = GrokToolReply | SimGrokReply;

export type MarketProviderId = "gecko" | "birdeye" | "helius" | "gmgn";
export type ProviderStatus = "ok" | "skip" | "error";

export type MarketHit = {
  source: Exclude<MarketProviderId, "helius">;
  ticker: string | null;
  mint: string | null;
  volumeUsd: number;
};

export type HeliusConfirm = {
  symbol: string | null;
  mint: string | null;
};

export type MarketPulse = {
  kind: "TREND_SPIKE" | "VIRAL_POST" | "QUIET";
  ticker: string | null;
  mint: string | null;
  source: MarketProviderId | "sim";
  providers: Record<MarketProviderId, ProviderStatus>;
  fills: readonly [];
};

export type GrokWorldEvent = {
  id: string;
  kind: GrokEventKind;
  museId: MuseId;
  text: string;
  at: number;
  source: GrokSource;
};

const FILL_CLAIM =
  /\b(txid|tx id|signature)\b|executed (the )?trade|opened a position|closed a position|bought \d|sold \d|fill id/i;

export function classifyGrokBias(text: string): GrokBias {
  const lower = text.toLowerCase();
  if (lower.includes("pass") || lower.includes("avoid") || lower.includes("thin")) {
    return "pass";
  }
  if (lower.includes("buy") || lower.includes("asymmetric") || lower.includes("early")) {
    return "buy";
  }
  return "watch";
}

export function grokSourceLabel(source: GrokSource): string {
  switch (source) {
    case "bot":
      return "bot/REAL";
    case "xai":
      return "xai/REAL";
    case "sim":
      return "SIM";
    default: {
      const _never: never = source;
      return _never;
    }
  }
}

export function claimsExecutedFill(text: string): boolean {
  return FILL_CLAIM.test(text);
}

export function ingestAuthorized(
  secret: string | undefined,
  header: string | null,
): "ok" | "missing_secret" | "unauthorized" {
  if (!secret) {
    return "missing_secret";
  }
  if (header === secret || header === `Bearer ${secret}`) {
    return "ok";
  }
  return "unauthorized";
}

export function resolveWakeResult(woken: boolean, xai: GrokToolReply | null): GrokWakeResult {
  return {
    woken,
    pendingIngest: woken,
    xai,
  };
}

export function grokReplyFromWake(result: GrokWakeResult): GrokReply {
  if (result.xai) {
    return result.xai;
  }
  return {
    source: "sim",
    summary: result.woken
      ? "Grok Bot woken — waiting on ingest"
      : "no Grok key — SIM context only",
    bias: "watch",
  };
}

const COT_MARK =
  /\b(because|therefore|firstly|secondly|step\s+\d|chain of thought|let me think|as an ai|reasoning)\b/i;

export const SIM_LITERARY_STUBS = [
  "mid",
  "wait",
  "later",
  "watching",
  "nah",
  "window",
] as const;

export function loftCaptionFromText(text: string): string | null {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed || claimsExecutedFill(trimmed) || COT_MARK.test(trimmed)) {
    return null;
  }
  if (trimmed.length <= 64) {
    return trimmed;
  }
  const clause = trimmed.split(/[.!?;]/)[0]?.trim() ?? "";
  if (
    clause &&
    clause.length <= 40 &&
    !COT_MARK.test(clause) &&
    !claimsExecutedFill(clause)
  ) {
    return clause;
  }
  return null;
}

export function labeledLoftThought(source: GrokSource, caption: string): string | null {
  const clean = loftCaptionFromText(caption);
  if (!clean) {
    return null;
  }
  const tag = grokSourceLabel(source);
  if (clean.startsWith(`${tag} · `)) {
    return clean.length <= 64 ? clean : null;
  }
  const labeled = `${tag} · ${clean}`;
  return labeled.length <= 64 ? labeled : clean;
}

export function simLiteraryThought(now = Date.now()): string {
  const stub = SIM_LITERARY_STUBS[now % SIM_LITERARY_STUBS.length] ?? "wait";
  return `SIM · ${stub}`;
}

export function loftThoughtFromWake(
  result: GrokWakeResult,
  now = Date.now(),
): { thought: string; source: GrokSource } {
  const caption = result.xai ? labeledLoftThought("xai", result.xai.summary) : null;
  if (caption) {
    return { thought: caption, source: "xai" };
  }
  return { thought: simLiteraryThought(now), source: "sim" };
}

export function grokEventText(
  museName: string,
  kind: GrokEventKind,
  source: GrokSource,
  summary: string,
): string {
  const arrow = kind === "GROK_RESPONSE" ? "←" : "→";
  return `${museName} ${arrow} ${grokSourceLabel(source)} · ${summary}`;
}

export function makeGrokEvent(input: {
  kind: GrokEventKind;
  museId: MuseId;
  museName: string;
  source: GrokSource;
  summary: string;
  now?: number;
}): GrokWorldEvent {
  const now = input.now ?? Date.now();
  return {
    id: `ev_${now.toString(36)}_${input.source}`,
    kind: input.kind,
    museId: input.museId,
    text: grokEventText(input.museName, input.kind, input.source, input.summary),
    at: now,
    source: input.source,
  };
}

export function isPaidTicker(symbol: string | undefined | null): boolean {
  return Boolean(symbol && /^\$?paid$/i.test(symbol.trim()));
}

export function tickerFromName(name: string | undefined): string | null {
  if (!name) {
    return null;
  }
  const token = name.split("/")[0]?.trim();
  return tickerFromSymbol(token);
}

export function tickerFromSymbol(symbol: string | undefined | null): string | null {
  if (!symbol) {
    return null;
  }
  const token = symbol.trim();
  if (!token || token.length > 8 || isPaidTicker(token)) {
    return null;
  }
  return token.toUpperCase();
}

export function mintFromGeckoTokenId(id: string | undefined): string | null {
  if (!id) {
    return null;
  }
  const mint = id.includes("_") ? id.slice(id.indexOf("_") + 1) : id;
  return mint.length >= 32 ? mint : null;
}

export function quietProviders(
  overrides: Partial<Record<MarketProviderId, ProviderStatus>> = {},
): Record<MarketProviderId, ProviderStatus> {
  return {
    gecko: overrides.gecko ?? "error",
    birdeye: overrides.birdeye ?? "skip",
    helius: overrides.helius ?? "skip",
    gmgn: overrides.gmgn ?? "skip",
  };
}

export function quietMarketPulse(
  providers: Record<MarketProviderId, ProviderStatus>,
): MarketPulse {
  return {
    kind: "QUIET",
    ticker: null,
    mint: null,
    source: "sim",
    providers,
    fills: [],
  };
}

export function mergeMarketPulse(input: {
  gecko: MarketHit | ProviderStatus;
  birdeye: MarketHit | ProviderStatus;
  gmgn: MarketHit | ProviderStatus;
  helius: HeliusConfirm | ProviderStatus;
}): MarketPulse {
  const providers = quietProviders({
    gecko: statusOf(input.gecko),
    birdeye: statusOf(input.birdeye),
    gmgn: statusOf(input.gmgn),
    helius: statusOf(input.helius),
  });
  const hit =
    usableHit(input.gecko) ?? usableHit(input.birdeye) ?? usableHit(input.gmgn);
  if (!hit) {
    return quietMarketPulse(providers);
  }
  const helius = typeof input.helius === "object" ? input.helius : null;
  if (isPaidTicker(hit.ticker) || isPaidTicker(helius?.symbol)) {
    return quietMarketPulse(providers);
  }
  const ticker = hit.ticker ?? tickerFromSymbol(helius?.symbol);
  const mint = hit.mint ?? helius?.mint ?? null;
  return {
    kind: hit.volumeUsd > 40_000 ? "TREND_SPIKE" : "VIRAL_POST",
    ticker,
    mint,
    source: hit.source,
    providers,
    fills: [],
  };
}

function statusOf(value: MarketHit | HeliusConfirm | ProviderStatus): ProviderStatus {
  if (typeof value === "string") {
    return value;
  }
  return "ok";
}

function asHit(value: MarketHit | ProviderStatus): MarketHit | null {
  if (typeof value === "string") {
    return null;
  }
  return value;
}

function usableHit(value: MarketHit | ProviderStatus): MarketHit | null {
  const hit = asHit(value);
  if (!hit || isPaidTicker(hit.ticker)) {
    return null;
  }
  return hit;
}
