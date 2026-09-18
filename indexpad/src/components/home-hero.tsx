"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  EXAMPLE_INDEX_COMPOSITION_COPY,
  EXAMPLE_INDEX_LABEL,
} from "@/lib/indexpad/copy";

const TAPE = [
  `${EXAMPLE_INDEX_LABEL.toUpperCase()}`,
  "$PINT",
  EXAMPLE_INDEX_COMPOSITION_COPY,
  "PREVIEW ONLY",
  "BASKET → COIN",
  "ROBINHOOD CHAIN",
];

export function HomeHero() {
  const tape = [...TAPE, ...TAPE, ...TAPE];

  return (
    <section className="relative -mt-14 min-h-dvh overflow-hidden bg-[#0b0b0a]">
      <Image
        src="/hero-floor.jpg"
        alt="New York exchange floor with shafts of light"
        fill
        preload
        fetchPriority="high"
        sizes="100vw"
        className="scale-[1.04] object-cover object-[center_24%]"
      />
      <div className="ip-shafts absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_42%,rgb(11_11_10/0.55),rgb(11_11_10/0.18)_42%,transparent_70%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0b0b0a] to-transparent" />

      <div className="absolute top-14 inset-x-0 z-10 overflow-hidden border-y border-[#d7c7a1]/20 bg-black/40">
        <div className="ip-tape flex w-max gap-8 py-1.5 pr-8 font-mono text-[10px] uppercase tracking-[0.24em] text-[#e6d7b4]">
          {tape.map((item, i) => (
            <span key={`${item}-${i}`} className="flex items-center gap-8">
              <span className="text-[#7dba8c]">▲</span>
              {item}
              <span className="text-[#d7c7a1]/40">·</span>
            </span>
          ))}
        </div>
      </div>

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-5xl flex-col items-center justify-center px-4 pb-20 pt-28 text-center sm:px-6">
        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, ease: "easeOut" }}
          className="font-serif text-[clamp(3.6rem,15vw,8.75rem)] font-semibold leading-[0.84] tracking-[0.055em] text-[#f7f2e8] [text-shadow:0_2px_40px_rgb(0_0_0/0.45)]"
        >
          INDEXPAD
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.12, ease: "easeOut" }}
          className="mt-8 max-w-2xl text-[clamp(1.15rem,2.6vw,1.65rem)] font-medium tracking-[-0.01em] text-[#f3efe4]"
        >
          Launch your own index on Robinhood
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.22 }}
          className="mt-5 flex flex-col items-center gap-4"
        >
          <span className="h-px w-16 bg-[#d7c7a1]/55" />
          <p className="text-[15px] tracking-[0.01em] text-white/68 sm:text-base">
            Turn any basket into a market.
          </p>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.55, delay: 0.32 }}
          className="mt-5 max-w-md text-[13px] leading-relaxed text-white/46"
        >
          Create an ETF from the Pons ecosystem. Weight it. Launch a coin around
          it.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.4, ease: "easeOut" }}
          className="mt-10 flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center"
        >
          <Link href="/create" className="ip-btn ip-btn-accent ip-btn-lg w-full sm:w-auto">
            Create Index
          </Link>
          <Link href="/explore" className="ip-btn ip-btn-ghost ip-btn-lg w-full sm:w-auto">
            Explore
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
