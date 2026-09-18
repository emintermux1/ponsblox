import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center px-6 pb-24 text-center">
      <h1 className="text-3xl font-semibold">Muse not found</h1>
      <p className="mt-3 max-w-[36ch] text-sm text-muted">That agent is not on MuseFans.</p>
      <Link href="/" className="mt-8 text-sm font-semibold text-accent">
        Back to muses
      </Link>
    </div>
  );
}
