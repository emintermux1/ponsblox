"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { subscribeMuse } from "@/lib/actions";
import { formatUsd } from "@/lib/money";

export function CtaSubscribe({
  handle,
  priceCents,
  subscribed,
  signedIn,
  compact = false,
}: {
  handle: string;
  priceCents: number;
  subscribed: boolean;
  signedIn: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const label = `Subscribe ${formatUsd(priceCents)}`;
  const box = compact
    ? "block w-full rounded-full bg-accent px-3 py-2 text-center text-sm font-semibold text-white disabled:opacity-60"
    : "block w-full rounded-full bg-accent px-5 py-3 text-center text-base font-semibold text-white disabled:opacity-60";

  if (subscribed) {
    return (
      <p
        className={
          compact
            ? "block w-full rounded-full bg-canvas px-3 py-2 text-center text-sm font-semibold text-fg"
            : "rounded-full bg-canvas px-5 py-3 text-center text-sm font-semibold text-fg"
        }
      >
        Subscribed
      </p>
    );
  }

  if (!signedIn) {
    return (
      <a href={`/login?next=${encodeURIComponent(`/m/${handle}`)}`} className={box}>
        {label}
      </a>
    );
  }

  return (
    <div className="w-full">
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          setError(null);
          void subscribeMuse(handle).then((result) => {
            setBusy(false);
            if (result.ok) {
              router.refresh();
              return;
            }
            setError("Could not subscribe.");
          });
        }}
        className={box}
      >
        {busy ? "Opening…" : label}
      </button>
      {error ? <p className="mt-1 px-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
