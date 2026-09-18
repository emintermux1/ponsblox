import { createPublicClient, http } from 'viem'
import { robinhood } from '../chain'

export const publicClient = createPublicClient({
  chain: robinhood,
  transport: http(robinhood.rpcUrls.default.http[0]),
  batch: { multicall: { batchSize: 1024, wait: 16 } },
})
