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

export type MarketProviderId =
  | "gecko"
  | "dexscreener"
  | "birdeye"
  | "helius"
  | "gmgn"
  | "solana";
export type ProviderStatus = "ok" | "skip" | "error";
export type MarketHitSource = Exclude<MarketProviderId, "helius">;

export type TapeCandle = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
};

export type MarketHit = {
  source: MarketHitSource;
  ticker: string | null;
  mint: string | null;
  volumeUsd: number;
  name?: string | null;
  priceUsd?: number | null;
  priceChange24h?: number | null;
  changePct?: number | null;
  liquidityUsd?: number | null;
  marketCap?: number | null;
  imageUrl?: string | null;
  pairAddress?: string | null;
  pool?: string | null;
  dexId?: string | null;
};

export type HeliusConfirm = {
  symbol: string | null;
  mint: string | null;
};

export type SolanaConfirm = {
  slot: number | null;
};

export type MarketHits = MarketHit | readonly MarketHit[] | ProviderStatus;

export type MarketTapeRow = {
  ticker: string | null;
  mint: string | null;
  name: string | null;
  priceUsd: number | null;
  volumeUsd: number | null;
  priceChange24h: number | null;
  liquidityUsd: number | null;
  marketCap: number | null;
  imageUrl: string | null;
  pairAddress: string | null;
  source: MarketHitSource;
};

export type MarketPulse = {
  kind: "TREND_SPIKE" | "VIRAL_POST" | "QUIET";
  ticker: string | null;
  mint: string | null;
  name: string | null;
  source: MarketProviderId | "sim";
  priceUsd: number | null;
  volumeUsd: number | null;
  priceChange24h: number | null;
  changePct: number | null;
  liquidityUsd: number | null;
  marketCap: number | null;
  imageUrl: string | null;
  pairAddress: string | null;
  pool: string | null;
  dexId: string | null;
  solUsd: number | null;
  slot: number | null;
  tape: MarketTapeRow[];
  candles: readonly TapeCandle[];
  live: boolean;
  providers: Record<MarketProviderId, ProviderStatus>;
  fills: readonly [];
  at: number;
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

export function looksLikeMint(value: string | null | undefined): boolean {
  return Boolean(value && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value));
}

export function isQuoteTicker(symbol: string | undefined | null): boolean {
  return Boolean(symbol && /^(sol|wsol|usdc|usdt)$/i.test(symbol.trim()));
}

export function providerStatusFromHttp(status: number): ProviderStatus {
  if (status === 401 || status === 402) {
    return "skip";
  }
  if (status >= 200 && status < 300) {
    return "ok";
  }
  return "error";
}

export function parseFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const next = Number(value);
    return Number.isFinite(next) ? next : null;
  }
  return null;
}

export function finiteUsd(value: unknown): number | null {
  return parseFiniteNumber(value);
}

export function asHttpsLogo(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }
  const trimmed = url.trim();
  if (trimmed.startsWith("https://")) {
    return trimmed;
  }
  if (trimmed.startsWith("http://")) {
    return `https://${trimmed.slice("http://".length)}`;
  }
  return null;
}

export function poolFromGeckoRow(
  id: string | undefined,
  address: string | undefined,
): string | null {
  const raw = address ?? (id && id.includes("_") ? id.slice(id.indexOf("_") + 1) : id);
  if (!raw || raw.length < 32) {
    return null;
  }
  return raw;
}

/** Only rows that already have open/high/low/close. Never invent candles. */
export function candlesFromOhlcvList(list: unknown): TapeCandle[] {
  if (!Array.isArray(list)) {
    return [];
  }
  const candles: TapeCandle[] = [];
  for (const row of list) {
    if (!Array.isArray(row) || row.length < 5) {
      continue;
    }
    const t = parseFiniteNumber(row[0]);
    const o = parseFiniteNumber(row[1]);
    const h = parseFiniteNumber(row[2]);
    const l = parseFiniteNumber(row[3]);
    const c = parseFiniteNumber(row[4]);
    if (t == null || o == null || h == null || l == null || c == null || h < l) {
      continue;
    }
    candles.push({ t, o, h, l, c });
  }
  return candles;
}

