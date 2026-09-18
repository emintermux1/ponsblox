import {
  FACTORY,
  LAUNCH_AND_BUY,
  LAUNCH_CONFIG_ID,
  PONS_DOCS,
  PAIR_TOKEN,
  QUOTE_DECIMALS,
  ROBINHOOD_EXPLORER,
  publicClient,
  rhc,
} from './pons/index.ts'

export {
  FACTORY,
  LAUNCH_AND_BUY,
  LAUNCH_CONFIG_ID,
  PONS_DOCS,
  PAIR_TOKEN,
  QUOTE_DECIMALS,
  publicClient,
  rhc,
}

export const EXPLORER = ROBINHOOD_EXPLORER
export const txUrl = (h: string) => `${EXPLORER}/tx/${h}`
export const tokenUrl = (a: string) => `${EXPLORER}/token/${a}`
export const addressUrl = (a: string) => `${EXPLORER}/address/${a}`
export const gmgnUrl = (a: string) => `https://gmgn.ai/robinhood/token/${a}`
export const short = (a?: string, n = 4) => (!a ? '' : `${a.slice(0, 2 + n)}…${a.slice(-n)}`)
