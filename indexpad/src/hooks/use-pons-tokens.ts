"use client";

import { useQuery } from "@tanstack/react-query";
import type { AdapterResult, PonsToken } from "@/types";

async function fetchTokens(): Promise<AdapterResult<PonsToken[]>> {
  const res = await fetch("/api/tokens", { cache: "no-store" });
  return (await res.json()) as AdapterResult<PonsToken[]>;
}

export function usePonsTokens() {
  return useQuery({
    queryKey: ["pons", "tokens"],
    queryFn: fetchTokens,
  });
}