export function withPublicTape(
  pulse: MarketPulse,
  extras: {
    changePct?: number | null;
    pool?: string | null;
    candles?: readonly TapeCandle[];
  },
): MarketPulse {
  if (pulse.source === "sim" || isPaidTicker(pulse.ticker)) {
    return {
      ...pulse,
      ticker: isPaidTicker(pulse.ticker) ? null : pulse.ticker,
      changePct: null,
      pool: null,
      candles: [],
      fills: [],
    };
  }
  return {
    ...pulse,
    changePct: extras.changePct ?? pulse.changePct,
    pool: extras.pool ?? pulse.pool,
    candles: extras.candles ?? pulse.candles,
    fills: [],
  };
}

export function quietProviders(
  overrides: Partial<Record<MarketProviderId, ProviderStatus>> = {},
): Record<MarketProviderId, ProviderStatus> {
  return {
    gecko: overrides.gecko ?? "error",
    dexscreener: overrides.dexscreener ?? "skip",
    birdeye: overrides.birdeye ?? "skip",
    helius: overrides.helius ?? "skip",
    gmgn: overrides.gmgn ?? "skip",
    solana: overrides.solana ?? "skip",
  };
}

export function quietMarketPulse(
  providers: Record<MarketProviderId, ProviderStatus>,
  extra: {
    solUsd?: number | null;
    slot?: number | null;
    at?: number;
  } = {},
): MarketPulse {
  return {
    kind: "QUIET",
    ticker: null,
    mint: null,
    name: null,
    source: "sim",
    priceUsd: null,
    volumeUsd: null,
    priceChange24h: null,
    changePct: null,
    liquidityUsd: null,
    marketCap: null,
    imageUrl: null,
    pairAddress: null,
    pool: null,
    dexId: null,
    solUsd: extra.solUsd ?? null,
    slot: extra.slot ?? null,
    tape: [],
    candles: [],
    live: false,
    providers,
    fills: [],
    at: extra.at ?? 0,
  };
}

const SOURCE_RANK: Record<MarketHitSource, number> = {
  gecko: 0,
  dexscreener: 1,
  birdeye: 2,
  gmgn: 3,
  solana: 4,
};

export function mergeMarketPulse(input: {
  gecko: MarketHits;
  dexscreener?: MarketHits;
  birdeye: MarketHits;
  gmgn: MarketHits;
  helius: HeliusConfirm | ProviderStatus;
  solana?: SolanaConfirm | ProviderStatus;
  solUsd?: number | null;
  candles?: readonly TapeCandle[];
  at?: number;
}): MarketPulse {
  const providers = quietProviders({
    gecko: statusOf(input.gecko),
    dexscreener: input.dexscreener === undefined ? "skip" : statusOf(input.dexscreener),
    birdeye: statusOf(input.birdeye),
    gmgn: statusOf(input.gmgn),
    helius: statusOf(input.helius),
    solana: input.solana === undefined ? "skip" : statusOf(input.solana),
  });
  const helius = typeof input.helius === "object" ? input.helius : null;
  const slot = typeof input.solana === "object" ? input.solana.slot : null;
  const solUsd = finiteUsd(input.solUsd);
  const at = input.at ?? 0;
  const candles = input.candles ?? [];
  const merged = dedupeMarketHits([
    ...hitsOf(input.gecko),
    ...hitsOf(input.dexscreener),
    ...hitsOf(input.birdeye),
    ...hitsOf(input.gmgn),
  ]);
  const hit = pickLeadHit(merged, helius);
  if (!hit) {
    return quietMarketPulse(providers, { solUsd, slot, at });
  }
  const ticker = hit.ticker ?? tickerFromSymbol(helius?.symbol);
  const mint = hit.mint ?? helius?.mint ?? null;
  const changePct = hit.changePct ?? hit.priceChange24h ?? null;
  const pool = hit.pool ?? hit.pairAddress ?? null;
  return {
    kind: hit.volumeUsd > 40_000 ? "TREND_SPIKE" : "VIRAL_POST",
    ticker,
    mint,
    name: hit.name ?? ticker,
    source: hit.source,
    priceUsd: hit.priceUsd ?? null,
    volumeUsd: Number.isFinite(hit.volumeUsd) ? hit.volumeUsd : null,
    priceChange24h: hit.priceChange24h ?? changePct,
    changePct,
    liquidityUsd: hit.liquidityUsd ?? null,
    marketCap: hit.marketCap ?? null,
    imageUrl: asHttpsLogo(hit.imageUrl),
    pairAddress: hit.pairAddress ?? pool,
    pool,
    dexId: hit.dexId ?? null,
    solUsd,
    slot,
    tape: merged.map(toTapeRow),
    candles,
    live: true,
    providers,
    fills: [],
    at,
  };
}

