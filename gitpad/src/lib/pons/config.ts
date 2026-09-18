import type { Address } from 'viem'
import {
  LAUNCH_CONFIG_ID,
  PONS_BUYBACK_VAULT,
  PONS_DOCS_URL,
  PONS_FACTORY,
  PONS_FEE_ESCROW,
  PONS_LAUNCH_AND_BUY,
  PONS_LAUNCH_DEPLOYER,
  PONS_LAUNCH_LOCKER,
  PONS_MEME_HOOK,
  PONS_TRUST_NOTE,
  QUOTE_TOKEN,
  ROBINHOOD_CHAIN_ID,
  ROBINHOOD_EXPLORER,
  ROBINHOOD_RPC,
} from '../../config/official.ts'

/**
 * Isolated Pons configuration. Addresses are published on
 * https://docs.ponsfamily.com/v2 unless tagged otherwise.
 * Do not add methods or addresses that are not in those docs.
 */
export const PONS_DOCS = PONS_DOCS_URL
export const PONS_NOTE = PONS_TRUST_NOTE
export const FACTORY = PONS_FACTORY
export const LAUNCH_AND_BUY = PONS_LAUNCH_AND_BUY
export const MEME_HOOK = PONS_MEME_HOOK
export const FEE_ESCROW = PONS_FEE_ESCROW
export const BUYBACK_VAULT = PONS_BUYBACK_VAULT
export const LAUNCH_LOCKER = PONS_LAUNCH_LOCKER
export const LAUNCH_DEPLOYER = PONS_LAUNCH_DEPLOYER
export const PAIR_TOKEN = QUOTE_TOKEN
export const QUOTE_DECIMALS = 18
export { LAUNCH_CONFIG_ID, ROBINHOOD_CHAIN_ID, ROBINHOOD_EXPLORER, ROBINHOOD_RPC }

export const ZERO = '0x0000000000000000000000000000000000000000' as Address

export const LOGO_MAX_BYTES = 512
