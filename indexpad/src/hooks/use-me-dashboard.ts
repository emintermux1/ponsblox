"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getCreatedIndexes,
  getLaunchedCoins,
  getSavedIndexes,
} from "@/lib/indexpad/me";

export function useCreatedIndexes(wallet?: string) {
  return useQuery({
    queryKey: ["me", "created", wallet],
    queryFn: () => getCreatedIndexes(wallet as string),
    enabled: Boolean(wallet),
  });
}

export function useLaunchedCoins(wallet?: string) {
  return useQuery({
    queryKey: ["me", "launched", wallet],
    queryFn: () => getLaunchedCoins(wallet as string),
    enabled: Boolean(wallet),
  });
}

export function useSavedIndexes(wallet?: string) {
  return useQuery({
    queryKey: ["me", "saved", wallet],
    queryFn: () => getSavedIndexes(wallet as string),
    enabled: Boolean(wallet),
  });
}
