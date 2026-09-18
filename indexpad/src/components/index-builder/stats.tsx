import { short } from "@/lib/chain";
import { formatQuote } from "@/lib/indexpad/format";
import type { DraftComponent } from "./types";

export function estimateIndexValue(rows: DraftComponent[]): number | null {
  const priced = rows.filter((row) => row.priceQuote && Number.isFinite(Number(row.priceQuote)));
  if (priced.length === 0) return null;
  return priced.reduce((sum, row) => sum + (Number(row.priceQuote) * row.weightPct) / 100, 0);
}

export function ReviewStats({
  rows,
  wallet,
  weightingMethod = "Fixed weights",
}: {
  rows: DraftComponent[];
  wallet: string | null;
  weightingMethod?: string;
}) {
  const estimate = estimateIndexValue(rows);
  const items = [
    {
      label: "Estimated index value",
      value: estimate === null ? "—" : formatQuote(estimate),
    },
    { label: "Asset count", value: String(rows.length) },
    { label: "Weighting method", value: weightingMethod },
    { label: "Creator wallet", value: wallet ? short(wallet) : "Not connected" },
  ];

  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-line bg-line">
      {items.map((item) => (
        <div key={item.label} className="bg-surface px-3 py-3">
          <dt className="text-[10px] uppercase tracking-[0.16em] text-muted">{item.label}</dt>
          <dd className="mt-1 font-mono text-sm text-ivory">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
