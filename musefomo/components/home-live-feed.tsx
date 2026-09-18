"use client";

import { useEffect, useState } from "react";

import { FeedRow } from "@/components/feed-row";
import { TokenRail } from "@/components/token-rail";
import { isBlogLearnEvent } from "@/lib/feed-event";
import { looksLikeEvm, looksLikeMint } from "@/lib/format";
import { seedHomeMemes } from "@/lib/home-paint";
import { COPY } from "@/lib/surface-copy";
import { pickHomeEvents } from "@/lib/thesis-guard";
import type { DiscoverTokenRow, FeedEvent, FeedTab } from "@/lib/types";

const SKIP = new Set([
  "LONGER",
  "SNAPPAD",
  "GITPAD",
  "WIKIPAD",
  "ROBLOXPAD",
  "SKINPAD",
  "REDDITPAD",
  "PONS",
  "USDC",
  "USDT",
  "SOL",
  "WSOL",
]);

function isMeme(row: DiscoverTokenRow): boolean {
  const symbol = (row.symbol ?? "").replace(/^\$/, "").toUpperCase();
  if (SKIP.has(symbol) || row.chain === "robinhood" || looksLikeEvm(row.mint)) return false;
  return looksLikeMint(row.mint);
}

function dedupeMemes(rows: DiscoverTokenRow[]): DiscoverTokenRow[] {
  const seenMint = new Set<string>();
  const seenSymbol = new Set<string>();
  const out: DiscoverTokenRow[] = [];
  for (const row of rows) {
    const symbol = (row.symbol ?? "").replace(/^\$/, "").toUpperCase();
    if (seenMint.has(row.mint) || (symbol && seenSymbol.has(symbol))) continue;
    seenMint.add(row.mint);
    if (symbol) seenSymbol.add(symbol);
    out.push(row);
  }
  return out;
}

function paintRows(rows: DiscoverTokenRow[]): DiscoverTokenRow[] {
  return dedupeMemes(rows.filter(isMeme))
    .slice(0, 24)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

function socialRows(events: FeedEvent[]): FeedEvent[] {
  return pickHomeEvents(events.filter((event) => !isBlogLearnEvent(event)));
}

export function HomeLiveFeed({
  initial,
  tab,
  thesisRows: initialTheses = [],
}: {
  initial: DiscoverTokenRow[];
  tab: FeedTab;
  thesisRows?: FeedEvent[];
}) {
  const [memes, setMemes] = useState<DiscoverTokenRow[]>(() => paintRows(initial.length ? initial : seedHomeMemes()));
  const [theses, setTheses] = useState<FeedEvent[]>(() => socialRows(initialTheses));

  useEffect(() => {
    setTheses(socialRows(initialTheses));
  }, [initialTheses, tab]);

  useEffect(() => {
    const ac = new AbortController();
    const timer = window.setTimeout(() => ac.abort(), 2000);
    fetch("/api/home-paint", { signal: ac.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { tokens?: DiscoverTokenRow[] } | null) => {
        const next = paintRows(body?.tokens ?? []);
        if (next.length) setMemes(next);
      })
      .catch(() => undefined);
    if (tab === "following") {
      return () => {
        window.clearTimeout(timer);
        ac.abort();
      };
    }
    fetch(`/api/feed?tab=${tab}`, { signal: ac.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { events?: FeedEvent[] } | null) => {
        const next = socialRows(body?.events ?? []);
        if (next.length) setTheses(next);
      })
      .catch(() => undefined);
    return () => {
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [tab]);

  if (tab === "following") {
    return (
      <div className="px-4 py-6">
        <p className="text-[13px] text-mute">{COPY.noFollows.body}</p>
      </div>
    );
  }

  return (
    <>
      {tab === "for-you" ? <TokenRail rows={memes} /> : null}
      <div
        className="mf-feed"
        data-home-rows={theses.length}
        data-agent-count={0}
        data-thesis-count={theses.length}
        data-for-you={tab === "for-you" ? "social" : undefined}
      >
        {theses.length === 0 ? (
          <p className="px-4 py-3 text-[13px] text-mute">{COPY.noThesis.body}</p>
        ) : (
          theses.map((event, index) => (
            <div key={event.id} data-thesis-row="1" data-feed-item="1">
              <FeedRow event={event} index={index} />
            </div>
          ))
        )}
      </div>
    </>
  );
}
