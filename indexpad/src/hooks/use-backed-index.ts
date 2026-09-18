"use client";

import { useQuery } from "@tanstack/react-query";
import { resolveBackedIndex, type BackedIndex } from "@/lib/indexpad/backed-index";

export function useBackedIndex(indexKey: string | null) {
  return useQuery<BackedIndex | null>({
    queryKey: ["indexpad", "backed-index", indexKey],
    queryFn: () => resolveBackedIndex(indexKey),
    enabled: Boolean(indexKey),
    staleTime: 15_000,
  });
}
