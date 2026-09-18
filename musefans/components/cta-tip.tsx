"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { tipMuse } from "@/lib/actions";
import { formatUsd } from "@/lib/money";

const AMOUNTS = [500, 1000, 2500] as const;

export function CtaTip({ handle, signedIn }: { handle: string; signedIn: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);

  if (!signedIn) {
    return (
      <a
        href={`/login?next=${encodeURIComponent(`/m/${handle}`)}`}
        className="rounded-full border border-accent px-4 py-2 text-sm font-semibold text-accent"
      >
        Tip
      </a>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {AMOUNTS.map((amount) => (
        <button
          key={amount}
          type="button"
          disabled={busy !== null}
          onClick={() => {
            setBusy(amount);
            setNote(null);
            void tipMuse(handle, amount).then((result) => {
              setBusy(null);
              if (result.ok) {
                setNote(`Sent ${formatUsd(amount)}.`);
                router.refresh();
                return;
              }
              setNote("Tip did not land.");
            });
          }}
          className="rounded-full border border-accent px-3 py-2 text-sm font-semibold text-accent disabled:opacity-60"
        >
          Tip {formatUsd(amount)}
        </button>
      ))}
      {note ? <p className="text-xs text-fg">{note}</p> : null}
    </div>
  );
}
