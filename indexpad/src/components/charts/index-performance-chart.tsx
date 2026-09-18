"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { IndexPerformanceView, PerformanceTimeframe } from "@/lib/indexpad/view";
import { PERFORMANCE_TIMEFRAMES } from "@/lib/indexpad/view";
import { formatQuote } from "@/lib/indexpad/format";
import { cn } from "@/lib/utils";

const WIDTH = 960;
const HEIGHT = 320;
const PAD = { top: 24, right: 16, bottom: 28, left: 16 };

type ChartProps = {
  series: Record<PerformanceTimeframe, IndexPerformanceView>;
  timeframe: PerformanceTimeframe;
  onTimeframe: (tf: PerformanceTimeframe) => void;
};

function catmullRom(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

function layout(points: IndexPerformanceView["points"]) {
  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  if (points.length === 0) {
    return { line: "", area: "", mapped: [] as Array<{ x: number; y: number; at: number; value: number }> };
  }

  const xs = points.map((p) => p.at);
  const ys = points.map((p) => p.value);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const padY = spanY * 0.08;

  const mapped = points.map((p) => ({
    x: PAD.left + ((p.at - minX) / spanX) * innerW,
    y: PAD.top + (1 - (p.value - minY + padY) / (spanY + padY * 2)) * innerH,
    at: p.at,
    value: p.value,
  }));

  const line = catmullRom(mapped);
  const last = mapped[mapped.length - 1];
  const first = mapped[0];
  const area = `${line} L ${last.x} ${HEIGHT - PAD.bottom} L ${first.x} ${HEIGHT - PAD.bottom} Z`;
  return { line, area, mapped };
}

export function IndexPerformanceChart({ series, timeframe, onTimeframe }: ChartProps) {
  const active = series[timeframe];
  const points = active?.points ?? [];
  const { line, area, mapped } = useMemo(() => layout(points), [points]);
  const [cursor, setCursor] = useState<number | null>(null);
  const hover = cursor !== null ? mapped[cursor] : null;
  const empty = points.length === 0;
  const unavailable = active?.status === "not_configured";
  const emptyTitle = unavailable ? "Feed not configured" : "No series for this range";
  const emptyBody = unavailable
    ? "getIndexPerformance is not_configured until INDEXPAD_API_BASE is set."
    : "The adapter has no observations for this range.";

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface">
      <header className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
            Index performance
          </p>
          <p className="mt-1 font-serif text-xl tracking-tight text-ivory">
            {empty
              ? emptyTitle
              : hover
                ? formatQuote(hover.value)
                : formatQuote(points[points.length - 1]?.value ?? null)}
          </p>
        </div>
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Performance timeframe">
          {PERFORMANCE_TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              type="button"
              role="tab"
              aria-selected={tf === timeframe}
              onClick={() => onTimeframe(tf)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[12px] font-medium tracking-wide transition-colors duration-300",
                tf === timeframe
                  ? "bg-accent text-ink"
                  : "text-muted hover:bg-surface-2 hover:text-foreground",
              )}
            >
              {tf}
            </button>
          ))}
        </div>
      </header>

      <div className="relative px-2 pb-3 sm:px-4">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-[240px] w-full sm:h-[300px]"
          role="img"
          aria-label={empty ? "Empty performance chart" : "Index performance chart"}
          onMouseLeave={() => setCursor(null)}
          onMouseMove={(event) => {
            if (mapped.length === 0) return;
            const rect = event.currentTarget.getBoundingClientRect();
            const x = ((event.clientX - rect.left) / rect.width) * WIDTH;
            let nearest = 0;
            let best = Infinity;
            mapped.forEach((pt, i) => {
              const d = Math.abs(pt.x - x);
              if (d < best) {
                best = d;
                nearest = i;
              }
            });
            setCursor(nearest);
          }}
        >
          <defs>
            <linearGradient id="pint-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#c9a65a" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#c9a65a" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3].map((i) => {
            const y = PAD.top + ((HEIGHT - PAD.top - PAD.bottom) * i) / 3;
            return (
              <line
                key={i}
                x1={PAD.left}
                x2={WIDTH - PAD.right}
                y1={y}
                y2={y}
                stroke="rgba(243,239,228,0.08)"
                strokeWidth="1"
              />
            );
          })}

          <AnimatePresence mode="wait">
            {empty ? (
              <motion.g
                key={`empty-${timeframe}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.28 }}
              >
                <text
                  x={WIDTH / 2}
                  y={HEIGHT / 2 - 6}
                  textAnchor="middle"
                  fill="#f3efe4"
                  fontSize="16"
                  fontFamily="var(--font-display), ui-serif, Georgia, serif"
                >
                  {emptyTitle}
                </text>
                <text
                  x={WIDTH / 2}
                  y={HEIGHT / 2 + 18}
                  textAnchor="middle"
                  fill="#9a9386"
                  fontSize="12"
                >
                  {emptyBody}
                </text>
              </motion.g>
            ) : (
              <motion.g
                key={`line-${timeframe}-${points.length}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.32 }}
              >
                <motion.path
                  d={area}
                  fill="url(#pint-area)"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.45 }}
                />
                <motion.path
                  d={line}
                  fill="none"
                  stroke="#c9a65a"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                />
                {hover ? (
                  <g>
                    <line
                      x1={hover.x}
                      x2={hover.x}
                      y1={PAD.top}
                      y2={HEIGHT - PAD.bottom}
                      stroke="#f3efe4"
                      strokeOpacity="0.22"
                    />
                    <circle cx={hover.x} cy={hover.y} r="5" fill="#f3efe4" />
                    <circle cx={hover.x} cy={hover.y} r="2.2" fill="#0b0b0a" />
                  </g>
                ) : null}
              </motion.g>
            )}
          </AnimatePresence>
        </svg>
      </div>
    </section>
  );
}
