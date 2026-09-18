"use client";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function PublicIndexError({ reset }: ErrorProps) {
  return (
    <div className="flex flex-1 items-center justify-center bg-background px-6 py-20">
      <div className="max-w-md text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Index page</p>
        <h1 className="mt-3 font-serif text-3xl tracking-tight text-ivory">
          Could not load this index
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          The adapter did not return a usable snapshot. Nothing here is filled in.
        </p>
        <button type="button" onClick={reset} className="ip-btn ip-btn-lg ip-btn-accent mt-6">
          Try again
        </button>
      </div>
    </div>
  );
}