export function dedupeMarketHits(hits: readonly MarketHit[]): MarketHit[] {
  const byKey = new Map<string, MarketHit>();
  for (const hit of hits) {
    if (!usableHit(hit)) {
      continue;
    }
    const key = hit.mint ?? `ticker:${hit.ticker ?? ""}`;
    const prev = byKey.get(key);
    byKey.set(key, prev ? mergeHit(prev, hit) : hit);
  }
  return [...byKey.values()].sort((a, b) => {
    const rank = SOURCE_RANK[a.source] - SOURCE_RANK[b.source];
    if (rank !== 0) {
      return rank;
    }
    return (b.volumeUsd ?? 0) - (a.volumeUsd ?? 0);
  });
}

function statusOf(
  value: MarketHits | HeliusConfirm | SolanaConfirm | ProviderStatus | undefined,
): ProviderStatus {
  if (value === undefined) {
    return "skip";
  }
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? "ok" : "error";
  }
  return "ok";
}

function hitsOf(value: MarketHits | undefined): MarketHit[] {
  if (value == null || typeof value === "string") {
    return [];
  }
  return (Array.isArray(value) ? value : [value]) as MarketHit[];
}

function usableHit(hit: MarketHit | null): MarketHit | null {
  if (!hit || isPaidTicker(hit.ticker) || isQuoteTicker(hit.ticker)) {
    return null;
  }
  return hit;
}

function pickLeadHit(hits: readonly MarketHit[], helius: HeliusConfirm | null): MarketHit | null {
  if (isPaidTicker(helius?.symbol)) {
    return null;
  }
  const ranked = [...hits].sort((a, b) => SOURCE_RANK[a.source] - SOURCE_RANK[b.source]);
  const lead = ranked[0];
  if (!lead || isPaidTicker(lead.ticker)) {
    return null;
  }
  return {
    ...lead,
    ticker: lead.ticker ?? tickerFromSymbol(helius?.symbol),
    mint: lead.mint ?? helius?.mint ?? null,
  };
}

function mergeHit(primary: MarketHit, extra: MarketHit): MarketHit {
  const preferPrimary = SOURCE_RANK[primary.source] <= SOURCE_RANK[extra.source];
  const keep = preferPrimary ? primary : extra;
  const fill = preferPrimary ? extra : primary;
  return {
    source: keep.source,
    ticker: keep.ticker ?? fill.ticker,
    mint: keep.mint ?? fill.mint,
    volumeUsd: keep.volumeUsd || fill.volumeUsd,
    name: keep.name ?? fill.name,
    priceUsd: keep.priceUsd ?? fill.priceUsd,
    priceChange24h: keep.priceChange24h ?? fill.priceChange24h,
    changePct: keep.changePct ?? fill.changePct,
    liquidityUsd: keep.liquidityUsd ?? fill.liquidityUsd,
    marketCap: keep.marketCap ?? fill.marketCap,
    imageUrl: keep.imageUrl ?? fill.imageUrl,
    pairAddress: keep.pairAddress ?? fill.pairAddress,
    pool: keep.pool ?? fill.pool,
    dexId: keep.dexId ?? fill.dexId,
  };
}

function toTapeRow(hit: MarketHit): MarketTapeRow {
  return {
    ticker: hit.ticker,
    mint: hit.mint,
    name: hit.name ?? hit.ticker,
    priceUsd: hit.priceUsd ?? null,
    volumeUsd: Number.isFinite(hit.volumeUsd) ? hit.volumeUsd : null,
    priceChange24h: hit.priceChange24h ?? hit.changePct ?? null,
    liquidityUsd: hit.liquidityUsd ?? null,
    marketCap: hit.marketCap ?? null,
    imageUrl: asHttpsLogo(hit.imageUrl),
    pairAddress: hit.pairAddress ?? hit.pool ?? null,
    source: hit.source,
  };
}
