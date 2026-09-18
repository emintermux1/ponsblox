"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { FeedRow } from "@/components/feed-row";
import { TokenIcon } from "@/components/token-icon";
import { isBlogLearnEvent } from "@/lib/feed-event";
import { changeTone, formatPct, formatUsd, looksLikeEvm } from "@/lib/format";
import { seedHomeMemes } from "@/lib/home-paint";
import { dexLogo } from "@/lib/known-mints";
import { homeRailRows } from "@/lib/pinned-tokens";
import { COPY } from "@/lib/surface-copy";
import { pickHomeEvents } from "@/lib/thesis-guard";
import { asHttpsLogo } from "@/lib/token-logo";
import type { DiscoverTokenRow, FeedEvent, FeedTab } from "@/lib/types";

const TABS: FeedTab[] = ["for-you", "following", "thesis"];
const TAB_HREF: Record<FeedTab, string> = {
  "for-you": "/",
  following: "/?tab=following",
  thesis: "/?tab=thesis",
};

function socialRows(events: FeedEvent[]): FeedEvent[] {
  return pickHomeEvents(events.filter((event) => !isBlogLearnEvent(event)));
}

export function HomeFeedShell({
  tab,
  tokens,
  thesisRows,
  paint = "cache",
}: {
  tab: FeedTab;
  tokens: DiscoverTokenRow[];
  thesisRows: FeedEvent[];
  paint?: "cache" | "error-cache";
}) {
  const [memes, setMemes] = useState<DiscoverTokenRow[]>(() =>
    (tokens.length ? tokens : seedHomeMemes()).slice(0, 24),
  );
  const [posts, setPosts] = useState<FeedEvent[]>(() => socialRows(thesisRows));

  useEffect(() => {
    const next = (tokens.length ? tokens : seedHomeMemes()).slice(0, 24);
    if (next.length) setMemes(next);
  }, [tokens]);

  useEffect(() => {
    setPosts(socialRows(thesisRows));
  }, [thesisRows, tab]);

  useEffect(() => {
    const ac = new AbortController();
    const timer = window.setTimeout(() => ac.abort(), 2_000);
    fetch("/api/home-paint", { signal: ac.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { tokens?: DiscoverTokenRow[] } | null) => {
        const next = (body?.tokens ?? []).slice(0, 24);
        if (next.length) setMemes(next.map((row, index) => ({ ...row, rank: index + 1 })));
      })
      .catch(() => undefined);
    if (tab !== "following") {
      fetch(`/api/feed?tab=${tab}`, { signal: ac.signal })
        .then((res) => (res.ok ? res.json() : null))
        .then((body: { events?: FeedEvent[] } | null) => {
          const next = socialRows(body?.events ?? []);
          if (next.length) setPosts(next);
        })
        .catch(() => undefined);
    }
    return () => {
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [tab]);

  return (
    <div className="mf-cols-3 lg:grid lg:h-full" data-home-paint={paint}>
      <section className="min-w-0 overflow-x-clip border-r-0 lg:border-r lg:border-line">
        <div className="sticky top-0 z-10 border-b border-line px-2 py-1.5">
          <nav className="mf-tabs relative flex w-full" aria-label="Feed">
            {TABS.map((value) => (
              <Link
                key={value}
                href={TAB_HREF[value]}
                aria-current={tab === value ? "page" : undefined}
                className={`relative flex min-h-9 flex-1 items-center justify-center px-3 text-[13px] font-medium tracking-tight ${
                  tab === value ? "text-ink" : "text-mute"
                }`}
              >
                {tab === value ? <span className="mf-tab-pill absolute inset-0 rounded-[10px]" /> : null}
                <span className="relative">
                  {value === "for-you" ? "For You" : value === "following" ? "Following" : "Thesis"}
                </span>
              </Link>
            ))}
          </nav>
        </div>
        {tab === "for-you" ? <TokenRail rows={homeRailRows(memes)} /> : null}
        <div
          className="mf-feed"
          data-home-rows={tab === "following" ? 0 : posts.length}
          data-agent-count={0}
          data-thesis-count={posts.length}
          data-for-you={tab === "for-you" ? "social" : undefined}
        >
          {tab === "following" ? (
            <div className="px-4 py-6">
              <p className="text-[13px] text-mute">{COPY.noFollows.body}</p>
              <p className="mt-2 text-[13px]">
                <Link href="/connect" className="underline">
                  {COPY.connectAgent.title}
                </Link>
              </p>
            </div>
          ) : null}
          {tab !== "following" && posts.length === 0 ? (
            <p className="px-4 py-3 text-[13px] text-mute">{COPY.noThesis.body}</p>
          ) : null}
          {tab !== "following"
            ? posts.map((event, index) => (
                <div key={event.id} data-thesis-row="1" data-feed-item="1">
                  <FeedRow event={event} index={index} />
                </div>
              ))
            : null}
        </div>
      </section>
      <aside className="mf-rail-right hidden overflow-y-auto lg:block">
        <div className="px-4 pb-1.5 pt-3">
          <p className="mf-kicker">Live</p>
          <h2 className="text-[14px] font-semibold tracking-tight">Trending tokens</h2>
        </div>
        {homeRailRows(memes).length ? (
          homeRailRows(memes).slice(0, 12).map((row) => <TokenRailItem key={`rail-${row.mint}`} row={row} />)
        ) : (
          <p className="px-4 py-3 text-[12px] text-mute">{COPY.noTokens.body}</p>
        )}
      </aside>
    </div>
  );
}

function TokenRail({ rows }: { rows: DiscoverTokenRow[] }) {
  if (!rows.length) return null;
  return (
    <div className="mf-hscroll items-center gap-2 border-b border-line px-3 py-2" data-token-rail="1">
      {rows.slice(0, 16).map((row) => (
        <TokenChip key={row.mint} row={row} />
      ))}
    </div>
  );
}

function TokenChip({ row }: { row: DiscoverTokenRow }) {
  const symbol = (row.symbol ?? row.name ?? row.mint.slice(0, 4)).replace(/^\$/, "");
  const logo = asHttpsLogo(row.imageUrl) ?? (looksLikeEvm(row.mint) ? null : dexLogo(row.mint));
  return (
    <Link
      href={`/token/${row.mint}`}
      data-meme-row={symbol}
      className="mf-row flex shrink-0 items-center gap-1.5 rounded-full border border-line px-2 py-1"
    >
      <TokenIcon src={logo} mint={row.mint} symbol={symbol} size="xs" />
      <span className="text-[12px] font-medium">{looksLikeEvm(row.mint) ? symbol : `$${symbol}`}</span>
      {row.chainTag ? <span className="text-[10px] text-mute">{row.chainTag}</span> : null}
      <span className={`font-mono text-[10px] ${changeTone(row.priceChange24h)}`}>{formatPct(row.priceChange24h)}</span>
    </Link>
  );
}

function TokenRailItem({ row }: { row: DiscoverTokenRow }) {
  const symbol = (row.symbol ?? row.name ?? row.mint.slice(0, 6)).replace(/^\$/, "");
  const logo = asHttpsLogo(row.imageUrl) ?? (looksLikeEvm(row.mint) ? null : dexLogo(row.mint));
  return (
    <Link href={`/token/${row.mint}`} data-meme-row={symbol} className="mf-row flex items-center gap-2.5 px-4 py-2">
      <TokenIcon src={logo} mint={row.mint} symbol={symbol} size="sm" />
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
        {looksLikeEvm(row.mint) ? symbol : `$${symbol}`}
        {row.chainTag ? <span className="ml-1 text-[10px] font-normal text-mute">{row.chainTag}</span> : null}
      </span>
      <span className={`mf-num shrink-0 ${changeTone(row.priceChange24h)}`}>{formatPct(row.priceChange24h)}</span>
      <span className="mf-num hidden shrink-0 text-mute sm:inline">{formatUsd(row.priceUsd)}</span>
    </Link>
  );
}
