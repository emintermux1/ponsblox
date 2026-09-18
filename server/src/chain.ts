import { createPublicClient, defineChain, http, type Address } from 'viem'
import { ENV } from './env.ts'

export const rhc = defineChain({
  id: 4663,
  name: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [ENV.rpc] } },
  blockExplorers: { default: { name: 'Blockscout', url: 'https://robinhoodchain.blockscout.com' } },
  contracts: { multicall3: { address: '0xcA11bde05977b3631167028862bE2a173976CA11' } },
})

export const publicClient = createPublicClient({
  chain: rhc,
  transport: http(ENV.rpc),
  batch: { multicall: { batchSize: 1024, wait: 16 } },
})

export const FACTORY = '0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e' as Address
export const LAUNCH_AND_BUY = '0xe33E9E479dF8802cb0866d5d05258bEc4cF62948' as Address
export const RBLX = '0xF0C4BF4C582cb3836e98394b1d4e7B7281101bE8' as Address
export const ZERO = '0x0000000000000000000000000000000000000000' as Address
export const LAUNCH_CONFIG_ID = 0n
export const RBLX_DECIMALS = 18
export const LOG_WINDOW = 1800n

export const EXPLORER = 'https://robinhoodchain.blockscout.com'
export const gmgnTokenUrl = (token: string) =>
  `https://gmgn.ai/robinhood/token/${token}`
