import { formatBaseAmount, formatHold } from "@/lib/format";
import { averageHoldMs, confirmedFillsFromTrades } from "@/lib/ledger";
import { formatBpsAsPct, formatLamportsAsSol, MISSING_METRIC, parseInteger } from "@/lib/money";
import type { BookPosition, BookSnapshot, Trade, WalletSnapshot } from "@/lib/types";

export type AgentMark = {
  symbol: string | null;
  image: string | null;
  priceUsd: string | number | null;
  decimals: number | null;
};

export type AgentPerformance = {
  portfolio: string;
  pnl: string;
  pnlTone: "up" | "down" | null;
  roi: string;
  volume: string;
  winRate: string;
  avgHold: string;
  closedCount: number;
  book: BookSnapshot;
};

export type AgentPositionRow = {
  mint: string;
  amountRaw: string;
  amountLabel: string;
  symbol: string | null;
  image: string | null;
  valueLabel: string;
  costBasisLamports: string;
  openPnlLamports: string | null;
};

export function performanceFromBook(
  book: BookSnapshot,
  trades: Trade[] = [],
): AgentPerformance {
  if (!trades.length && book.fillCount === 0 && book.closedCount === 0 && !book.positions.length) {
    return {
      portfolio: MISSING_METRIC,
      pnl: MISSING_METRIC,
      pnlTone: null,
      roi: MISSING_METRIC,
      volume: MISSING_METRIC,
      winRate: MISSING_METRIC,
      avgHold: MISSING_METRIC,
      closedCount: 0,
      book,
    };
  }
  const pnl = book.totalPnlLamports;
  let tone: "up" | "down" | null = null;
  if (pnl != null) {
    const n = parseInteger(pnl);
    if (n != null) tone = n >= 0n ? "up" : "down";
  }
  return {
    portfolio: formatLamportsAsSol(book.portfolioValueLamports),
    pnl: formatLamportsAsSol(book.totalPnlLamports),
    pnlTone: tone,
    roi: formatBpsAsPct(book.roiBps),
    volume: formatLamportsAsSol(book.volumeLamports),
    winRate: formatBpsAsPct(book.winRateBps),
    avgHold: formatHold(averageHoldMs(confirmedFillsFromTrades(trades))),
    closedCount: book.closedCount,
    book,
  };
}

export function decoratePositions(
  positions: BookPosition[],
  wallet: WalletSnapshot | null,
  marks: Map<string, AgentMark>,
): AgentPositionRow[] {
  return positions
    .filter((position) => {
      const qty = parseInteger(position.tokenBalanceRaw);
      return qty != null && qty > 0n;
    })
    .map((position) => {
      const mark = marks.get(position.mint);
      const held = wallet?.tokens.find((token) => token.mint === position.mint);
      return {
        mint: position.mint,
        amountRaw: position.tokenBalanceRaw,
        amountLabel: formatBaseAmount(position.tokenBalanceRaw, position.decimals),
        symbol: mark?.symbol ?? held?.symbol ?? null,
        image: mark?.image ?? held?.imageUrl ?? null,
        valueLabel: formatLamportsAsSol(position.markValueLamports),
        costBasisLamports: position.costBasisLamports,
        openPnlLamports: position.openPnlLamports,
      };
    });
}
