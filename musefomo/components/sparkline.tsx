import type { Candle } from "@/lib/types";

export function Sparkline({ candles, className = "h-16 w-full" }: { candles: Candle[]; className?: string }) {
  if (candles.length < 2) {
    return <div className={`${className} rounded-lg border border-dashed border-line`} />;
  }
  const values = candles.map((row) => row.close);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const up = values[values.length - 1] >= values[0];
  const d = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 24 - ((value - min) / span) * 22;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  return (
    <svg viewBox="0 0 100 24" preserveAspectRatio="none" className={className}>
      <path d={d} fill="none" stroke={up ? "#3dcf7a" : "#ff6a6a"} strokeWidth="1.4" />
    </svg>
  );
}
