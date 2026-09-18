import { ROBINHOOD_EXPLORER } from './pons/config.ts'

export const WRONG_CHAIN_MSG = 'Wallet is not on Robinhood Chain (4663).'

export const EXPLORER = ROBINHOOD_EXPLORER
export const txUrl = (h: string) => `${EXPLORER}/tx/${h}`
export const tokenUrl = (a: string) => `${EXPLORER}/token/${a}`
export const addressUrl = (a: string) => `${EXPLORER}/address/${a}`
export const short = (a?: string, n = 4) => (!a ? '' : `${a.slice(0, 2 + n)}…${a.slice(-n)}`)
