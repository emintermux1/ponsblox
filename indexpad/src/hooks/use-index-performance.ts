"use client";

import { useQuery } from "@tanstack/react-query";
import type { AdapterResult, IndexPerformance } from "@/types";

async function fetchPerformance(indexId: string): Promise<AdapterResult<IndexPerformance>> {
  const res = await fetch(`/api/indexes/${encodeURIComponent(indexId)}/performance`, {
    cache: "no-store",
  });
  return (await res.json()) as AdapterResult<IndexPerformance>;
}

export function useIndexPerformance(indexId: string | undefined) {
  return useQuery({
    queryKey: ["indexpad", "performance", indexId],
    queryFn: () => fetchPerformance(indexId!),
    enabled: Boolean(indexId),
  });
}
