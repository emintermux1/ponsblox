import { createPublicClient, fallback, http } from 'viem'
import { ROBINHOOD_RPC, robinhood } from '../chain.ts'

export const publicClient = createPublicClient({
  chain: robinhood,
  transport: fallback([
    http(ROBINHOOD_RPC, { timeout: 12_000 }),
    http('https://rpc.mainnet.chain.robinhood.com', { timeout: 12_000 }),
  ]),
})
