"use client";

import { TokenLogo } from "@/components/token-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DraftComponent } from "@/components/index-builder/types";
import { cn } from "@/lib/utils";

export function weightSum(rows: DraftComponent[]): number {
  return Math.round(rows.reduce((sum, row) => sum + row.weightPct, 0) * 10) / 10;
}

export function Composition({
  rows,
  onWeight,
  onRemove,
  onBalance,
}: {
  rows: DraftComponent[];
  onWeight: (id: string, weightPct: number) => void;
  onRemove: (id: string) => void;
  onBalance: () => void;
}) {
  const sum = weightSum(rows);
  const balanced = Math.abs(sum - 100) < 0.05;

  return (
    <section className="flex min-h-0 flex-col">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Blotter</p>
          <h2 className="font-serif text-xl text-ivory">Composition</h2>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "font-mono text-xs",
              balanced ? "text-tick" : "text-danger",
            )}
          >
            {sum.toFixed(1)}%
          </span>
          {rows.length > 0 ? (
            <Button size="sm" variant="ghost" onClick={onBalance}>
              Balance 100%
            </Button>
          ) : null}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-sm border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
          Example strip: $AAA 40% · $BBB 30% · $CCC 20% · $DDD 10%. Add live Pons tokens to replace it.
        </div>
      ) : (
        <>
          <div className="mb-4 flex h-2 overflow-hidden rounded-full bg-surface-2">
            {rows.map((row) => (
              <div
                key={row.id}
                className="h-full"
                style={{
                  width: `${Math.max(row.weightPct, 0)}%`,
                  background: `color-mix(in oklab, var(--color-brass) ${40 + row.weightPct}%, #3f9d6e)`,
                }}
              />
            ))}
          </div>
          <ul className="flex flex-col gap-2">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex items-center gap-3 rounded-sm border border-line bg-surface px-3 py-2"
              >
                <TokenLogo
                  symbol={row.symbol}
                  logo={row.logo}
                  layoutId={`logo-${row.id}`}
                  size={36}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-sm text-ivory">${row.symbol}</p>
                  <p className="truncate text-xs text-muted">{row.name}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Input
                    inputMode="decimal"
                    aria-label={`${row.symbol} weight`}
                    className="h-9 w-16 text-right font-mono"
                    value={Number.isFinite(row.weightPct) ? String(row.weightPct) : ""}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      onWeight(row.id, Number.isFinite(next) ? next : 0);
                    }}
                  />
                  <span className="text-xs text-muted">%</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Remove ${row.symbol}`}
                  onClick={() => onRemove(row.id)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
