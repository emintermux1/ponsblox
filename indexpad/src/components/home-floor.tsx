"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { EXAMPLE_INDEX_COMPOSITION_COPY, EXAMPLE_INDEX_LABEL } from "@/lib/indexpad/copy";
import { usePonsIndexes, usePonsTokens } from "@/hooks";

const EXAMPLE_LEGS = [
  { symbol: "AAA", weight: 40 },
  { symbol: "BBB", weight: 30 },
  { symbol: "CCC", weight: 20 },
  { symbol: "DDD", weight: 10 },
];

export function HomeFloor() {
  const tokens = usePonsTokens();
  const indexes = usePonsIndexes();
  const tokenCount = tokens.data?.ok ? tokens.data.data.length : null;
  const indexCount = indexes.data?.ok ? indexes.data.data.length : null;

  return (
    <main>
      <section className="relative min-h-[calc(100dvh-6.25rem)] overflow-hidden">
        <Image
          src="/brand/pit-floor.jpg"
          alt="New York trading floor"
          fill
          priority
          className="object-cover object-[center_30%]"
        />
        <div className="ip-shafts absolute inset-0" />
        <div className="relative mx-auto flex min-h-[calc(100dvh-6.25rem)] w-full max-w-7xl flex-col justify-center px-4 py-16 sm:px-6">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-mono text-[11px] uppercase tracking-[0.28em] text-accent"
          >
            On Robinhood Chain
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mt-4 max-w-5xl font-serif text-[clamp(3.4rem,11vw,8.5rem)] leading-[0.88] tracking-[-0.03em] text-[#f7f1e6]"
          >
            INDEXPAD
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="mt-6 max-w-xl text-xl text-[#f4efe4]/88 sm:text-2xl"
          >
            Launch your own index on Robinhood
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-3 max-w-lg text-[15px] text-[#f4efe4]/62"
          >
            Turn any basket into a market.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.26 }}
            className="mt-10 flex flex-wrap gap-3"
          >
            <Link href="/create" className="ip-btn ip-btn-accent ip-btn-lg">
              Create Index
            </Link>
            <Link href="/explore" className="ip-btn ip-btn-ghost ip-btn-lg">
              Explore the tape
            </Link>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-line bg-surface/70 p-6 backdrop-blur-sm">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">
            {EXAMPLE_INDEX_LABEL}
          </p>
          <h2 className="mt-2 font-serif text-3xl text-[#f4efe4]">How a basket becomes a market</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Weight tokens. Print a ticker. Launch the coin on Pons when you are ready.
            Preview composition only — {EXAMPLE_INDEX_COMPOSITION_COPY}.
          </p>
          <div className="mt-8 flex h-40 items-end gap-2">
            {EXAMPLE_LEGS.map((leg, i) => (
              <motion.div
                key={leg.symbol}
                layout
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: `${leg.weight * 2.2}%`, opacity: 1 }}
                transition={{ delay: 0.08 * i, type: "spring", stiffness: 220, damping: 24 }}
                className="flex flex-1 flex-col justify-end rounded-t-md bg-accent/80"
              >
                <div className="px-2 pb-2 text-center font-mono text-[10px] text-ink">
                  ${leg.symbol}
                  <div>{leg.weight}%</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-line bg-surface/70 p-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">Live tape</p>
            <p className="mt-3 font-serif text-2xl text-[#f4efe4]">
              {indexes.isPending
                ? "Reading indexes…"
                : indexCount === null
                  ? "Index feed unavailable"
                  : indexCount === 0
                    ? "No live indexes yet"
                    : `${indexCount} live indexes`}
            </p>
            <p className="mt-2 text-sm text-muted">
              {tokens.isPending
                ? "Scanning the Pons factory…"
                : tokenCount === null
                  ? "Factory read failed — empty, not invented."
                  : tokenCount === 0
                    ? "No factory launches in the current scan window."
                    : `${tokenCount} Pons tokens in the scan window.`}
            </p>
            <Link href="/explore" className="ip-btn ip-btn-ink mt-5">
              Open explore
            </Link>
          </div>
          <div
            className="relative min-h-40 overflow-hidden rounded-2xl border border-line"
          >
            <Image
              src="/brand/pit-gallery.jpg"
              alt=""
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-[#0b0b0a]/45" />
            <p className="relative p-6 font-serif text-xl text-[#f4efe4]">
              Desktop is the desk. Mobile is the wizard.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
