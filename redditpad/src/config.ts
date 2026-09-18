import { getAddress, type Address } from 'viem'
import { ROBINHOOD_EXPLORER } from './lib/pons/config.ts'

/**
 * RedditPad token contract supplied by the operator.
 * This is not Reddit Inc equity and not an official Reddit stock token.
 */
export const REDDITPAD_TOKEN: Address = getAddress('0xf0fd79b056e5ee52fd178eb086fe232545bfb0e5')

export const REDDITPAD_TOKEN_SHORT = `${REDDITPAD_TOKEN.slice(0, 6)}…${REDDITPAD_TOKEN.slice(-4)}`

export const REDDITPAD_TOKEN_EXPLORER = `${ROBINHOOD_EXPLORER}/address/${REDDITPAD_TOKEN}`
