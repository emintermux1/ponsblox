import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function RouteLoading({ label = "Loading the desk" }: { label?: string }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">{label}</p>
      <div className="mt-6 flex flex-col gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
          <Skeleton className="h-56 hidden sm:block" />
        </div>
      </div>
    </div>
  );
}

export function RouteEmpty({
  kicker = "Empty",
  title,
  body,
  actionHref = "/create",
  actionLabel = "Create Index",
}: {
  kicker?: string;
  title: string;
  body: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <section className="rounded-2xl border border-dashed border-white/12 bg-white/[0.02] px-6 py-16 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">{kicker}</p>
      <h2 className="mt-3 font-serif text-2xl text-[#f3efe4]">{title}</h2>
      <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-white/50">{body}</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href={actionHref} className="ip-btn ip-btn-accent">
          {actionLabel}
        </Link>
        <Link href="/explore" className="ip-btn ip-btn-ghost">
          Explore
        </Link>
      </div>
    </section>
  );
}

export function RouteError({
  title = "The desk hit a wire",
  body = "A feed or wallet request failed. Retry, or return to the floor.",
  onRetry,
}: {
  title?: string;
  body?: string;
  onRetry?: () => void;
}) {
  return (
    <section className="mx-auto w-full max-w-xl px-4 py-20 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-danger">Error</p>
      <h2 className="mt-3 font-serif text-2xl text-[#f3efe4]">{title}</h2>
      <p className="mt-3 text-[14px] leading-relaxed text-white/50">{body}</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {onRetry ? (
          <Button onClick={onRetry}>Try again</Button>
        ) : (
          <Link href="/" className="ip-btn ip-btn-accent">
            Back to INDEXPAD
          </Link>
        )}
        <Link href="/explore" className="ip-btn ip-btn-ghost">
          Explore
        </Link>
      </div>
    </section>
  );
}
