import { defineChain } from 'viem'

function env(name: string): string {
  return (process.env[name] || '').trim()
}

/** SOURCE: docs.ponsfamily.com/v2 + Robinhood Chain public RPC. Never use rpc.mainnet.robinhood.family. */
export const ROBINHOOD_CHAIN_ID = Number(env('NEXT_PUBLIC_ROBINHOOD_CHAIN_ID') || '4663')
export const ROBINHOOD_RPC =
  env('NEXT_PUBLIC_ROBINHOOD_RPC') || 'https://rpc.mainnet.chain.robinhood.com'
export const ROBINHOOD_EXPLORER =
  env('NEXT_PUBLIC_ROBINHOOD_EXPLORER') || 'https://robinhoodchain.blockscout.com'

export const robinhood = defineChain({
  id: ROBINHOOD_CHAIN_ID,
  name: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [ROBINHOOD_RPC] } },
  blockExplorers: { default: { name: 'Blockscout', url: ROBINHOOD_EXPLORER } },
  contracts: { multicall3: { address: '0xcA11bde05977b3631167028862bE2a173976CA11' } },
})

export const EXPLORER = ROBINHOOD_EXPLORER
export const txUrl = (h: string) => `${EXPLORER}/tx/${h}`
export const tokenUrl = (a: string) => `${EXPLORER}/token/${a}`
export const addressUrl = (a: string) => `${EXPLORER}/address/${a}`
export const ponsTokenUrl = (a: string) => `https://www.ponsfamily.com/launchpad/token/${a}`
export const gmgnUrl = (a: string) => `https://gmgn.ai/robinhood/token/${a}`

export function short(a?: string, n = 4): string {
  if (!a) return ''
  return `${a.slice(0, 2 + n)}…${a.slice(-n)}`
}
