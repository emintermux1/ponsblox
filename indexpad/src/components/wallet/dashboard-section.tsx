"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { WalletIndexCard } from "@/types/pons";
import { MeIndexCard } from "./me-index-card";

type DashboardSectionProps = {
  title: string;
  description: string;
  empty: string;
  emptyHref?: string;
  emptyLabel?: string;
  items?: WalletIndexCard[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onUnsave?: (slug: string) => void;
  icon: ReactNode;
};

function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-line bg-surface p-4">
      <div className="flex gap-3">
        <div className="h-12 w-12 rounded-xl bg-surface-2" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-4 w-2/3 rounded bg-surface-2" />
          <div className="h-3 w-1/3 rounded bg-surface-2" />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <div className="h-8 w-20 rounded-lg bg-surface-2" />
        <div className="h-8 w-16 rounded-lg bg-surface-2" />
        <div className="h-8 w-28 rounded-lg bg-surface-2" />
      </div>
    </div>
  );
}

export function DashboardSection({
  title,
  description,
  empty,
  emptyHref,
  emptyLabel,
  items,
  isLoading,
  isError,
  onRetry,
  onUnsave,
  icon,
}: DashboardSectionProps) {
  const count = items?.length ?? 0;

  return (
    <section className="space-y-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-accent">{icon}</span>
            <h2 className="font-serif text-2xl tracking-tight text-[#f4efe4]">
              {title}
            </h2>
            {!isLoading && !isError ? (
              <span className="rounded-full border border-line px-2 py-0.5 font-mono text-xs text-muted">
                {count}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
      </header>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : null}

      {isError ? (
        <div className="rounded-2xl border border-danger/30 bg-surface px-4 py-5">
          <p className="text-sm text-foreground">Could not load this list.</p>
          <p className="mt-1 text-sm text-muted">
            The adapter failed. Nothing here is filled in with sample rows.
          </p>
          <button type="button" className="ip-btn ip-btn-ink mt-3" onClick={onRetry}>
            Try again
          </button>
        </div>
      ) : null}

      {!isLoading && !isError && count === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface/60 px-5 py-8 text-center">
          <p className="text-sm text-muted">{empty}</p>
          {emptyHref && emptyLabel ? (
            <Link href={emptyHref} className="ip-btn ip-btn-accent mt-4 inline-flex">
              {emptyLabel}
            </Link>
          ) : null}
        </div>
      ) : null}

      {!isLoading && !isError && count > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {items?.map((item) => (
            <MeIndexCard key={item.id || item.slug} index={item} onUnsave={onUnsave} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
