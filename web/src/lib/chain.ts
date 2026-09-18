import { defineChain } from 'viem'

export const rhc = defineChain({
  id: 4663,
  name: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.mainnet.chain.robinhood.com'] } },
  blockExplorers: { default: { name: 'Blockscout', url: 'https://robinhoodchain.blockscout.com' } },
})

export const RBLX = '0xF0C4BF4C582cb3836e98394b1d4e7B7281101bE8' as const
export const EXPLORER = 'https://robinhoodchain.blockscout.com'
export const txUrl = (h: string) => `${EXPLORER}/tx/${h}`
export const tokenUrl = (a: string) => `${EXPLORER}/token/${a}`
export const gmgnUrl = (a: string) => `https://gmgn.ai/robinhood/token/${a}`
export const short = (a?: string, n = 4) => (!a ? '' : `${a.slice(0, 2 + n)}…${a.slice(-n)}`)
