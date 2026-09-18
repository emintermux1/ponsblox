"use client";

import { useQuery } from "@tanstack/react-query";
import type { AdapterResult, PonsIndex } from "@/types";

async function fetchIndexes(): Promise<AdapterResult<PonsIndex[]>> {
  const res = await fetch("/api/indexes", { cache: "no-store" });
  return (await res.json()) as AdapterResult<PonsIndex[]>;
}

export function usePonsIndexes() {
  return useQuery({
    queryKey: ["indexpad", "indexes"],
    queryFn: fetchIndexes,
  });
}
