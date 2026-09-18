"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { ExploreIndex } from "@/lib/indexpad/explore-types";
import { changeTone, formatBpsChange, formatUsdLike, truncateAddress } from "@/lib/indexpad/format";
import { MiniChart } from "./mini-chart";

function Mark({ src, label }: { src?: string; label: string }) {
  const [failed, setFailed] = useState(false);
  const letter = (label.replace(/^\$/, "").trim()[0] ?? "?").toUpperCase();
  if (!src || failed) {
    return (
      <span
        aria-hidden
        className="grid size-full place-items-center bg-surface-2 text-[10px] font-medium tracking-wide text-accent"
      >
        {letter}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="size-full object-cover" onError={() => setFailed(true)} />
  );
}

function Change({ value }: { value: number | null }) {
  const tone = changeTone(value);
  const color =
    tone === "up" ? "text-[#7dba8c]" : tone === "down" ? "text-danger" : "text-muted";
  return <span className={`tabular-nums ${color}`}>{formatBpsChange(value)}</span>;
}

export function IndexCard({ index }: { index: ExploreIndex }) {
  const href = `/index/${encodeURIComponent(index.slug)}`;
  const ticker = index.ticker.startsWith("$") ? index.ticker : `$${index.ticker}`;
  const up = (index.change24hBps ?? 0) >= 0;

  return (
    <motion.article
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
      className="group h-full"
    >
      <Link
        href={href}
        className="flex h-full flex-col rounded-2xl border border-line bg-surface/80 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] outline-none transition-[border-color,background-color,box-shadow] duration-300 hover:border-accent/35 hover:bg-surface-2 hover:shadow-[0_18px_40px_-28px_rgba(0,0,0,0.8)] focus-visible:border-accent"
      >
        <header className="flex items-start gap-3">
          <span className="relative size-11 shrink-0 overflow-hidden rounded-xl border border-line bg-surface-2">
            <Mark src={index.logoUrl} label={index.ticker} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="truncate text-[15px] font-medium tracking-tight text-foreground">
                {index.name}
              </h2>
              <span className="shrink-0 font-mono text-[11px] tracking-[0.14em] text-accent">
                {ticker}
              </span>
            </div>
            <p className="mt-1 truncate font-mono text-[11px] text-muted">
              {truncateAddress(index.creator)}
            </p>
          </div>
        </header>

        <div className="mt-4">
          <MiniChart values={index.sparkline} up={up} />
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
          <div className="flex items-baseline justify-between gap-2">
            <dt className="text-muted">24h</dt>
            <dd>
              <Change value={index.change24hBps} />
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <dt className="text-muted">7d</dt>
            <dd>
              <Change value={index.change7dBps} />
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <dt className="text-muted">Assets</dt>
            <dd className="tabular-nums text-foreground">{index.assetCount || "—"}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <dt className="text-muted">Mcap</dt>
            <dd className="tabular-nums text-foreground">{formatUsdLike(index.marketCapQuote)}</dd>
          </div>
        </dl>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
          <div className="flex items-center" aria-label="Top components">
            {index.topComponents.length === 0 ? (
              <span className="text-[11px] text-muted">No components yet</span>
            ) : (
              index.topComponents.map((component, i) => (
                <span
                  key={`${component.symbol}-${i}`}
                  title={component.symbol}
                  className="relative size-6 overflow-hidden rounded-full border border-background bg-surface-2 first:ml-0"
                  style={{ marginLeft: i === 0 ? 0 : -6, zIndex: 3 - i }}
                >
                  <Mark src={component.logo} label={component.symbol} />
                </span>
              ))
            )}
          </div>
          <span className="text-[11px] tracking-wide text-muted transition-colors group-hover:text-accent">
            Open
          </span>
        </div>
      </Link>
    </motion.article>
  );
}
