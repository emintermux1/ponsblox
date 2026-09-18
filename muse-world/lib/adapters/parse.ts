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
  name: string | null;
  mint: string | null;
  volumeUsd: number;
  changePct: number | null;
};

export type HeliusConfirm = {
  symbol: string | null;
  name: string | null;
  mint: string | null;
};

export type MarketPulse = {
  kind: "TREND_SPIKE" | "VIRAL_POST" | "QUIET";
  ticker: string | null;
  name: string | null;
  changePct: number | null;
  mint: string | null;
  source: MarketProviderId | "sim";
  providers: Record<MarketProviderId, ProviderStatus>;
  fills: readonly [];
};

const JUNK_TICKERS = new Set([
  "PAID",
  "LONGER",
  "NVDAX3L",
  "REDDITPAD",
  "WIKIPAD",
  "ROBLOXPAD",
  "SKINPAD",
  "GITPAD",
  "SNAPPAD",
  "INDEXPAD",
  "PONS",
  "SOL",
  "WSOL",
  "USDC",
  "USDT",
]);

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
      return "Grok Bot";
    case "xai":
      return "xAI";
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

export function normalizeTicker(symbol: string | undefined | null): string | null {
  if (!symbol) {
    return null;
  }
  const token = symbol.trim().replace(/^\$/, "");
  if (!token || token.length > 8) {
    return null;
  }
  if (/[^A-Za-z0-9]/.test(token)) {
    return null;
  }
  return token.toUpperCase();
}

export function isJunkTicker(symbol: string | undefined | null): boolean {
  const token = normalizeTicker(symbol);
  if (!token) {
    return true;
  }
  if (JUNK_TICKERS.has(token) || token.endsWith("PAD")) {
    return true;
  }
  return /^\d+$/.test(token);
}

export function cleanTicker(symbol: string | undefined | null): string | null {
  const token = normalizeTicker(symbol);
  if (!token || isJunkTicker(token)) {
    return null;
  }
  return token;
}

export function tickerFromName(name: string | undefined): string | null {
  if (!name) {
    return null;
  }
  return cleanTicker(name.split("/")[0]);
}

export function tickerFromSymbol(symbol: string | undefined | null): string | null {
  return cleanTicker(symbol);
}

export function finiteChange(value: unknown): number | null {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount) || Math.abs(amount) > 10_000) {
    return null;
  }
  return amount;
}

export function isJunkDisplayName(name: string | null | undefined): boolean {
  const raw = name?.split("/")[0]?.trim().replace(/^\$/, "") ?? "";
  if (!raw) {
    return true;
  }
  const upper = raw.toUpperCase();
  if (upper === "PAID" || JUNK_TICKERS.has(upper) || upper.endsWith("PAD")) {
    return true;
  }
  const compact = upper.replace(/[^A-Z0-9]/g, "");
  return compact === "PAID" || JUNK_TICKERS.has(compact) || compact.endsWith("PAD");
}

export function pulseDisplayName(
  name: string | null | undefined,
  ticker: string | null,
): string | null {
  const clean = cleanTicker(ticker);
  const raw = name?.split("/")[0]?.trim() ?? "";
  if (raw && !isJunkDisplayName(raw)) {
    return raw.length > 18 ? (clean ?? raw.slice(0, 18)) : raw;
  }
  return clean;
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
    name: null,
    changePct: null,
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
  const hit = asCleanHit(input.gecko) ?? asCleanHit(input.birdeye) ?? asCleanHit(input.gmgn);
  if (!hit) {
    return quietMarketPulse(providers);
  }
  const helius = typeof input.helius === "object" ? input.helius : null;
  const ticker = cleanTicker(hit.ticker) ?? cleanTicker(helius?.symbol);
  const name = pulseDisplayName(hit.name ?? helius?.name, ticker);
  const mint = hit.mint ?? helius?.mint ?? null;
  if (!ticker && !name) {
    return quietMarketPulse(providers);
  }
  return {
    kind: hit.volumeUsd > 40_000 ? "TREND_SPIKE" : "VIRAL_POST",
    ticker,
    name,
    changePct: finiteChange(hit.changePct),
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

function asCleanHit(value: MarketHit | ProviderStatus): MarketHit | null {
  if (typeof value === "string") {
    return null;
  }
  const ticker = cleanTicker(value.ticker);
  const name = pulseDisplayName(value.name, ticker);
  if (isJunkTicker(value.ticker) && isJunkDisplayName(value.name) && !value.mint) {
    return null;
  }
  if (value.ticker && isJunkTicker(value.ticker)) {
    return null;
  }
  if (!ticker && !name && !value.mint) {
    return null;
  }
  return {
    ...value,
    ticker,
    name,
    changePct: finiteChange(value.changePct),
  };
}
