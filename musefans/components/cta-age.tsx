"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { confirmAge } from "@/lib/actions";

export function CtaAge() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        void confirmAge().then(() => {
          router.refresh();
        });
      }}
      className="w-full rounded-full bg-accent px-6 py-3 text-base font-semibold text-white disabled:opacity-60"
    >
      I am 18 or older
    </button>
  );
}
