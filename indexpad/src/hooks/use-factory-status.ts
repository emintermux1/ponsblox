"use client";

import { useQuery } from "@tanstack/react-query";
import { readFactoryStatus, type FactoryStatus } from "@/lib/pons/factory";

export function useFactoryStatus() {
  return useQuery<FactoryStatus>({
    queryKey: ["indexpad", "factory-status"],
    queryFn: readFactoryStatus,
    staleTime: 30_000,
    retry: 1,
  });
}
