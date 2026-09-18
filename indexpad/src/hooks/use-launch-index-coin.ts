"use client";

import { useMutation } from "@tanstack/react-query";
import { useWalletClient } from "wagmi";
import { launchIndexCoin } from "@/lib/pons/launch";
import type { AdapterResult, IndexLaunch, LaunchIndexCoinInput } from "@/types";

export function useLaunchIndexCoin() {
  const { data: wallet } = useWalletClient();
  return useMutation({
    mutationFn: async (input: LaunchIndexCoinInput): Promise<AdapterResult<IndexLaunch>> => {
      if (!wallet) {
        return { ok: false, code: "invalid", message: "Connect a wallet on Robinhood Chain first" };
      }
      return launchIndexCoin(wallet, wallet.account.address, input);
    },
  });
}
