import { isQuoteTicker } from "@/lib/adapters/parse";
import {
  formatChange,
  paidSafeTicker,
  screenSourceLabel,
  sparkCloses,
  type ScreenSourceLabel,
  type TapeView,
} from "@/lib/world/tape";

export const SCREEN_TAPE_MIN_ROWS = 3;
export const SCREEN_TAPE_MAX_ROWS = 6;

export type ScreenTapeRow = {
  ticker: string;
  change: string | null;
  source: ScreenSourceLabel;
  spark: number[];
};

export function screenTapeHeader(tape: TapeView): ScreenSourceLabel {
  return screenSourceLabel(tape.source);
}

/** 3–6 real tickers. Never PAID, never invented symbols, spark only from real closes. */
export function screenTapeRows(tape: TapeView): ScreenTapeRow[] {
  if (tape.source === "sim") {
    return [];
  }
  const spark = sparkCloses(tape.candles);
  const rows: ScreenTapeRow[] = [];
  const seen = new Set<string>();
  const push = (
    ticker: string | null | undefined,
    changePct: number | null,
    source: TapeView["source"],
    withSpark: boolean,
  ) => {
    const safe = paidSafeTicker(ticker);
    if (!safe || isQuoteTicker(safe) || seen.has(safe)) {
      return;
    }
    seen.add(safe);
    rows.push({
      ticker: safe,
      change: formatChange(changePct),
      source: screenSourceLabel(source),
      spark: withSpark ? spark : [],
    });
  };
  for (const row of tape.rows) {
    push(row.ticker, row.changePct, row.source, rows.length === 0);
    if (rows.length >= SCREEN_TAPE_MAX_ROWS) {
      break;
    }
  }
  if (rows.length === 0) {
    push(tape.ticker, tape.changePct, tape.source, true);
  }
  return rows.slice(0, SCREEN_TAPE_MAX_ROWS);
}

export function screenTapeHasLiveRows(tape: TapeView): boolean {
  return screenTapeRows(tape).length > 0;
}
