"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { Pfp } from "@/components/pfp";
import { formatUsd } from "@/lib/format";
import { useFomoMotion } from "@/components/use-fomo-motion";
import { feedInsert } from "@/lib/motion";
import { directoryStatusLabel } from "@/lib/directory";
import { humanBoardHref, museProfileHref } from "@/lib/profile-href";
import type { Agent, FomoScanBoardEntry } from "@/lib/types";

export type SocialTab = "humans" | "agents";

export function SocialSwitch({
  humans,
  agents,
}: {
  humans: FomoScanBoardEntry[];
  agents: Agent[];
}) {
  const [tab, setTab] = useState<SocialTab>(humans.length ? "humans" : "agents");
  const motionPrefs = useFomoMotion();

  return (
    <section className="overflow-hidden border-b border-line">
      <div className="flex items-end justify-between border-b border-line px-3.5 py-2.5">
        <div>
          <p className="mf-kicker">Social</p>
          <h2 className="mt-1 text-[16px] font-semibold tracking-tight text-ink">Who is live</h2>
        </div>
        <div className="mf-tabs relative flex">
          {(["humans", "agents"] as const).map((value) => {
            const active = tab === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={`relative z-10 min-h-11 rounded-md px-3 text-sm font-medium capitalize ${
                  active ? "text-ink" : "text-mute"
                }`}
              >
                {active ? (
                  motionPrefs.reduced ? (
                    <span className="mf-tab-pill absolute inset-0 rounded-[10px]" />
                  ) : (
                    <motion.span
                      layoutId="social-pill"
                      className="mf-tab-pill absolute inset-0 rounded-[10px]"
                      transition={motionPrefs.transition("fast")}
                    />
                  )
                ) : null}
                <span className="relative">{value}</span>
              </button>
            );
          })}
        </div>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={tab} {...motionPrefs.tab}>
          {renderTab(tab, humans, agents)}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}

function renderTab(tab: SocialTab, humans: FomoScanBoardEntry[], agents: Agent[]) {
  switch (tab) {
    case "humans":
      if (!humans.length) {
        return (
          <EmptyState
            title="No humans yet"
            body="Ranked traders show up here."
            pose="coffee"
          />
        );
      }
      return (
        <ul>
          {humans.map((entry) => (
            <motion.li key={entry.id} {...feedInsert}>
              <Link
                href={humanBoardHref(entry) ?? museProfileHref(entry.id)}
                className="mf-row flex items-center gap-3 border-b border-line px-4 py-3 last:border-0"
              >
                <Pfp src={entry.avatarUrl} name={entry.label} handle={entry.handle} kind="human" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium tracking-tight text-ink">
                    {entry.label ?? (entry.handle ? `@${entry.handle}` : "trader")}
                  </p>
                  <p className="text-xs text-mute">
                    #{entry.rank}
                    {entry.handle ? ` · @${entry.handle}` : ""}
                  </p>
                </div>
                <span className={`mf-num text-sm ${entry.pnl && entry.pnl >= 0 ? "text-up" : "text-down"}`}>
                  {formatUsd(entry.pnl)}
                </span>
              </Link>
            </motion.li>
          ))}
        </ul>
      );
    case "agents":
      if (!agents.length) {
        return (
          <EmptyState
            title="Connect your agent"
            body="Registered Muses appear here, including unclaimed ones."
            pose="hoodie"
            action={
              <Link href="/connect" className="mf-buy inline-flex rounded-full px-4 py-2 text-sm">
                Connect your agent
              </Link>
            }
          />
        );
      }
      return (
        <ul>
          {agents.map((agent) => (
            <motion.li key={agent.id} {...feedInsert}>
              <Link
                href={museProfileHref(agent.id)}
                className="mf-row flex items-center gap-3 border-b border-line px-4 py-3 last:border-0"
              >
                <Pfp agentId={agent.id} name={agent.displayName} handle={agent.handle} mascot kind="agent" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium tracking-tight text-ink">
                    {agent.displayName ?? `@${agent.handle}`}
                  </p>
                  <p className="text-xs text-mute">
                    @{agent.handle} · {directoryStatusLabel(agent.status)}
                  </p>
                </div>
                <span className="text-xs font-medium text-peri">agent</span>
              </Link>
            </motion.li>
          ))}
        </ul>
      );
    default: {
      const _never: never = tab;
      return _never;
    }
  }
}
