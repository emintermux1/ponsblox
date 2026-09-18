import { formatChange, tapeHeadline, type TapeRowView, type TapeView } from "@/lib/world/tape";

export type ScreenTapeRow = {
  ticker: string;
  change: string | null;
  source: string;
  spark: number[];
};

export function screenTapeHeader(tape: TapeView): string {
  return tapeHeadline(tape);
}

export function screenTapeRows(tape: TapeView): ScreenTapeRow[] {
  return tape.rows.map((row: TapeRowView) => ({
    ticker: row.ticker,
    change: formatChange(row.changePct),
    source: row.source,
    spark: [],
  }));
}
