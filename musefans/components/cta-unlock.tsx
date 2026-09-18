"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { unlockNote } from "@/lib/actions";
import { formatUsd } from "@/lib/money";

export function CtaUnlock({ messageId, priceCents }: { messageId: string; priceCents: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        void unlockNote(messageId).then(() => {
          router.refresh();
        });
      }}
      className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
    >
      Unlock {formatUsd(priceCents)}
    </button>
  );
}
