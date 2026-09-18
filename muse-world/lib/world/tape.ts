import {
  candlesFromOhlcvList,
  isPaidTicker,
  parseFiniteNumber,
  tickerFromSymbol,
  type MarketProviderId,
  type TapeCandle,
} from "@/lib/adapters/parse";
import { assertNever } from "@/types/world";

export type TapeSource = MarketProviderId | "sim";

export type TapeKind = "TREND_SPIKE" | "VIRAL_POST" | "QUIET";

export type TapeRowView = {
  ticker: string;
  changePct: number | null;
  source: TapeSource;
};

export type TapeView = {
  kind: TapeKind;
  ticker: string | null;
  mint: string | null;
  source: TapeSource;
  changePct: number | null;
  candles: readonly TapeCandle[];
  rows: TapeRowView[];
  fills: readonly [];
};

/** Honest short stamps painted on the 3D tape. dexscreener → dex. */
export type ScreenSourceLabel = "gecko" | "dex" | "gmgn" | "helius" | "sim" | "birdeye" | "solana";

export function quietTape(): TapeView {
  return {
    kind: "QUIET",
    ticker: null,
    mint: null,
    source: "sim",
    changePct: null,
    candles: [],
    rows: [],
    fills: [],
  };
}

export function paidSafeTicker(symbol: string | null | undefined): string | null {
  return isPaidTicker(symbol) ? null : tickerFromSymbol(symbol);
}

export function asTapeSource(value: unknown): TapeSource {
  switch (value) {
    case "gecko":
    case "dexscreener":
    case "birdeye":
    case "gmgn":
    case "helius":
    case "solana":
      return value;
    default:
      return "sim";
  }
}

export function tapeKindOf(value: unknown): TapeKind {
  switch (value) {
    case "TREND_SPIKE":
    case "VIRAL_POST":
    case "QUIET":
      return value;
    default:
      return "QUIET";
  }
}

export function sanitizeCandles(value: unknown): TapeCandle[] {
  if (!Array.isArray(value)) {
    return [];
  }
  if (value.length > 0 && value[0] && typeof value[0] === "object" && "o" in value[0]) {
    const candles: TapeCandle[] = [];
    for (const row of value) {
      if (!row || typeof row !== "object") {
        continue;
      }
      const item = row as Record<string, unknown>;
      const t = parseFiniteNumber(item.t);
      const o = parseFiniteNumber(item.o);
      const h = parseFiniteNumber(item.h);
      const l = parseFiniteNumber(item.l);
      const c = parseFiniteNumber(item.c);
      if (t == null || o == null || h == null || l == null || c == null || h < l) {
        continue;
      }
      candles.push({ t, o, h, l, c });
    }
    return candles;
  }
  return candlesFromOhlcvList(value);
}

export function rowsFromPulse(value: unknown): TapeRowView[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const rows: TapeRowView[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const rec = item as Record<string, unknown>;
    const ticker = paidSafeTicker(typeof rec.ticker === "string" ? rec.ticker : null);
    if (!ticker || seen.has(ticker)) {
      continue;
    }
    seen.add(ticker);
    rows.push({
      ticker,
      changePct: parseFiniteNumber(rec.priceChange24h) ?? parseFiniteNumber(rec.changePct),
      source: asTapeSource(rec.source),
    });
    if (rows.length >= 6) {
      break;
    }
  }
  return rows;
}

export function tapeFromPulse(pulse: {
  kind?: unknown;
  ticker?: unknown;
  mint?: unknown;
  source?: unknown;
  changePct?: unknown;
  priceChange24h?: unknown;
  candles?: unknown;
  tape?: unknown;
}): TapeView {
  const ticker = paidSafeTicker(typeof pulse.ticker === "string" ? pulse.ticker : null);
  const source = asTapeSource(pulse.source);
  if (source === "sim" || isPaidTicker(typeof pulse.ticker === "string" ? pulse.ticker : null)) {
    return quietTape();
  }
  const changePct =
    parseFiniteNumber(pulse.changePct) ?? parseFiniteNumber(pulse.priceChange24h);
  const rows = rowsFromPulse(pulse.tape);
  if (ticker && !rows.some((row) => row.ticker === ticker)) {
    rows.unshift({ ticker, changePct, source });
  }
  return {
    kind: tapeKindOf(pulse.kind),
    ticker,
    mint: typeof pulse.mint === "string" && pulse.mint.length >= 32 ? pulse.mint : null,
    source,
    changePct,
    candles: sanitizeCandles(pulse.candles),
    rows: rows.slice(0, 6),
    fills: [],
  };
}

export function screenSourceLabel(source: TapeSource): ScreenSourceLabel {
  switch (source) {
    case "gecko":
      return "gecko";
    case "dexscreener":
      return "dex";
    case "gmgn":
      return "gmgn";
    case "helius":
      return "helius";
    case "sim":
      return "sim";
    case "birdeye":
      return "birdeye";
    case "solana":
      return "solana";
    default:
      return assertNever(source);
  }
}

export function tapeStamp(source: TapeSource): string {
  switch (source) {
    case "sim":
      return "SIM";
    case "gecko":
      return "LIVE · gecko";
    case "birdeye":
      return "LIVE · birdeye";
    case "gmgn":
      return "LIVE · gmgn";
    case "helius":
      return "LIVE · helius";
    case "dexscreener":
      return "LIVE · dex";
    case "solana":
      return "LIVE · solana";
    default:
      return assertNever(source);
  }
}

export function formatChange(changePct: number | null): string | null {
  if (changePct == null) {
    return null;
  }
  const rounded = Math.round(changePct * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toFixed(1)}%`;
}

export function tapeHeadline(tape: TapeView): string {
  if (tape.source === "sim") {
    return "SIM · quiet";
  }
  const change = formatChange(tape.changePct);
  if (tape.ticker && change) {
    return `${tape.ticker}  ${change}`;
  }
  if (tape.ticker) {
    return tape.ticker;
  }
  return tapeStamp(tape.source);
}

export function sparkCloses(candles: readonly TapeCandle[]): number[] {
  return candles.map((candle) => candle.c);
}
