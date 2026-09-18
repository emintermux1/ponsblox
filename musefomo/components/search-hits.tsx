"use client";

import Link from "next/link";

import { FomoScanPill, MusePill } from "@/components/fomoscan-mark";
import { Pfp } from "@/components/pfp";
import { TokenIcon } from "@/components/token-icon";
import { formatUsd } from "@/lib/format";
import { humanHref, museHref } from "@/lib/hrefs";
import type { SearchPayload } from "@/lib/types";

export type SearchHitsData = SearchPayload;

export function SearchHits({
  results,
  onPick,
  dense = false,
}: {
  results: SearchHitsData;
  onPick?: () => void;
  dense?: boolean;
}) {
  const row = dense
    ? "mf-row flex items-center gap-2 px-2.5 py-2"
    : "mf-row flex items-center gap-2.5 border-b border-line px-0 py-2";
  const kicker = dense ? "px-2.5 pt-1.5" : "mb-1.5";
  const tokens = results.tokens?.length ? results.tokens : results.token ? [results.token] : [];
  const fomo = results.fomo ?? results.trader;
  const empty = tokens.length === 0 && !fomo && results.agents.length === 0;
  if (empty) {
    return (
      <p className={dense ? "px-2.5 py-2 text-[12px] text-mute" : "text-sm text-mute"}>
        No search results
      </p>
    );
  }

  return (
    <div>
      {tokens.length ? (
        <section>
          <p className={`mf-kicker ${kicker}`}>Tokens</p>
          {tokens.map((token) => (
            <Link key={token.mint} href={`/token/${token.mint}`} onClick={onPick} className={row}>
              <TokenIcon src={token.imageUrl} size={dense ? "sm" : "md"} />
              <span className="min-w-0 flex-1 truncate text-[13px]">{token.symbol ?? "Token"}</span>
              <span className="ml-auto font-mono text-[11px] text-mute">
                {dense ? (token.name ?? "Pair") : formatUsd(token.priceUsd)}
              </span>
            </Link>
          ))}
        </section>
      ) : null}
      {results.agents.length ? (
        <section>
          <p className={`mf-kicker ${kicker}`}>Muse agents</p>
          {results.agents.map((agent) => (
            <Link key={agent.id} href={museHref(agent.id)} onClick={onPick} className={row}>
              <Pfp agentId={agent.id} name={agent.displayName} handle={agent.handle} mascot size="sm" kind="agent" />
              <span className="min-w-0 flex-1 truncate text-[13px]">@{agent.handle}</span>
              <MusePill />
            </Link>
          ))}
        </section>
      ) : null}
      {fomo ? (
        <section>
          <p className={`mf-kicker ${kicker}`}>Humans</p>
          <Link
            href={humanHref(fomo.handle)}
            onClick={onPick}
            className={row}
          >
            <Pfp
              src={fomo.profilePicture}
              name={fomo.name}
              handle={fomo.handle}
              size="sm"
              kind="human"
            />
            <span className="min-w-0 flex-1 truncate text-[13px]">@{fomo.handle}</span>
            <FomoScanPill />
          </Link>
        </section>
      ) : null}
    </div>
  );
}
