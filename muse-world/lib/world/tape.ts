import {
  candlesFromOhlcvList,
  cleanTicker,
  parseFiniteNumber,
  pulseDisplayName,
  type MarketProviderId,
  type TapeCandle,
} from "@/lib/adapters/parse";
import { assertNever } from "@/types/world";

export type TapeSource = MarketProviderId | "sim";

export type TapeKind = "TREND_SPIKE" | "VIRAL_POST" | "QUIET";

export type TapeView = {
  kind: TapeKind;
  ticker: string | null;
  name: string | null;
  mint: string | null;
  source: TapeSource;
  changePct: number | null;
  candles: readonly TapeCandle[];
  fills: readonly [];
};

export function quietTape(): TapeView {
  return {
    kind: "QUIET",
    ticker: null,
    name: null,
    mint: null,
    source: "sim",
    changePct: null,
    candles: [],
    fills: [],
  };
}

export function paidSafeTicker(symbol: string | null | undefined): string | null {
  return cleanTicker(symbol);
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

export function tapeFromPulse(pulse: {
  kind?: unknown;
  ticker?: unknown;
  name?: unknown;
  mint?: unknown;
  source?: unknown;
  changePct?: unknown;
  priceChange24h?: unknown;
  candles?: unknown;
}): TapeView {
  const ticker = paidSafeTicker(typeof pulse.ticker === "string" ? pulse.ticker : null);
  const name = pulseDisplayName(typeof pulse.name === "string" ? pulse.name : null, ticker);
  const source = asTapeSource(pulse.source);
  if (source === "sim" || (!ticker && !name)) {
    return quietTape();
  }
  return {
    kind: tapeKindOf(pulse.kind),
    ticker,
    name,
    mint: typeof pulse.mint === "string" && pulse.mint.length >= 32 ? pulse.mint : null,
    source,
    changePct: parseFiniteNumber(pulse.changePct) ?? parseFiniteNumber(pulse.priceChange24h),
    candles: sanitizeCandles(pulse.candles),
    fills: [],
  };
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
      return "LIVE · dexscreener";
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
  const title = tape.name ?? tape.ticker;
  const change = formatChange(tape.changePct);
  if (title && change) {
    return `${title}  ${change}`;
  }
  if (title) {
    return title;
  }
  return tapeStamp(tape.source);
}

export function sparkCloses(candles: readonly TapeCandle[]): number[] {
  return candles.map((candle) => candle.c);
}
