"use client";

import { motion } from "framer-motion";
import { Layers3 } from "lucide-react";
import type { BackedIndex } from "@/lib/indexpad/backed-index";
import { short } from "@/lib/chain";
import { cn } from "@/lib/utils";

function Mark({ ticker, logoUrl }: { ticker: string; logoUrl: string | null }) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logoUrl} alt="" className="size-8 rounded-full object-cover ring-1 ring-white/15" />
    );
  }
  return (
    <span className="grid size-8 place-items-center rounded-full bg-white/8 text-[10px] font-semibold tracking-wide text-[#f4f0e4] ring-1 ring-white/12">
      {ticker.slice(0, 3)}
    </span>
  );
}

export function BackedBy({ index }: { index: BackedIndex }) {
  const total = index.components.reduce((sum, row) => sum + row.weightPct, 0) || 1;

  return (
    <aside className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#c8c2b0]/70">Backed by</p>
      <div className="mt-3 flex items-start gap-3">
        <span className="grid size-12 place-items-center rounded-2xl bg-[#d8ff4a]/12 text-[#d8ff4a] ring-1 ring-[#d8ff4a]/25">
          <Layers3 className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold tracking-tight text-[#f6f2e8]">
            {index.name}
          </h2>
          <p className="text-sm text-[#d8ff4a]">${index.ticker}</p>
          {index.creator ? (
            <p className="mt-1 text-xs text-[#c8c2b0]/70">Created by {short(index.creator)}</p>
          ) : null}
        </div>
      </div>

      {index.example ? (
        <p className="mt-4 rounded-xl border border-[#d8ff4a]/20 bg-[#d8ff4a]/8 px-3 py-2 text-xs text-[#e8e2d2]">
          Example composition for preview. Not a live quoted market.
        </p>
      ) : null}

      <div className="mt-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#c8c2b0]/70">
          Composition
        </p>
        {index.components.length === 0 ? (
          <p className="mt-3 text-sm text-[#c8c2b0]/70">This index has no constituents yet.</p>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {index.components.map((row, i) => (
              <li key={`${row.ticker}-${i}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Mark ticker={row.ticker} logoUrl={row.logoUrl} />
                    <span className="truncate text-sm text-[#f3efe4]">${row.ticker}</span>
                  </div>
                  <span className="text-sm tabular-nums text-[#c8c2b0]">
                    {row.weightPct.toFixed(row.weightPct % 1 ? 1 : 0)}%
                  </span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/8">
                  <motion.div
                    className={cn("h-full rounded-full bg-[#d8ff4a]")}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (row.weightPct / total) * 100)}%` }}
                    transition={{ duration: 0.5, delay: i * 0.05 }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
