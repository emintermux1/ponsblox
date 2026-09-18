import { createPublicClient, defineChain, fallback, http } from 'viem'
import {
  ROBINHOOD_CHAIN_ID,
  ROBINHOOD_EXPLORER,
  robinhoodRpcUrls,
} from './config.ts'

const RPCS = robinhoodRpcUrls()

export const rhc = defineChain({
  id: ROBINHOOD_CHAIN_ID,
  name: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: RPCS } },
  blockExplorers: { default: { name: 'Blockscout', url: ROBINHOOD_EXPLORER } },
  contracts: { multicall3: { address: '0xcA11bde05977b3631167028862bE2a173976CA11' } },
})

export const publicClient = createPublicClient({
  chain: rhc,
  transport: fallback(
    RPCS.map((url) => http(url, { timeout: 10_000, retryCount: 1, retryDelay: 200 })),
    { rank: false },
  ),
  batch: { multicall: { batchSize: 1024, wait: 16 } },
})
