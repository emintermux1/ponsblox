"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ExploreError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-dvh bg-background px-4 py-16 text-foreground">
      <div className="mx-auto max-w-lg text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-danger">
          Catalog error
        </p>
        <h1 className="mt-3 text-2xl font-medium tracking-tight">
          Indexes could not be loaded
        </h1>
        <p className="mt-3 text-[14px] text-muted">
          {error.message || "The index catalog adapter failed. Nothing here is invented."}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="ip-btn ip-btn-accent">
            Try again
          </button>
          <Link href="/" className="ip-btn ip-btn-ghost">
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
