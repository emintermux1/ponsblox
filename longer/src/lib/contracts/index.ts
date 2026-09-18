import type { Address } from 'viem'

function env(name: string): string {
  return (process.env[name] || '').trim()
}

function officialAddress(envName: string, published: Address): Address {
  const override = env(envName)
  return (override || published) as Address
}

/** SOURCE: https://docs.ponsfamily.com/v2 — Deployed addresses, Robinhood Chain 4663. */
export const PONS_FACTORY = officialAddress(
  'NEXT_PUBLIC_PONS_FACTORY',
  '0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e',
)

export const PONS_LAUNCH_AND_BUY = officialAddress(
  'NEXT_PUBLIC_PONS_LAUNCH_AND_BUY',
  '0xe33E9E479dF8802cb0866d5d05258bEc4cF62948',
)

export const PONS_MEME_HOOK = officialAddress(
  'NEXT_PUBLIC_PONS_MEME_HOOK',
  '0xE5e702641Ea86F4ae6cC3cDaeD2B886f976Be044',
)

export const PONS_DOCS_URL = 'https://docs.ponsfamily.com/v2'
export const LAUNCH_CONFIG_ID = BigInt(env('NEXT_PUBLIC_PONS_LAUNCH_CONFIG_ID') || '0')
export const ZERO = '0x0000000000000000000000000000000000000000' as Address
/** GitPad / Pons native ETH pair. Factory treats 0x0 as ETH, not via approvedPairTokens. */
export const ETH_PAIR = ZERO
export const LOGO_MAX_BYTES = 512

export {
  CURVE_ABI,
  ERC20_ABI,
  FACTORY_ABI,
  ROUTER_ABI,
  TOKEN_INFO_ABI,
  TOKEN_LAUNCHED,
} from './abi'
