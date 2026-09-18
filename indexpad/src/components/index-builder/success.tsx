"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { TokenLogo } from "@/components/token-logo";
import { Button } from "@/components/ui/button";
import type { CreatedView } from "./types";

type Phase = "gather" | "merge" | "reveal";

export function CreateSuccess({ created }: { created: CreatedView }) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>(reduce ? "reveal" : "gather");
  const tokens = created.components;

  useEffect(() => {
    if (reduce) return;
    const merge = window.setTimeout(() => setPhase("merge"), 520);
    const reveal = window.setTimeout(() => setPhase("reveal"), 1480);
    return () => {
      window.clearTimeout(merge);
      window.clearTimeout(reveal);
    };
  }, [reduce]);

  return (
    <div className="relative flex min-h-[72vh] flex-col items-center justify-center overflow-hidden px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(201,166,90,0.14),transparent_58%)]"
      />

      <div className="relative mb-10 flex h-36 w-full max-w-md items-center justify-center">
        <motion.div
          aria-hidden
          className="absolute size-44 rounded-full border border-brass/35"
          initial={{ scale: 0.72, opacity: 0 }}
          animate={{
            scale: phase === "gather" ? 1 : 0.78,
            opacity: phase === "reveal" ? 0.22 : 1,
          }}
          transition={{ type: "spring", stiffness: 220, damping: 24 }}
        />
        <motion.div
          aria-hidden
          className="absolute size-28 rounded-full border border-ivory/10"
          animate={{
            scale: phase === "merge" ? 1.08 : 1,
            opacity: phase === "reveal" ? 0.35 : 0.7,
          }}
        />

        {tokens.map((token, index) => {
          const spread = (index - (tokens.length - 1) / 2) * 58;
          return (
            <motion.div
              key={token.id}
              className="absolute"
              initial={false}
              animate={{
                x: phase === "gather" ? spread : 0,
                scale: phase === "merge" ? 0.86 : 1,
                zIndex: tokens.length - index,
              }}
              transition={{ type: "spring", stiffness: 420, damping: 30, mass: 0.65 }}
            >
              <TokenLogo
                symbol={token.symbol}
                logo={token.logo}
                layoutId={`logo-${token.id}`}
                size={52}
              />
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {phase === "reveal" ? (
          <motion.div
            className="relative z-10 flex max-w-lg flex-col items-center text-center"
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="text-[11px] tracking-[0.32em] text-brass">YOUR INDEX IS LIVE</p>
            <h1 className="mt-3 font-serif text-4xl text-ivory sm:text-5xl">{created.name}</h1>
            <p className="mt-2 font-mono text-xl text-brass">${created.symbol}</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={`/index/${created.slug}`}
                className="inline-flex h-12 items-center rounded-sm bg-ivory px-6 text-sm font-medium text-desk"
              >
                View Index
              </Link>
              <Link
                href={`/launch?index=${created.slug}`}
                className="inline-flex h-12 items-center rounded-sm border border-line px-6 text-sm font-medium text-ivory hover:bg-surface-2"
              >
                Launch Coin
              </Link>
            </div>
          </motion.div>
        ) : (
          <motion.p
            key="staging"
            className="text-[11px] tracking-[0.28em] text-muted"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            SEALING THE BASKET
          </motion.p>
        )}
      </AnimatePresence>

      <Button
        variant="ghost"
        className="sr-only"
        onClick={() => setPhase("reveal")}
      >
        Skip animation
      </Button>
    </div>
  );
}
