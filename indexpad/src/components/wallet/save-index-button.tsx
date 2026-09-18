"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useHydrated } from "@/hooks/use-hydrated";
import { isIndexSaved } from "@/lib/indexpad/saved-store";
import { toggleSavedIndex } from "@/lib/indexpad/store";

export function SaveIndexButton({ slug }: { slug: string }) {
  const hydrated = useHydrated();
  const { address } = useAccount();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!address) {
      setSaved(false);
      return;
    }
    setSaved(isIndexSaved(address, slug));
  }, [address, slug]);

  if (!hydrated || !address) return null;

  return (
    <button
      type="button"
      className={saved ? "ip-btn ip-btn-ink" : "ip-btn ip-btn-ghost"}
      onClick={() => {
        toggleSavedIndex(address, slug);
        setSaved(isIndexSaved(address, slug));
      }}
    >
      {saved ? (
        <BookmarkCheck className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <Bookmark className="h-3.5 w-3.5" aria-hidden />
      )}
      {saved ? "Saved" : "Save"}
    </button>
  );
}
