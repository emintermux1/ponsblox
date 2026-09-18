"use client";

import { useQuery } from "@tanstack/react-query";
import type { AdapterResult, PonsToken } from "@/types";

async function fetchToken(address: string): Promise<AdapterResult<PonsToken>> {
  const res = await fetch(`/api/tokens/${encodeURIComponent(address)}`, { cache: "no-store" });
  return (await res.json()) as AdapterResult<PonsToken>;
}

export function usePonsToken(address: string | undefined) {
  return useQuery({
    queryKey: ["pons", "token", address],
    queryFn: () => fetchToken(address!),
    enabled: Boolean(address),
  });
}
