import Link from "next/link";

export default function PublicIndexNotFound() {
  return (
    <div className="flex flex-1 items-center justify-center bg-background px-6 py-20">
      <div className="max-w-md text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Index page</p>
        <h1 className="mt-3 font-serif text-3xl tracking-tight text-ivory">
          This index is not listed
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          No adapter row matches that slug. Indexes appear here only after they are created.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link href="/explore" className="ip-btn ip-btn-lg ip-btn-accent">
            Explore
          </Link>
          <Link href="/create" className="ip-btn ip-btn-lg ip-btn-ghost">
            Create Index
          </Link>
        </div>
      </div>
    </div>
  );
}
