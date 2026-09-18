import type { Address } from 'viem'

/**
 * Official Pons V2 surface copied from launcher/gitpad.
 * SOURCE: https://docs.ponsfamily.com/v2 — Robinhood Chain 4663.
 * Do not add addresses that are not in those files.
 */

function env(name: string): string {
  const viteEnv = import.meta.env as ImportMetaEnv & Record<string, string | undefined>
  return (viteEnv[name] || '').trim()
}

function officialAddress(envName: string, published: Address): Address {
  const override = env(envName)
  return (override || published) as Address
}

export const PONS_DOCS = 'https://docs.ponsfamily.com/v2'
export const PONS_NOTE =
  'Pons: index the factory and the curves. There is no official Pons API in the trust path.'

export const PONS_FACTORY = officialAddress(
  'VITE_PONS_FACTORY',
  '0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e',
)
export const PONS_LAUNCH_AND_BUY = officialAddress(
  'VITE_PONS_LAUNCH_AND_BUY',
  '0xe33E9E479dF8802cb0866d5d05258bEc4cF62948',
)

/** SOURCE: docs.ponsfamily.com/v2 — native ETH is pairToken 0x0. */
const ETH_PAIR = '0x0000000000000000000000000000000000000000' as Address
export const QUOTE_TOKEN = ETH_PAIR
export const PAIR_TOKEN = QUOTE_TOKEN
export const QUOTE_DECIMALS = 18
export const ZERO = ETH_PAIR
export const LOGO_MAX_BYTES = 512

export const LAUNCH_CONFIG_ID = BigInt(env('VITE_PONS_LAUNCH_CONFIG_ID') || '0')
export const ROBINHOOD_CHAIN_ID = Number(env('VITE_ROBINHOOD_CHAIN_ID') || '4663')
export const ROBINHOOD_RPC = env('VITE_ROBINHOOD_RPC') || 'https://rpc.mainnet.chain.robinhood.com'
export const ROBINHOOD_EXPLORER = env('VITE_ROBINHOOD_EXPLORER') || 'https://robinhoodchain.blockscout.com'

export const FACTORY = PONS_FACTORY
export const LAUNCH_AND_BUY = PONS_LAUNCH_AND_BUY
