"use client";

import { motion } from "framer-motion";
import { Activity, Database, Layers } from "lucide-react";
import { EXAMPLE_INDEX_BLURB } from "@/lib/indexpad/copy";
import { PONS_FACTORY, PONS_TRUST_NOTE } from "@/lib/pons";
import { usePonsIndexes, usePonsTokens } from "@/hooks";

export function StatusBoard() {
  const tokens = usePonsTokens();
  const indexes = usePonsIndexes();
  const tokenResult = tokens.data;
  const indexResult = indexes.data;

  return (
    <motion.main
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-16"
    >
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Pons Intelligence Index</p>
        <h1 className="text-3xl font-semibold tracking-tight">$PINT data layer</h1>
        <p className="text-sm text-zinc-400">{PONS_TRUST_NOTE}</p>
        <p className="font-mono text-xs text-zinc-500">factory {PONS_FACTORY}</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-xl border border-border bg-muted p-4">
          <div className="mb-2 flex items-center gap-2 text-sm text-zinc-300">
            <Database size={16} />
            Pons tokens
          </div>
          {tokens.isPending ? (
            <p className="text-sm text-zinc-500">Reading factory logs…</p>
          ) : tokenResult?.ok ? (
            <p className="text-sm">
              {tokenResult.data.length === 0
                ? "No factory launches in the scan window."
                : `${tokenResult.data.length} live Pons launches`}
            </p>
          ) : (
            <p className="text-sm text-red-400">{tokenResult?.message ?? tokens.error?.message}</p>
          )}
        </article>

        <article className="rounded-xl border border-border bg-muted p-4">
          <div className="mb-2 flex items-center gap-2 text-sm text-zinc-300">
            <Layers size={16} />
            Indexes
          </div>
          {indexes.isPending ? (
            <p className="text-sm text-zinc-500">Checking INDEXPAD_API_BASE…</p>
          ) : indexResult?.ok ? (
            indexResult.data.length === 0 ? (
              <div className="space-y-2">
                <p className="text-sm">No live indexes.</p>
                <p className="text-xs text-zinc-500">{EXAMPLE_INDEX_BLURB}</p>
              </div>
            ) : (
              <p className="text-sm">{indexResult.data.length} indexes from INDEXPAD_API_BASE</p>
            )
          ) : (
            <p className="text-sm text-red-400">{indexResult?.message ?? indexes.error?.message}</p>
          )}
        </article>
      </section>

      <p className="flex items-center gap-2 text-xs text-zinc-500">
        <Activity size={14} />
        createIndex / getIndexPerformance stay empty until INDEXPAD_API_BASE is set. launchIndexCoin talks to the Pons factory.
      </p>
    </motion.main>
  );
}
