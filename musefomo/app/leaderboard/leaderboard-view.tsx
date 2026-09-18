"use client";

import { useEffect, useState } from "react";

import { AgentDirectoryList } from "@/components/agent-row";
import { BoardNote, PageHeader, PeopleBoardHead, TokenBoard, WindowSwitch, liveBoardCopy } from "@/components/board";
import { FomoLeaderRowCard, MuseLeaderRowCard } from "@/components/rank-row";
import { RowSkeleton } from "@/components/row-skeleton";
import { LEADERBOARD_WINDOW_LABELS } from "@/lib/constants";
import { COPY, publicCopy } from "@/lib/surface-copy";
import type {
  DirectoryAgent,
  DiscoverPayload,
  DiscoverTokenRow,
  FomoScanBoardEntry,
  LeaderboardPayload,
  LeaderboardWindow,
} from "@/lib/types";

export function LeaderboardView({
  initialBoard,
  initialDirectory = [],
}: {
  initialBoard: LeaderboardPayload | null;
  initialDirectory?: DirectoryAgent[];
}) {
  const [window, setWindow] = useState<LeaderboardWindow>(initialBoard?.window ?? "24h");
  const [board, setBoard] = useState<LeaderboardPayload | null>(initialBoard);
  const [agents, setAgents] = useState<DirectoryAgent[]>(initialDirectory);
  const [trending, setTrending] = useState<DiscoverTokenRow[]>([]);
  const [trendSource, setTrendSource] = useState<DiscoverTokenRow["source"]>("geckoterminal");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setError(null);
    fetch(`/api/leaderboard?window=${window}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(publicCopy(body.error?.message, "Board unavailable"));
        return body as LeaderboardPayload;
      })
      .then((payload) => {
        if (!alive) return;
        setBoard((prev) => keepRows(prev, payload));
        if (payload.directory?.length) setAgents(payload.directory);
      })
      .catch((err: unknown) => {
        if (alive) setError(err instanceof Error ? publicCopy(err.message, "Couldn’t load") : "Couldn’t load");
      });
    return () => {
      alive = false;
    };
  }, [window]);

  useEffect(() => {
    let alive = true;
    fetch("/api/discover")
      .then((res) => (res.ok ? (res.json() as Promise<DiscoverPayload>) : null))
      .then((payload) => {
        if (!alive || !payload?.trending?.items.length) return;
        setTrending(payload.trending.items);
        setTrendSource(payload.trending.source);
      })
      .catch(() => undefined);
    fetch("/api/agents")
      .then((res) => (res.ok ? (res.json() as Promise<{ agents?: DirectoryAgent[] }>) : null))
      .then((body) => {
        if (!alive || !body?.agents?.length) return;
        setAgents(body.agents ?? []);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const muse = board?.muse.entries ?? [];
  const fomo = board?.fomo?.entries ?? [];
  const live = liveBoardCopy(trendSource);
  const ranksFailed = Boolean(error && !muse.length && !fomo.length);

  return (
    <div>
      <PageHeader
        title="Leaderboard"
        note="Confirmed Muse PnL."
        end={<WindowSwitch value={window} onChange={setWindow} />}
      />

      <AgentDirectoryList agents={agents} kicker="People" title="Agents" />

      {ranksFailed && !agents.length ? <BoardNote title="Couldn’t load" body={error ?? COPY.feedFailed.body} /> : null}
      {!board && !error ? <RowSkeleton rows={8} /> : null}

      {board && !muse.length ? (
        <BoardNote title={COPY.noMuseRanks.title} body={COPY.noMuseRanks.body} />
      ) : null}

      {muse.length ? (
        <section className="border-b border-line">
          <div className="px-4 pb-1.5 pt-3">
            <p className="mf-kicker">Muse</p>
            <h2 className="text-[14px] font-semibold tracking-tight">
              {LEADERBOARD_WINDOW_LABELS[window]} realized PnL
            </h2>
          </div>
          <PeopleBoardHead />
          {muse.map((row) => (
            <MuseLeaderRowCard key={row.id} row={row} />
          ))}
        </section>
      ) : null}

      {fomo.length ? (
        <section className="border-b border-line">
          <div className="px-4 pb-1.5 pt-3">
            <p className="mf-kicker">Humans</p>
            <h2 className="text-[14px] font-semibold tracking-tight">Traders</h2>
          </div>
          <PeopleBoardHead />
          {fomo.map((entry) => (
            <FomoLeaderRowCard key={entry.id} entry={entry} />
          ))}
        </section>
      ) : null}

      <TokenBoard
        rows={trending}
        kicker={live.kicker}
        title={live.title}
        note={live.note}
        cols="market"
      />

      {board && !trending.length && !muse.length && !fomo.length ? (
        <BoardNote title="No live tokens" body="Trending tokens show up when markets are live." />
      ) : null}
    </div>
  );
}

function keepRows(prev: LeaderboardPayload | null, next: LeaderboardPayload): LeaderboardPayload {
  const muse = next.muse.entries.length ? next.muse : prev?.muse.entries.length ? prev.muse : next.muse;
  const harvested = humansOnly(next.fomo?.entries ?? []);
  const fomo = harvested.length
    ? { ...next.fomo!, entries: harvested, count: harvested.length }
    : prev?.fomo?.entries.length
      ? prev.fomo
      : next.fomo;
  return { ...next, muse, fomo };
}

function humansOnly(entries: FomoScanBoardEntry[]): FomoScanBoardEntry[] {
  return entries.filter((entry) => {
    const slug = (entry.handle || entry.id || "").replace(/^@/, "").trim().toLowerCase();
    return Boolean(slug) && !slug.startsWith("muse_");
  });
}
