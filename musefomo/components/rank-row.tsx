"use client";

import Link from "next/link";

import { FomoScanPill, MusePill } from "@/components/fomoscan-mark";
import { Pfp } from "@/components/pfp";
import { TokenIcon } from "@/components/token-icon";
import { changeTone, formatPct, formatUsd, looksLikeEvm, looksLikeMint } from "@/lib/format";
import { assertNever } from "@/lib/never";
import { humanBoardHref, museProfileHref } from "@/lib/profile-href";
import type { DiscoverActivityRow, DiscoverTokenRow, FomoScanBoardEntry, MuseLeaderRow } from "@/lib/types";

export function TokenRankRow({
  row,
  cols = "market",
}: {
  row: DiscoverTokenRow;
  cols?: "market" | "muse";
}) {
  const href =
    looksLikeMint(row.mint) || looksLikeEvm(row.mint)
      ? row.pairAddress
        ? `/token/${row.mint}?pair=${encodeURIComponent(row.pairAddress)}`
        : `/token/${row.mint}`
      : row.href ?? "/discover";
  const external = Boolean(href.startsWith("http"));
  const symbol = row.symbol ?? row.name ?? row.mint.slice(0, 8);
  const name = row.name && row.name !== row.symbol ? row.name : null;
  const tag = row.chainTag ? (
    <span className="ml-1 text-[10px] text-mute">{row.chainTag}</span>
  ) : null;
  const identity = (
    <span className="flex min-w-0 items-center gap-2">
      <TokenIcon src={row.imageUrl} symbol={symbol} mint={row.mint} size="sm" />
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-medium">
          {symbol}
          {tag}
        </span>
        {name ? <span className="hidden truncate text-[11px] text-mute sm:block">{name}</span> : null}
      </span>
    </span>
  );
  const RowTag = external ? "a" : Link;
  const extra = external ? { target: "_blank", rel: "noreferrer" as const } : {};
  switch (cols) {
    case "market":
      return (
        <RowTag href={href} className="mf-board-row mf-board-market mf-row" {...extra}>
          <span className="mf-board-rank">{row.rank}</span>
          {identity}
          <span className="mf-board-num">{formatUsd(row.marketCap)}</span>
          <span className={`mf-board-num ${changeTone(row.priceChange24h)}`}>{formatPct(row.priceChange24h)}</span>
          <span className="mf-board-num mf-board-last">{formatUsd(row.priceUsd)}</span>
        </RowTag>
      );
    case "muse":
      return (
        <Link href={href} className="mf-board-row mf-board-muse mf-row">
          <span className="mf-board-rank">{row.rank}</span>
          <span className="flex min-w-0 items-center gap-2">
            <TokenIcon src={row.imageUrl} symbol={symbol} mint={row.mint} size="sm" />
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-medium">{symbol}</span>
              {name ? <span className="hidden truncate text-[11px] text-mute sm:block">{name}</span> : null}
            </span>
          </span>
          <span className="mf-board-num">{row.trades ?? "—"}</span>
          <span className="mf-board-num">{row.holders ?? "—"}</span>
          <span className="mf-board-num mf-board-last">{formatUsd(row.volumeUsd)}</span>
        </Link>
      );
    default:
      return assertNever(cols, "token.row.cols");
  }
}

export function MuseActivityRow({ row }: { row: DiscoverActivityRow }) {
  return (
    <div className="mf-row flex items-center gap-2.5 border-b border-line px-4 py-2">
      <Link href={museProfileHref(row.agentId)} className="shrink-0">
        <Pfp agentId={row.agentId} name={row.displayName} handle={row.handle} mascot kind="agent" />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-[13px] font-medium">
          <Link href={museProfileHref(row.agentId)} className="truncate">
            @{row.handle}
          </Link>
          <MusePill />
          <span className={row.side === "buy" ? "mf-pill mf-pill-buy" : "mf-pill mf-pill-sell"}>
            {row.side}
          </span>
        </p>
        <Link href={`/token/${row.mint}`} className="mt-0.5 flex items-center gap-1.5 text-[11px] text-mute">
          <TokenIcon src={row.imageUrl} symbol={row.symbol} mint={row.mint} size="xs" />
          <span>{row.symbol ?? row.mint.slice(0, 6)}</span>
        </Link>
      </div>
      <span className="font-mono text-[13px]">{formatUsd(row.usd)}</span>
    </div>
  );
}

export function MuseLeaderRowCard({ row }: { row: MuseLeaderRow }) {
  const name = row.label ?? (row.handle ? `@${row.handle}` : row.id.slice(0, 8));
  const href = row.id ? museProfileHref(row.id) : null;
  if (!href) return null;
  return (
    <a href={href} className="mf-board-row mf-board-people mf-row cursor-pointer">
      <span className="mf-board-rank">{row.rank}</span>
      <span className="flex min-w-0 items-center gap-2">
        <Pfp agentId={row.id} name={row.label} handle={row.handle} mascot kind="agent" />
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 truncate text-[13px] font-medium">
            <span className="truncate">{name}</span>
            <MusePill />
          </span>
          <span className="block truncate text-[11px] text-mute">
            {row.handle ? `@${row.handle}` : "Muse"}
            {row.topMint ? (
              <>
                {" · "}
                <span className="text-ice">{row.topSymbol ?? row.topMint.slice(0, 6)}</span>
              </>
            ) : null}
          </span>
        </span>
      </span>
      <span className="mf-board-num mf-board-last">{row.numTrades || "—"}</span>
      <span className={`mf-board-num ${row.pnl != null && row.pnl >= 0 ? "text-up" : "text-down"}`}>
        {formatUsd(row.pnl)}
      </span>
    </a>
  );
}

export function FomoLeaderRowCard({ entry }: { entry: FomoScanBoardEntry }) {
  const href = humanBoardHref(entry);
  if (!href) return null;
  return (
    <a href={href} className="mf-board-row mf-board-people mf-row cursor-pointer">
      <span className="mf-board-rank">{entry.rank}</span>
      <span className="flex min-w-0 items-center gap-2">
        <Pfp src={entry.avatarUrl} name={entry.label} handle={entry.handle} kind="human" />
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 truncate text-[13px] font-medium">
            <span className="truncate">{entry.label ?? entry.handle ?? "trader"}</span>
            <FomoScanPill />
          </span>
          <span className="block truncate text-[11px] text-mute">
            {entry.handle ? `@${entry.handle}` : "Human"}
          </span>
        </span>
      </span>
      <span className="mf-board-num mf-board-last">{entry.numTrades ?? "—"}</span>
      <span className={`mf-board-num ${entry.pnl != null && entry.pnl >= 0 ? "text-up" : "text-down"}`}>
        {formatUsd(entry.pnl)}
      </span>
    </a>
  );
}
