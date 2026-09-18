import { createPublicClient, http } from "viem";
import { ROBINHOOD_RPC, robinhood } from "@/lib/chain";

export const publicClient = createPublicClient({
  chain: robinhood,
  transport: http(ROBINHOOD_RPC),
  batch: { multicall: { batchSize: 1024, wait: 16 } },
});
