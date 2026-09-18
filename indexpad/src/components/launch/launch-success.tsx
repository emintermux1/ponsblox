"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Copy, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { explorerTxUrl, ponsLaunchpadUrl, short, tokenUrl } from "@/lib/chain";
import type { IndexLaunch } from "@/types";

export function LaunchSuccess({
  launch,
  indexSlug,
  onReset,
}: {
  launch: IndexLaunch;
  indexSlug: string;
  onReset: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const token = launch.tokenAddress;
  if (!token) return null;
  const tokenAddress = token;

  async function copy() {
    await navigator.clipboard.writeText(tokenAddress);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-[#d8ff4a]/25 bg-[#d8ff4a]/8 p-6 sm:p-8"
    >
      <div className="flex items-center gap-3 text-[#d8ff4a]">
        <CheckCircle2 className="size-6" />
        <p className="text-sm font-medium uppercase tracking-[0.16em]">Live</p>
      </div>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#f7f3e8]">
        Index market launched
      </h2>
      <p className="mt-2 text-sm text-[#d4cfc0]">
        {launch.name} ${launch.symbol} is on Pons. This address came from the TokenLaunched event.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5">
        <code className="min-w-0 flex-1 truncate font-mono text-sm text-[#f6f2e8]">{token}</code>
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white/8 px-2.5 py-1.5 text-xs text-[#f6f2e8] hover:bg-white/12"
        >
          <Copy className="size-3.5" />
          {copied ? "Copied" : short(token)}
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <a
          href={tokenUrl(token)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#f6f2e8] px-4 py-2.5 text-sm font-medium text-[#11120c]"
        >
          Explorer <ExternalLink className="size-3.5" />
        </a>
        <Link
          href={`/index/${indexSlug}`}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/6 px-4 py-2.5 text-sm font-medium text-[#f6f2e8]"
        >
          Index page
        </Link>
        <a
          href={ponsLaunchpadUrl(token)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/6 px-4 py-2.5 text-sm font-medium text-[#f6f2e8]"
        >
          Token on Pons <ExternalLink className="size-3.5" />
        </a>
        {launch.txHash ? (
          <a
            href={explorerTxUrl(launch.txHash)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/12 px-4 py-2.5 text-sm text-[#d4cfc0]"
          >
            Transaction
          </a>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onReset}
        className="mt-6 text-sm text-[#c8c2b0] underline-offset-4 hover:underline"
      >
        Launch another coin
      </button>
    </motion.section>
  );
}
