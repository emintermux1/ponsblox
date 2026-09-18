"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useMemo, useState } from "react";
import { IndexPerformanceChart } from "@/components/charts/index-performance-chart";
import { CompositionTable } from "@/components/composition/composition-table";
import { CompositionViz } from "@/components/composition/composition-viz";
import { TokenLogo } from "@/components/token-logo";
import { SaveIndexButton } from "@/components/wallet";
import {
  changeTone,
  formatBpsChange,
  formatCount,
  formatQuote,
  truncateAddress,
} from "@/lib/indexpad/format";
import type {
  IndexPerformanceView,
  PerformanceTimeframe,
  PublicIndexView,
} from "@/lib/indexpad/view";
import { cn } from "@/lib/utils";

type DeskProps = {
  view: PublicIndexView;
  series: Record<PerformanceTimeframe, IndexPerformanceView>;
};

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "up" | "down" | "flat";
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
      className="min-w-0 rounded-2xl border border-line bg-surface px-4 py-3"
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">{label}</p>
      <p
        className={cn(
          "mt-1 truncate font-serif text-[22px] tracking-tight",
          tone === "up" && "text-tick",
          tone === "down" && "text-danger",
          (!tone || tone === "flat") && "text-foreground",
        )}
      >
        {value}
      </p>
    </motion.div>
  );
}

export function IndexDesk({ view, series }: DeskProps) {
  const [timeframe, setTimeframe] = useState<PerformanceTimeframe>("ALL");
  const [hovered, setHovered] = useState<string | null>(null);
  const { index } = view;
  const snapshot = series.ALL;
  const value = view.valueQuote ?? snapshot?.valueQuote ?? null;
  const change24 = view.change24hBps ?? snapshot?.change24hBps ?? null;
  const change7 = view.change7dBps ?? snapshot?.change7dBps ?? null;
  const createdBy = useMemo(() => {
    if (view.source === "example") return "Example";
    if (!view.creator) return "—";
    return view.creator.startsWith("0x") ? truncateAddress(view.creator) : view.creator;
  }, [view.creator, view.source]);

  return (
    <div className="bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <TokenLogo
              symbol={index.symbol}
              logo={view.logo}
              size={64}
              className="rounded-2xl"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-serif text-3xl tracking-tight text-ivory sm:text-4xl">
                  {index.name}
                </h1>
                {view.source === "example" ? (
                  <span className="rounded-full border border-line bg-surface-2 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
                    Example
                  </span>
                ) : null}
              </div>
              <p className="mt-1 font-mono text-lg text-accent">${index.symbol}</p>
              <p className="mt-2 text-sm text-muted">
                Created by <span className="text-foreground">{createdBy}</span>
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {view.source !== "example" ? <SaveIndexButton slug={view.slug} /> : null}
            <Link
              href={`/index/${encodeURIComponent(view.slug)}/launch`}
              className="ip-btn ip-btn-lg ip-btn-accent"
            >
              Launch Coin
            </Link>
          </div>
        </header>

        {view.source === "example" ? (
          <p className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-muted">
            Preview composition only ($AAA 40%, $BBB 30%, $CCC 20%, $DDD 10%). Live prices,
            holders, and candles appear when adapters return them — nothing here is invented.
          </p>
        ) : null}

        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Stat label="Index Value" value={formatQuote(value)} />
          <Stat label="24H" value={formatBpsChange(change24)} tone={changeTone(change24)} />
          <Stat label="7D" value={formatBpsChange(change7)} tone={changeTone(change7)} />
          <Stat label="Market Cap" value={formatQuote(view.marketCapQuote)} />
          <Stat label="Assets" value={formatCount(index.components.length || null)} />
          <Stat label="Holders" value={formatCount(view.holders)} />
        </section>

        <IndexPerformanceChart
          series={series}
          timeframe={timeframe}
          onTimeframe={setTimeframe}
        />

        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="font-serif text-2xl tracking-tight text-ivory">Composition</h2>
            <p className="text-sm text-muted">{view.weightingMethod}</p>
          </div>
          <CompositionViz rows={view.rows} hovered={hovered} onHover={setHovered} />
          <CompositionTable
            rows={view.rows}
            hovered={hovered}
            onHover={setHovered}
            example={view.source === "example"}
          />
        </section>
      </div>
    </div>
  );
}
