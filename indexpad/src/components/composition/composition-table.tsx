"use client";

import { TokenLogo } from "@/components/token-logo";
import type { CompositionRow } from "@/lib/indexpad/view";
import { changeTone, formatBpsChange, formatQuote, formatWeight } from "@/lib/indexpad/format";
import { cn } from "@/lib/utils";

type TableProps = {
  rows: CompositionRow[];
  hovered: string | null;
  onHover: (symbol: string | null) => void;
  example: boolean;
};

function Tone({ value }: { value: number | null }) {
  const tone = changeTone(value);
  return (
    <span
      className={cn(
        "tabular-nums",
        tone === "up" && "text-tick",
        tone === "down" && "text-danger",
        tone === "flat" && "text-muted",
      )}
    >
      {formatBpsChange(value)}
    </span>
  );
}

export function CompositionTable({ rows, hovered, onHover, example }: TableProps) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <caption className="sr-only">Index composition</caption>
        <thead>
          <tr className="border-b border-line text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
            <th className="px-5 py-3 font-medium">Token</th>
            <th className="px-4 py-3 font-medium">Weight</th>
            <th className="px-4 py-3 font-medium">Price</th>
            <th className="px-4 py-3 font-medium">24H</th>
            <th className="px-5 py-3 font-medium">Contribution</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-5 py-10 text-center text-sm text-muted">
                No components on this index yet.
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const active = hovered === row.symbol;
              return (
                <tr
                  key={row.symbol}
                  onMouseEnter={() => onHover(row.symbol)}
                  onMouseLeave={() => onHover(null)}
                  className={cn(
                    "border-b border-line last:border-0 transition-colors duration-200",
                    active ? "bg-surface-2" : "bg-transparent",
                  )}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <TokenLogo symbol={row.symbol} logo={row.logo} size={48} />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ivory">${row.symbol}</p>
                        <p className="truncate text-[13px] text-muted">{row.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 tabular-nums text-foreground">{formatWeight(row.weightBps)}</td>
                  <td className="px-4 py-4 tabular-nums text-foreground">
                    {formatQuote(row.priceQuote)}
                    {example && !row.priceQuote ? (
                      <span className="ml-2 text-[11px] uppercase tracking-wide text-muted">
                        No quote
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-4">
                    <Tone value={row.change24hBps} />
                  </td>
                  <td className="px-5 py-4">
                    <Tone value={row.contributionBps} />
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
