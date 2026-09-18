"use client";

import { TokenLogo, tokenColor } from "@/components/token-logo";
import type { CompositionRow } from "@/lib/indexpad/view";
import { formatWeight } from "@/lib/indexpad/format";
import { cn } from "@/lib/utils";

type VizProps = {
  rows: CompositionRow[];
  hovered: string | null;
  onHover: (symbol: string | null) => void;
};

function polar(cx: number, cy: number, r: number, angle: number) {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

function donutArc(cx: number, cy: number, r: number, start: number, end: number) {
  const large = end - start > Math.PI ? 1 : 0;
  const a = polar(cx, cy, r, start);
  const b = polar(cx, cy, r, end);
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${large} 1 ${b.x} ${b.y}`;
}

type Cell = {
  x: number;
  y: number;
  w: number;
  h: number;
  row: CompositionRow;
};

function sliceDice(
  rows: CompositionRow[],
  x: number,
  y: number,
  w: number,
  h: number,
  vertical: boolean,
): Cell[] {
  if (rows.length === 0) return [];
  if (rows.length === 1) return [{ x, y, w, h, row: rows[0] }];
  const total = rows.reduce((sum, row) => sum + row.weightBps, 0) || 1;
  const first = rows[0];
  const rest = rows.slice(1);
  const frac = first.weightBps / total;
  if (vertical) {
    const fh = Math.max(h * frac, 28);
    return [
      { x, y, w, h: fh, row: first },
      ...sliceDice(rest, x, y + fh, w, Math.max(h - fh, 0), false),
    ];
  }
  const fw = Math.max(w * frac, 28);
  return [
    { x, y, w: fw, h, row: first },
    ...sliceDice(rest, x + fw, y, Math.max(w - fw, 0), h, true),
  ];
}

export function CompositionViz({ rows, hovered, onHover }: VizProps) {
  const total = rows.reduce((sum, row) => sum + row.weightBps, 0);
  const cx = 120;
  const cy = 120;
  const radius = 78;
  let angle = -Math.PI / 2;
  const arcs = rows.map((row) => {
    const sweep = (row.weightBps / (total || 1)) * Math.PI * 2;
    const start = angle;
    const end = angle + sweep;
    angle = end;
    return { row, start, end };
  });

  const active = rows.find((row) => row.symbol === hovered) ?? rows[0] ?? null;
  const cells = sliceDice(rows, 0, 0, 1000, 560, true);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
        <div className="flex items-center justify-center rounded-2xl border border-line bg-surface px-3 py-4">
          <svg viewBox="0 0 240 240" className="size-[200px]" role="img" aria-label="Composition donut">
            {arcs.map(({ row, start, end }) => {
              const isActive = hovered === row.symbol || (!hovered && active?.symbol === row.symbol);
              return (
                <path
                  key={row.symbol}
                  d={donutArc(cx, cy, isActive ? radius + 4 : radius, start, end)}
                  fill="none"
                  stroke={tokenColor(row.symbol)}
                  strokeWidth={isActive ? 28 : 22}
                  strokeLinecap="butt"
                  className="cursor-pointer transition-[stroke-width] duration-300"
                  onMouseEnter={() => onHover(row.symbol)}
                  onMouseLeave={() => onHover(null)}
                />
              );
            })}
            <circle cx={cx} cy={cy} r="52" fill="#141311" />
            {active ? (
              <>
                <text
                  x={cx}
                  y={cy - 6}
                  textAnchor="middle"
                  fill="#f3efe4"
                  fontSize="18"
                  fontFamily="var(--font-display), ui-serif, Georgia, serif"
                >
                  ${active.symbol}
                </text>
                <text x={cx} y={cy + 16} textAnchor="middle" fill="#9a9386" fontSize="12">
                  {formatWeight(active.weightBps)}
                </text>
              </>
            ) : null}
          </svg>
        </div>

        <div className="overflow-hidden rounded-2xl border border-line bg-desk">
          <svg
            viewBox="0 0 1000 560"
            className="h-[220px] w-full sm:h-[260px]"
            role="img"
            aria-label="Composition treemap"
          >
            {cells.map((cell) => {
              const isActive = hovered === cell.row.symbol;
              return (
                <g
                  key={cell.row.symbol}
                  className="cursor-pointer"
                  onMouseEnter={() => onHover(cell.row.symbol)}
                  onMouseLeave={() => onHover(null)}
                >
                  <rect
                    x={cell.x + 1.5}
                    y={cell.y + 1.5}
                    width={Math.max(cell.w - 3, 0)}
                    height={Math.max(cell.h - 3, 0)}
                    fill={tokenColor(cell.row.symbol)}
                    opacity={hovered && !isActive ? 0.38 : 1}
                    className="transition-opacity duration-300"
                  />
                  {cell.w > 120 && cell.h > 70 ? (
                    <>
                      <text
                        x={cell.x + 22}
                        y={cell.y + 42}
                        fill="#0c0b08"
                        fontSize="22"
                        fontFamily="var(--font-display), ui-serif, Georgia, serif"
                      >
                        ${cell.row.symbol}
                      </text>
                      <text x={cell.x + 22} y={cell.y + 70} fill="#0c0b08" fillOpacity="0.7" fontSize="14">
                        {formatWeight(cell.row.weightBps)}
                      </text>
                    </>
                  ) : null}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <ul className="flex flex-wrap gap-2">
        {rows.map((row) => (
          <li key={row.symbol}>
            <button
              type="button"
              onMouseEnter={() => onHover(row.symbol)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(row.symbol)}
              onBlur={() => onHover(null)}
              className={cn(
                "flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-left transition-colors duration-200",
                hovered === row.symbol
                  ? "border-accent bg-accent text-ink"
                  : "border-line bg-surface text-foreground",
              )}
            >
              <TokenLogo symbol={row.symbol} logo={row.logo} size={28} />
              <span className="text-[13px] font-medium">${row.symbol}</span>
              <span className="text-[12px] opacity-70">{formatWeight(row.weightBps)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
