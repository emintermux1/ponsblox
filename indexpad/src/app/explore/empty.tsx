import Link from "next/link";

export function ExploreEmpty() {
  return (
    <section className="mt-10 rounded-2xl border border-dashed border-line bg-surface/50 px-6 py-16 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">
        Empty catalog
      </p>
      <h2 className="mt-3 text-xl font-medium tracking-tight">No live indexes yet</h2>
      <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-muted">
        <span className="font-mono text-foreground/80">getPonsIndexes()</span> returned
        nothing. Without <span className="font-mono text-foreground/80">INDEXPAD_API_BASE</span>{" "}
        the catalog is empty — this is not a placeholder leaderboard.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/create" className="ip-btn ip-btn-accent">
          Create the first index
        </Link>
        <Link href="/" className="ip-btn ip-btn-ghost">
          Back home
        </Link>
      </div>
    </section>
  );
}
