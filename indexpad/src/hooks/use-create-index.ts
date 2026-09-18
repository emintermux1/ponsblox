"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AdapterResult, CreateIndexInput, PonsIndex } from "@/types";

async function postIndex(
  input: CreateIndexInput & { creator?: string; logos?: Record<string, string> },
): Promise<AdapterResult<PonsIndex>> {
  const res = await fetch("/api/indexes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return (await res.json()) as AdapterResult<PonsIndex>;
}

export function useCreateIndex() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postIndex,
    onSuccess: (result) => {
      if (result.ok) {
        void queryClient.invalidateQueries({ queryKey: ["indexpad", "indexes"] });
      }
    },
  });
}
