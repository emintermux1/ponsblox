"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { BoardNote, PageHeader, TokenBoard } from "@/components/board";
import { MuseActivityRow } from "@/components/rank-row";
import { RowSkeleton } from "@/components/row-skeleton";
import { SearchHits, type SearchHitsData } from "@/components/search-hits";
import { SEARCH_MIN_CHARS } from "@/lib/constants";
import type { DiscoverPayload } from "@/lib/types";

function DiscoverInner() {
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const [discover, setDiscover] = useState<DiscoverPayload | null>(null);
  const [search, setSearch] = useState<SearchHitsData | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/discover", { signal: AbortSignal.timeout(5_000) })
      .then((res) => (res.ok ? (res.json() as Promise<DiscoverPayload>) : null))
      .then((body) => {
        if (!alive) return;
        setDiscover(body);
      })
      .catch(() => {
        if (alive) setFailed("Discover request failed");
      })
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (q.trim().length < SEARCH_MIN_CHARS) {
      setSearch(null);
      return;
    }
    let alive = true;
    fetch(`/api/search?q=${encodeURIComponent(q.trim())}`, { signal: AbortSignal.timeout(2_000) })
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (alive) setSearch(body);
      })
      .catch(() => {
        if (alive) setSearch(null);
      });
    return () => {
      alive = false;
    };
  }, [q]);

  const empty =
    ready &&
    !discover?.trending &&
    !discover?.featured &&
    !discover?.robinhood &&
    !discover?.robinhoodChain &&
    !discover?.pons &&
    !discover?.museMostTraded &&
    !discover?.museMostHeld &&
    !discover?.museActivity &&
    !discover?.fomoTrending &&
    !discover?.fomoMostHeld;

  return (
    <div>
      <PageHeader title="Discover" />

      {q.trim().length >= SEARCH_MIN_CHARS ? (
        <section className="border-b border-line px-4 py-2.5">
          <p className="mb-2 text-[12px] text-mute">Results for “{q}”</p>
          {!search ? <p className="font-mono text-[11px] text-mute">Searching…</p> : <SearchHits results={search} />}
        </section>
      ) : null}

      {!ready ? <RowSkeleton rows={8} /> : null}
      {failed ? <BoardNote title="Discover unavailable." /> : null}
      {empty && !failed ? <BoardNote title="Nothing live yet." /> : null}

      {discover?.featured ? (
        <TokenBoard
          title="Pinned"
          kicker="Robinhood Chain"
          rows={discover.featured.items}
          cols="market"
        />
      ) : null}
      {discover?.trending ? (
        <TokenBoard
          title="Trending tokens"
          kicker="Live"
          rows={discover.trending.items}
          cols="market"
        />
      ) : null}
      {discover?.robinhood ? (
        <TokenBoard
          title="xStocks"
          kicker="Solana"
          rows={discover.robinhood.items}
          cols="market"
        />
      ) : null}
      {discover?.robinhoodChain ? (
        <TokenBoard
          title="Robinhood Chain"
          kicker="4663"
          rows={discover.robinhoodChain.items}
          cols="market"
        />
      ) : null}
      {discover?.pons ? (
        <TokenBoard
          title="Pons"
          kicker="V2"
          rows={discover.pons.items}
          cols="market"
        />
      ) : null}
      {discover?.museMostTraded ? (
        <TokenBoard
          title="Most traded by Muse"
          kicker="Muse"
          rows={discover.museMostTraded.items}
          cols="muse"
        />
      ) : null}
      {discover?.museMostHeld ? (
        <TokenBoard
          title="Most held by Muse"
          kicker="Muse"
          rows={discover.museMostHeld.items}
          cols="muse"
        />
      ) : null}
      {discover?.museActivity ? (
        <section className="border-b border-line">
          <div className="px-4 pb-1.5 pt-3">
            <p className="mf-kicker">Muse</p>
            <h2 className="text-[14px] font-semibold tracking-tight">Recent Muse activity</h2>
          </div>
          {discover.museActivity.items.map((row) => (
            <MuseActivityRow key={row.id} row={row} />
          ))}
        </section>
      ) : null}
      {discover?.fomoTrending ? (
        <TokenBoard title="Trending" kicker="Humans" rows={discover.fomoTrending.items} cols="market" />
      ) : null}
      {discover?.fomoMostHeld ? (
        <TokenBoard title="Most held" kicker="Humans" rows={discover.fomoMostHeld.items} cols="market" />
      ) : null}
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense fallback={<RowSkeleton rows={8} />}>
      <DiscoverInner />
    </Suspense>
  );
}
