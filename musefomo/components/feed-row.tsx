"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { MusePill } from "@/components/fomoscan-mark";
import { Pfp } from "@/components/pfp";
import { TokenIcon } from "@/components/token-icon";
import { useFomoMotion } from "@/components/use-fomo-motion";
import {
  actionLabel,
  actionTone,
  actorLabel,
  eventFromFomoScan,
  handleHref,
  profileHref,
  tokenHref,
} from "@/lib/feed-event";
import { formatPct, formatUsd, shortAddr, timeAgo } from "@/lib/format";
import type { FeedAction, FeedEvent, FomoScanThesis } from "@/lib/types";

export type FeedKind = "buy" | "sell" | "thesis";

export function thesisKind(item: FomoScanThesis): FeedKind {
  const action = eventFromFomoScan(item)?.action;
  if (action === "buy") return "buy";
  if (action === "sell" || action === "close") return "sell";
  return "thesis";
}

export function FeedRow({
  item,
  event,
  index = 0,
  mascot = false,
  kind: lane = "human",
  fresh = false,
}: {
  item?: FomoScanThesis;
  event?: FeedEvent;
  index?: number;
  mascot?: boolean;
  kind?: "human" | "agent";
  fresh?: boolean;
}) {
  const row = event ?? (item ? eventFromFomoScan(item, { actorKind: lane }) : null);
  if (!row) return null;
  const handle = row.actor.handle?.replace(/^@/, "").trim() ?? "";
  const profile = handleHref(row.actor);
  const token = tokenHref(row.token);
  const tone = actionTone(row.action);
  const motionPrefs = useFomoMotion();
  const showAction = row.action !== "thesis";
  void index;

  return (
    <motion.article
      initial={fresh && !motionPrefs.reduced ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={motionPrefs.transition("fast")}
      data-feed-row={row.action}
      data-thesis-row={row.thesis?.trim() ? "1" : undefined}
      className="mf-feed-row overflow-visible border-b border-line"
    >
      <div className="flex items-start gap-2.5">
        {profile ? (
          <Link href={profile} className="shrink-0">
            <Pfp
              src={row.actor.avatarUrl}
              name={row.actor.name}
              handle={row.actor.handle}
              agentId={row.actor.kind === "agent" ? row.actor.id : null}
              size="sm"
              mascot={mascot || row.actor.kind === "agent"}
              kind={row.actor.kind}
            />
          </Link>
        ) : (
          <Pfp
            src={row.actor.avatarUrl}
            name={row.actor.name}
            handle={row.actor.handle}
            agentId={row.actor.kind === "agent" ? row.actor.id : null}
            size="sm"
            mascot={mascot || row.actor.kind === "agent"}
            kind={row.actor.kind}
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {profile ? (
              <Link href={profile} className="min-w-0 truncate text-[13px] font-medium tracking-tight hover:text-peri">
                {handle ? `@${handle}` : actorLabel(row.actor)}
              </Link>
            ) : (
              <span className="min-w-0 truncate text-[13px] font-medium tracking-tight">{actorLabel(row.actor)}</span>
            )}
            {showAction ? <ActionPill action={row.action} tone={tone} /> : null}
            {row.actor.kind === "agent" ? <MusePill /> : null}
            <time className="ml-auto shrink-0 font-mono text-[10px] text-mute" dateTime={row.at ? new Date(row.at).toISOString() : undefined}>
              {timeAgo(row.at)}
            </time>
          </div>
          {row.thesis ? (
            <p className="mt-1 whitespace-normal break-words text-[13px] leading-5 tracking-tight text-ice [overflow-wrap:anywhere]">
              {row.thesis}
            </p>
          ) : null}
          <TokenChip event={row} href={token} />
          {row.action === "follow" && row.target ? <FollowLine target={row.target} /> : null}
          {row.txUrl ? (
            <a
              href={row.txUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-0.5 inline-block font-mono text-[10px] text-mute hover:text-peri"
            >
              {shortAddr(row.signature)}
            </a>
          ) : null}
        </div>
      </div>
    </motion.article>
  );
}

function ActionPill({ action, tone }: { action: FeedAction; tone: ReturnType<typeof actionTone> }) {
  const pill =
    tone === "buy" ? "mf-pill-buy" : tone === "sell" ? "mf-pill-sell" : tone === "agent" ? "mf-pill-agent" : "mf-pill-thesis";
  return <span className={`mf-pill ${pill}`}>{actionLabel(action)}</span>;
}

function TokenChip({ event, href }: { event: FeedEvent; href: string | null }) {
  if (event.action === "follow") return null;
  const symbol = event.token?.symbol ?? (event.token?.mint ? shortAddr(event.token.mint) : null);
  if (!symbol && event.amountUsd == null && !event.amountLabel && event.pnlUsd == null && event.pnlPct == null) {
    return null;
  }
  const inner = (
    <span className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1.5 text-[12px] tracking-tight">
      {symbol ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-line px-1.5 py-0.5">
          {event.token ? <TokenIcon src={event.token.imageUrl} mint={event.token.mint} symbol={symbol} size="xs" /> : null}
          <span className="font-medium">${symbol.replace(/^\$/, "")}</span>
        </span>
      ) : null}
      {event.amountUsd != null ? <span className="mf-num">{formatUsd(event.amountUsd)}</span> : null}
      {event.amountLabel && event.amountUsd == null ? <span>{event.amountLabel}</span> : null}
      {event.entryLabel && event.entryLabel !== event.amountLabel ? (
        <span className="text-mute">{event.entryLabel}</span>
      ) : null}
      <Pnl event={event} />
    </span>
  );
  if (!href) return inner;
  return <Link href={href}>{inner}</Link>;
}

function Pnl({ event }: { event: FeedEvent }) {
  if (event.pnlPct != null) {
    return <span className={`mf-num ${event.pnlPct >= 0 ? "text-up" : "text-down"}`}>{formatPct(event.pnlPct)}</span>;
  }
  if (event.pnlUsd != null) {
    return <span className={`mf-num ${event.pnlUsd >= 0 ? "text-up" : "text-down"}`}>{formatUsd(event.pnlUsd)}</span>;
  }
  return null;
}

function FollowLine({ target }: { target: NonNullable<FeedEvent["target"]> }) {
  const href = handleHref(target) ?? profileHref(target);
  const label = target.handle ? `@${target.handle.replace(/^@/, "")}` : actorLabel(target);
  if (!href) {
    return <p className="mt-0.5 text-[12px] text-mute">followed {label}</p>;
  }
  return (
    <p className="mt-0.5 text-[12px] text-mute">
      followed{" "}
      <Link href={href} className="text-ink hover:text-peri">
        {label}
      </Link>
    </p>
  );
}
