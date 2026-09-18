import {
  GMGN_URL,
  PONS_TOKEN_URL,
  ROBINHOOD_CHAIN_ID,
  ROBINHOOD_EXPLORER,
  WIKIPAD_OFFICIAL_TOKEN,
  WIKIPAD_TICKER,
} from './config/official.ts'

export const TOKEN_NAME = 'WikiPad'
export const TICKER = WIKIPAD_TICKER
export const CHAIN = 'Robinhood Chain'
export const CHAIN_ID = ROBINHOOD_CHAIN_ID
export const PONS_APP = 'https://www.ponsfamily.com'
export const PONS_LAUNCHPAD = `${PONS_APP}/launchpad`
export const EXPLORER = ROBINHOOD_EXPLORER
export const GMGN = GMGN_URL

/** Official WikiPad CA. Display this exact string. */
export const CA = WIKIPAD_OFFICIAL_TOKEN

export function ponsTokenHref() {
  return `${PONS_TOKEN_URL}/${CA}`
}

export function dexHref() {
  return `${GMGN}/token/${CA}`
}

export function explorerHref() {
  return `${EXPLORER}/token/${CA}`
}

export const BUY = ponsTokenHref()
