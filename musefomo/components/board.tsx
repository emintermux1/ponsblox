"use client";

import type { ReactNode } from "react";

import { TokenRankRow } from "@/components/rank-row";
import { LEADERBOARD_WINDOWS, LEADERBOARD_WINDOW_LABELS } from "@/lib/constants";
import { assertNever } from "@/lib/never";
import type { DiscoverSource, DiscoverTokenRow, LeaderboardWindow } from "@/lib/types";

export function PageHeader({
  title,
  note,
  end,
}: {
  title: string;
  note?: string;
  end?: ReactNode;
}) {
  return (
    <header className="flex items-end justify-between gap-3 border-b border-line px-4 py-3">
      <div className="min-w-0">
        <p className="mf-kicker">Muse FOMO</p>
        <h1 className="mf-display mt-1">{title}</h1>
        {note ? <p className="mt-1 text-[12px] leading-4 text-mute">{note}</p> : null}
      </div>
      {end ? <div className="shrink-0 pb-0.5">{end}</div> : null}
    </header>
  );
}

export function BoardNote({
  title,
}: {
  title: string;
  body?: string;
}) {
  return (
    <div className="mf-note !mx-0 rounded-none border-x-0 border-t-0" role="status">
      <p className="text-[13px] text-mute">{title}</p>
    </div>
  );
}

export function WindowSwitch({
  value,
  onChange,
}: {
  value: LeaderboardWindow;
  onChange: (next: LeaderboardWindow) => void;
}) {
  return (
    <div className="mf-hscroll mf-tabs items-center" role="tablist" aria-label="Window">
      {LEADERBOARD_WINDOWS.map((next) => {
        const active = value === next;
        return (
          <button
            key={next}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(next)}
            className={`relative min-h-9 shrink-0 px-2.5 text-[12px] font-medium tracking-tight lg:min-h-8 ${
              active ? "text-ink" : "text-mute"
            }`}
          >
            {active ? <span className="mf-tab-pill absolute inset-0 rounded-[10px]" /> : null}
            <span className="relative">{LEADERBOARD_WINDOW_LABELS[next]}</span>
          </button>
        );
      })}
    </div>
  );
}

export type TokenBoardCols = "market" | "muse";

export function liveBoardCopy(source: DiscoverSource): { kicker: string; title: string; note?: string } {
  switch (source) {
    case "geckoterminal":
    case "dexscreener":
    case "market":
      return { kicker: "Live", title: "Trending tokens" };
    case "fomoscan":
      return { kicker: "Humans", title: "Trending tokens" };
    case "muse-confirmed":
      return { kicker: "Muse", title: "Muse tokens" };
    default:
      return assertNever(source, "board.source");
  }
}

export function TokenBoard({
  rows,
  title,
  kicker,
  note,
  cols = "market",
  limit,
  action,
}: {
  rows: DiscoverTokenRow[];
  title: string;
  kicker: string;
  note?: string;
  credit?: boolean;
  cols?: TokenBoardCols;
  limit?: number;
  action?: ReactNode;
}) {
  const items = limit ? rows.slice(0, limit) : rows;
  if (!items.length) return null;
  return (
    <section>
      <div className="flex items-end justify-between gap-3 px-4 pb-1.5 pt-3">
        <div className="min-w-0">
          <p className="mf-kicker">{kicker}</p>
          <h2 className="text-[14px] font-semibold tracking-tight">{title}</h2>
          {note ? <p className="mt-0.5 text-[11px] text-mute">{note}</p> : null}
        </div>
        {action}
      </div>
      <TokenBoardHead cols={cols} />
      {items.map((row) => (
        <TokenRankRow key={`${row.source}:${row.mint}`} row={row} cols={cols} />
      ))}
    </section>
  );
}

export function TokenBoardHead({ cols = "market" }: { cols?: TokenBoardCols }) {
  switch (cols) {
    case "market":
      return (
        <div className="mf-board-head mf-board-market">
          <span>#</span>
          <span>Token</span>
          <span className="text-right">MC</span>
          <span className="text-right">24H</span>
          <span className="mf-board-last text-right">Price</span>
        </div>
      );
    case "muse":
      return (
        <div className="mf-board-head mf-board-muse">
          <span>#</span>
          <span>Token</span>
          <span className="text-right">Fills</span>
          <span className="text-right">Hold</span>
          <span className="mf-board-last text-right">Vol</span>
        </div>
      );
    default:
      return assertNever(cols, "board.cols");
  }
}

export function PeopleBoardHead() {
  return (
    <div className="mf-board-head mf-board-people">
      <span>#</span>
      <span>Trader</span>
      <span className="mf-board-last text-right">Fills</span>
      <span className="text-right">PnL</span>
    </div>
  );
}
