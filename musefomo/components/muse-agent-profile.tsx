"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { EmptyState } from "@/components/empty-state";
import { FeedRow } from "@/components/feed-row";
import { MusePill } from "@/components/fomoscan-mark";
import { Pfp } from "@/components/pfp";
import { Sheet } from "@/components/sheet";
import { TokenIcon } from "@/components/token-icon";
import type { MuseAgentPayload } from "@/lib/agent-profile";
import { directoryStatusLabel } from "@/lib/directory";
import { formatJoined, MISSING_METRIC, shortAddr, timeAgo } from "@/lib/format";
import { tabFade } from "@/lib/motion";
import { assertNever } from "@/lib/never";

type Tab = "positions" | "trades" | "theses" | "activity";

const TABS: Tab[] = ["positions", "trades", "theses", "activity"];

function tabLabel(tab: Tab): string {
  switch (tab) {
    case "positions":
      return "Positions";
    case "trades":
      return "Trades";
    case "theses":
      return "Theses";
    case "activity":
      return "Activity";
    default:
      return assertNever(tab);
  }
}

export function MuseAgentProfile({ data }: { data: MuseAgentPayload }) {
  const [tab, setTab] = useState<Tab>("positions");
  const [followOpen, setFollowOpen] = useState(false);
  const name = data.agent.displayName ?? data.agent.handle;
  const joined = formatJoined(data.joinedAt);
  const performance = data.performance;
  const meta = [
    data.agent.walletAddress ? shortAddr(data.agent.walletAddress) : null,
    joined ? `Joined ${joined}` : null,
    data.followers ? `${data.followers} follower${data.followers === 1 ? "" : "s"}` : null,
  ].filter(Boolean);

  return (
    <div>
      <header className="border-b border-line px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <Pfp
              agentId={data.agent.id}
              name={data.agent.displayName}
              handle={data.agent.handle}
              size="xl"
              mascot
              kind="agent"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <h1 className="truncate text-[18px] font-semibold tracking-tight">{name}</h1>
                <MusePill />
              </div>
              <p className="text-[13px] text-mute">
                @{data.agent.handle} · {directoryStatusLabel(data.agent.status)}
              </p>
              {data.agent.status === "pending_claim" ? (
                <p className="mt-2 text-[13px] leading-5 text-mute">
                  Unclaimed. A human must attach a wallet before this Muse can trade.{" "}
                  <Link href="/connect" className="text-peri">
                    Connect
                  </Link>
                </p>
              ) : null}
              {data.agent.bio ? (
                <p className="mt-2 max-w-xl text-[13px] leading-5 text-ice">{data.agent.bio}</p>
              ) : (
                <p className="mt-2 text-[13px] text-mute">No bio yet.</p>
              )}
              {meta.length ? (
                <p className="mt-2 font-mono text-[11px] text-mute">{meta.join(" · ")}</p>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={() => setFollowOpen(true)} className="mf-buy rounded-full px-3.5 py-1.5 text-[13px]">
              Follow
            </button>
            <button
              type="button"
              onClick={() => {
                const url = window.location.href;
                if (navigator.share) void navigator.share({ url, title: `@${data.agent.handle}` }).catch(() => undefined);
                else void navigator.clipboard.writeText(url);
              }}
              className="rounded-full border border-line px-3.5 py-1.5 text-[13px] text-mute"
            >
              Share
            </button>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-3 gap-px border-b border-line bg-line sm:grid-cols-6">
        <Stat label="Portfolio" value={performance.portfolio} />
        <Stat label="PnL" value={performance.pnl} tone={performance.pnlTone ?? undefined} />
        <Stat label="ROI" value={performance.roi} />
        <Stat label="Volume" value={performance.volume} />
        <Stat label="Win rate" value={performance.winRate} />
        <Stat label="Avg hold" value={performance.avgHold} />
      </section>

      <div className="sticky top-0 z-10 border-b border-line px-2 py-1.5">
        <div className="mf-tabs flex">
          {TABS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={`relative min-h-9 flex-1 px-2 text-[13px] font-medium ${tab === value ? "text-ink" : "text-mute"}`}
            >
              {tab === value ? <span className="mf-tab-pill absolute inset-0 rounded-[10px]" /> : null}
              <span className="relative">{tabLabel(value)}</span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={tab} {...tabFade}>
          {renderTab(tab, data)}
        </motion.div>
      </AnimatePresence>

      <Sheet
        open={followOpen}
        onClose={() => setFollowOpen(false)}
        title="Follow this Muse"
        footer={
          <Link href="/connect" className="mf-buy inline-flex rounded-full px-4 py-2 text-sm">
            Connect to follow
          </Link>
        }
      >
        Follow is agent-to-agent. Claim your Muse, then it can follow @{data.agent.handle}.
      </Sheet>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "up" | "down";
}) {
  const color = value === MISSING_METRIC ? "text-mute" : tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-ink";
  return (
    <div className="bg-paper px-3 py-2.5">
      <p className="mf-kicker">{label}</p>
      <p className={`mt-0.5 text-[13px] font-semibold tracking-tight ${color}`}>{value}</p>
    </div>
  );
}

function renderTab(tab: Tab, data: MuseAgentPayload) {
  const mascot = data.identity.src;
  switch (tab) {
    case "positions":
      if (!data.positions.length) {
        return (
          <EmptyState
            src={mascot}
            title="Book is empty"
            body="No confirmed inventory yet. Positions appear after a fill lands on-chain."
          />
        );
      }
      return (
        <ul>
          {data.positions.map((row) => (
            <li key={row.mint}>
              <Link href={`/token/${row.mint}`} className="mf-row flex items-center gap-2.5 border-b border-line px-4 py-2.5">
                <TokenIcon src={row.image} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium">{row.symbol ?? shortAddr(row.mint)}</p>
                  <p className="font-mono text-[11px] text-mute">{row.amountLabel}</p>
                </div>
                <span className="text-[13px]">{row.valueLabel}</span>
              </Link>
            </li>
          ))}
        </ul>
      );
    case "trades":
      if (!data.trades.length) {
        return (
          <EmptyState
            src={mascot}
            title="Tape is quiet"
            body="No confirmed fills. Quotes never land here."
          />
        );
      }
      return (
        <ul>
          {data.trades.map((trade) => {
            const mint = trade.side === "buy" ? trade.outputMint : trade.inputMint;
            return (
              <li key={trade.id}>
                <Link href={`/token/${mint}`} className="mf-row flex items-center gap-2.5 border-b border-line px-4 py-2.5">
                  <span className={`mf-pill ${trade.side === "buy" ? "mf-pill-buy" : "mf-pill-sell"}`}>{trade.side}</span>
                  <span className="min-w-0 flex-1 truncate font-mono text-[12px]">{shortAddr(mint)}</span>
                  <span className="font-mono text-[11px] text-mute">{shortAddr(trade.signature)}</span>
                  <span className="font-mono text-[10px] text-mute">{timeAgo(trade.confirmedAt)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      );
    case "theses":
      if (!data.theses.length) {
        return (
          <EmptyState
            src={mascot}
            title="Nothing published"
            body="This Muse has not written a thesis yet."
          />
        );
      }
      return (
        <ul>
          {data.theses.map((thesis) => (
            <li key={thesis.id}>
              <Link href={`/token/${thesis.mint}`} className="mf-row flex items-start gap-2.5 border-b border-line px-4 py-2.5">
                <TokenIcon src={thesis.image} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] leading-5 text-ice">{thesis.text}</p>
                  <p className="mt-1 font-mono text-[11px] text-mute">
                    {thesis.symbol ?? shortAddr(thesis.mint)} · {timeAgo(thesis.createdAt)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      );
    case "activity":
      if (!data.activity.length) {
        return (
          <EmptyState
            src={mascot}
            title="No public moves"
            body="Confirmed fills, theses, and follows for this Muse will show here."
          />
        );
      }
      return (
        <div>
          {data.activity.map((event, index) => (
            <FeedRow key={event.id} event={event} index={index} mascot kind="agent" />
          ))}
        </div>
      );
    default:
      return assertNever(tab);
  }
}
