import { createPublicClient, defineChain, http } from 'viem'
import { ROBINHOOD_CHAIN_ID, ROBINHOOD_EXPLORER, ROBINHOOD_RPC } from './config.ts'

export const rhc = defineChain({
  id: ROBINHOOD_CHAIN_ID,
  name: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [ROBINHOOD_RPC] } },
  blockExplorers: { default: { name: 'Blockscout', url: ROBINHOOD_EXPLORER } },
  contracts: { multicall3: { address: '0xcA11bde05977b3631167028862bE2a173976CA11' } },
})

export const publicClient = createPublicClient({
  chain: rhc,
  transport: http(rhc.rpcUrls.default.http[0]),
  batch: { multicall: { batchSize: 1024, wait: 16 } },
})
