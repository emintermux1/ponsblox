"use client";

import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { FeedRow } from "@/components/feed-row";
import { LiveNum } from "@/components/live-num";
import { Pfp } from "@/components/pfp";
import { TokenIcon } from "@/components/token-icon";
import { LEADERBOARD_WINDOW_LABELS } from "@/lib/constants";
import { formatPct, formatUsd, shortAddr, timeAgo } from "@/lib/format";
import type { HumanBookRow, HumanEquityPoint, HumanProfileStats } from "@/lib/human-map";
import type { FomoScanPnl, FomoScanThesis, FomoScanUser, LeaderboardWindow } from "@/lib/types";

export function FomoScanProfile({
  trader,
  items,
  pnl,
  stats,
  equity,
  positions,
  swaps,
}: {
  trader: FomoScanUser;
  items: FomoScanThesis[];
  pnl: FomoScanPnl | null;
  stats?: HumanProfileStats | null;
  equity?: HumanEquityPoint[] | null;
  positions?: HumanBookRow[] | null;
  swaps?: HumanBookRow[] | null;
}) {
  const day = pnl?.windows["24h"] ?? null;
  const headline = stats?.pnl ?? day?.netUsd ?? null;
  const returnPct = stats?.returnPct ?? day?.returnPct ?? null;
  const rank = stats?.rank ?? day?.rank ?? null;
  const trades = stats?.trades ?? day?.trades ?? null;
  const volume = stats?.volume ?? day?.volumeUsd ?? null;
  const winRate = stats?.winRate ?? null;
  const wallet = trader.solanaAddress ?? pnl?.wallet ?? null;
  const openBooks = positions?.length ? positions : null;
  const swapRows = swaps?.length ? swaps : null;
  const chart = equity && equity.length >= 2 ? equity : null;
  const windowKey = stats?.window ?? (day ? "24h" : null);
  const windowLabel = windowKey ? windowCaption(windowKey) : null;
  const cells = statCells({ returnPct, rank, trades, volume, winRate });
  const density = activityDensity(items);
  const tokens = tokenDensity(items);

  return (
    <div>
      <header className="border-b border-line">
        {trader.banner ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={trader.banner} alt="" className="h-28 w-full object-cover" />
        ) : null}
        <div className={`px-4 pb-4 ${trader.banner ? "pt-0" : "pt-4"}`}>
          <div className={`flex flex-wrap items-start justify-between gap-3 ${trader.banner ? "-mt-8" : ""}`}>
            <div className="flex min-w-0 items-end gap-3">
              <Pfp src={trader.profilePicture} name={trader.name} handle={trader.handle} size="xl" kind="human" />
              <div className="min-w-0 pb-0.5">
                <h1 className="truncate text-[18px] font-semibold tracking-tight">
                  {trader.name ?? `@${trader.handle}`}
                </h1>
                <p className="text-[13px] text-mute">@{trader.handle}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const url = window.location.href;
                if (navigator.share) void navigator.share({ url, title: `@${trader.handle}` }).catch(() => undefined);
                else void navigator.clipboard.writeText(url);
              }}
              className="rounded-full border border-line px-3.5 py-1.5 text-[13px] text-mute"
            >
              Share
            </button>
          </div>
          {trader.bio ? <p className="mt-3 max-w-xl text-[13px] leading-5 text-ice">{trader.bio}</p> : null}
          {trader.followers != null || wallet ? (
            <p className="mt-2 font-mono text-[11px] text-mute">
              {[
                trader.followers != null ? `${trader.followers.toLocaleString()} followers` : null,
                wallet ? shortAddr(wallet) : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : null}
        </div>
      </header>

      {headline != null || cells.length || chart ? (
        <section className="border-b border-line px-4 py-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              {headline != null ? (
                <p className={`text-[28px] font-semibold tracking-tight ${headline >= 0 ? "text-up" : "text-down"}`}>
                  <LiveNum value={formatUsd(headline)} />
                </p>
              ) : null}
              <p className="mt-1 text-[13px] text-mute">
                {[windowLabel, ...cells.map((cell) => cell.line)].filter(Boolean).join(" · ")}
              </p>
            </div>
            {chart ? <EquitySpark points={chart} /> : null}
          </div>
        </section>
      ) : null}

      {density ? (
        <section className="border-b border-line px-4 py-4">
          <p className="mf-kicker">Density</p>
          <p className="mt-1 text-[13px] text-mute">
            {density.hits} recorded day{density.hits === 1 ? "" : "s"} · last {density.weeks} weeks
          </p>
          <DensityGrid days={density.days} max={density.max} />
        </section>
      ) : null}

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="min-w-0 border-r-0 lg:border-r lg:border-line">
          {items.length ? (
            <>
              <div className="px-4 py-3">
                <p className="mf-kicker">Activity</p>
              </div>
              <div className="mf-feed">
                {items.map((item, index) => (
                  <FeedRow key={item.id} item={item} index={index} kind="human" />
                ))}
              </div>
            </>
          ) : (
            <EmptyState
              title="No cached activity"
              body="Theses and fills show here when they are already in cache or public JSON."
              pose="coffee"
            />
          )}
        </section>

        <aside>
          {tokens.length ? (
            <section className="border-b border-line px-4 py-4">
              <p className="mf-kicker">Tokens</p>
              <div className="mt-3 space-y-3">
                {tokens.map((row) => (
                  <Link
                    key={row.key}
                    href={row.mint ? `/token/${row.mint}` : "/discover"}
                    className="flex items-center gap-3"
                  >
                    <TokenIcon src={row.image} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium">{row.symbol ?? "token"}</p>
                      <p className="text-[11px] text-mute">
                        {row.count} post{row.count === 1 ? "" : "s"}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
          {openBooks ? (
            <section className="border-b border-line px-4 py-4">
              <p className="mf-kicker">Positions</p>
              <div className="mt-3 space-y-3">
                {openBooks.map((row) => (
                  <BookLink key={row.id} row={row} />
                ))}
              </div>
            </section>
          ) : null}
          {swapRows ? (
            <section className="px-4 py-4">
              <p className="mf-kicker">Swaps</p>
              <div className="mt-3 space-y-3">
                {swapRows.map((row) => (
                  <BookLink key={row.id} row={row} swap />
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function windowCaption(window: LeaderboardWindow): string {
  return LEADERBOARD_WINDOW_LABELS[window];
}

function statCells(input: {
  returnPct: number | null;
  rank: number | null;
  trades: number | null;
  volume: number | null;
  winRate: number | null;
}): Array<{ line: string }> {
  const cells: Array<{ line: string }> = [];
  if (input.returnPct != null) cells.push({ line: formatPct(input.returnPct) });
  if (input.rank != null) cells.push({ line: `rank ${input.rank}` });
  if (input.trades != null) cells.push({ line: `${input.trades} fills` });
  if (input.volume != null) cells.push({ line: `vol ${formatUsd(input.volume)}` });
  if (input.winRate != null) cells.push({ line: `win ${formatPct(input.winRate)}` });
  return cells;
}

function BookLink({ row, swap = false }: { row: HumanBookRow; swap?: boolean }) {
  const href = row.mint ? `/token/${row.mint}` : "/discover";
  return (
    <Link href={href} className="flex items-center gap-3">
      {swap && row.side ? (
        <span className={`mf-pill ${row.side === "closed" || row.side === "sell" ? "mf-pill-sell" : "mf-pill-buy"}`}>
          {row.side}
        </span>
      ) : null}
      <TokenIcon src={row.image} size={swap ? "xs" : "sm"} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium">{row.symbol ?? "token"}</p>
        {row.valueUsd != null ? <p className="text-[11px] text-mute">{formatUsd(row.valueUsd)}</p> : null}
      </div>
      <div className="text-right">
        {row.pnlUsd != null ? (
          <p className={`text-[13px] ${row.pnlUsd >= 0 ? "text-up" : "text-down"}`}>{formatUsd(row.pnlUsd)}</p>
        ) : null}
        {row.at != null ? <p className="text-[11px] text-mute">{timeAgo(row.at)}</p> : null}
      </div>
    </Link>
  );
}

function EquitySpark({ points }: { points: HumanEquityPoint[] }) {
  const values = points.map((point) => point.v);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const d = points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * 160;
      const y = 36 - ((point.v - min) / span) * 32;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const up = values[values.length - 1] >= values[0];
  return (
    <svg viewBox="0 0 160 40" className="mf-chart-reveal h-10 w-40" aria-hidden>
      <path d={d} fill="none" stroke={up ? "#3dcf7a" : "#ff6a6a"} strokeWidth="2" />
    </svg>
  );
}

type DensityDay = { key: string; count: number };

function activityDensity(items: FomoScanThesis[]): {
  weeks: number;
  hits: number;
  max: number;
  days: DensityDay[];
} | null {
  const counts = new Map<string, number>();
  for (const item of items) {
    const ms = toMs(item.fomoCreatedAt ?? item.updatedAt);
    if (ms == null) continue;
    const key = dayKey(ms);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  if (!counts.size) return null;
  const weeks = 12;
  const days: DensityDay[] = [];
  const end = startOfUtcDay(Date.now());
  const start = end - (weeks * 7 - 1) * 86_400_000;
  for (let t = start; t <= end; t += 86_400_000) {
    const key = dayKey(t);
    days.push({ key, count: counts.get(key) ?? 0 });
  }
  const hits = days.filter((day) => day.count > 0).length;
  const max = Math.max(...days.map((day) => day.count));
  if (!hits || max <= 0) return null;
  return { weeks, hits, max, days };
}

function tokenDensity(items: FomoScanThesis[]): Array<{
  key: string;
  symbol: string | null;
  mint: string | null;
  image: string | null;
  count: number;
}> {
  const map = new Map<string, { symbol: string | null; mint: string | null; image: string | null; count: number }>();
  for (const item of items) {
    const key = item.tokenAddress ?? item.tokenSymbol;
    if (!key) continue;
    const prev = map.get(key);
    if (prev) {
      prev.count += 1;
      continue;
    }
    map.set(key, {
      symbol: item.tokenSymbol,
      mint: item.tokenAddress,
      image: item.tokenImage ?? null,
      count: 1,
    });
  }
  return [...map.entries()]
    .map(([key, row]) => ({ key, ...row }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

function DensityGrid({ days, max }: { days: DensityDay[]; max: number }) {
  return (
    <div className="mt-3 grid auto-cols-fr grid-flow-col grid-rows-7 gap-1" aria-hidden>
      {days.map((day) => (
        <span
          key={day.key}
          title={`${day.key} · ${day.count}`}
          className={`aspect-square rounded-[3px] ${densityTone(day.count, max)}`}
        />
      ))}
    </div>
  );
}

function densityTone(count: number, max: number): string {
  if (count <= 0) return "bg-[var(--state-wash)]";
  const t = count / max;
  if (t > 0.66) return "bg-peri";
  if (t > 0.33) return "bg-peri/55";
  return "bg-peri/25";
}

function toMs(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return value > 1e12 ? value : value * 1000;
}

function startOfUtcDay(ms: number): number {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function dayKey(ms: number): string {
  return new Date(startOfUtcDay(ms)).toISOString().slice(0, 10);
}
