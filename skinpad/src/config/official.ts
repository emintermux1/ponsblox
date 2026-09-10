import type { Address } from 'viem'

/**
 * Official integration surface.
 * Pons addresses are tagged to docs.ponsfamily.com/v2.
 * Secrets never live here.
 */

function env(name: string): string {
  const fromProcess = typeof process !== 'undefined' ? process.env[name] : undefined
  const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  const fromVite = viteEnv?.[name]
  return (fromProcess || fromVite || '').trim()
}

function officialAddress(envName: string, published: Address): Address {
  const override = env(envName)
  return (override || published) as Address
}

export const PONS_DOCS_URL = 'https://docs.ponsfamily.com/v2'
export const PONS_TRUST_NOTE =
  'Pons: index the factory and the curves. There is no official Pons API in the trust path.'

export const PONS_FACTORY = officialAddress(
  'VITE_PONS_FACTORY',
  '0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e',
)
export const PONS_LAUNCH_AND_BUY = officialAddress(
  'VITE_PONS_LAUNCH_AND_BUY',
  '0xe33E9E479dF8802cb0866d5d05258bEc4cF62948',
)
export const PONS_MEME_HOOK = officialAddress('VITE_PONS_MEME_HOOK', '0xE5e702641Ea86F4ae6cC3cDaeD2B886f976Be044')
export const PONS_FEE_ESCROW = officialAddress('VITE_PONS_FEE_ESCROW', '0xd3AFEB2a57f70eF218Aa82451c51B2fb0416Ac9e')
export const PONS_BUYBACK_VAULT = officialAddress('VITE_PONS_BUYBACK_VAULT', '0x42df2a798f82289E177311362e8f5ccC45c1219c')
export const PONS_LAUNCH_LOCKER = officialAddress('VITE_PONS_LAUNCH_LOCKER', '0x267444D099b10fB5Ed7c3Cc7B7c767AdcA574952')
export const PONS_LAUNCH_DEPLOYER = officialAddress('VITE_PONS_LAUNCH_DEPLOYER', '0x3711ceA4feaDE896C913C68F01Eda97Cb06D1A42')

const ETH_PAIR = '0x0000000000000000000000000000000000000000' as Address
const blockedQuote = '0xf0c4bf4c582cb3836e98394b1d4e7b7281101be8'
const pairOverride = env('VITE_PONS_PAIR')
export const QUOTE_TOKEN = (
  pairOverride && pairOverride.toLowerCase() !== blockedQuote
    ? pairOverride
    : ETH_PAIR
) as Address

export const LAUNCH_CONFIG_ID = BigInt(env('VITE_PONS_LAUNCH_CONFIG_ID') || '0')

export const ROBINHOOD_CHAIN_ID = Number(env('VITE_ROBINHOOD_CHAIN_ID') || '4663')
export const ROBINHOOD_RPC = env('VITE_ROBINHOOD_RPC') || 'https://rpc.mainnet.chain.robinhood.com'
export const ROBINHOOD_EXPLORER = env('VITE_ROBINHOOD_EXPLORER') || 'https://robinhoodchain.blockscout.com'

export const SKINPAD_TICKER = 'SKINPAD'
export const SKINPAD_NAME = 'CS2 SKINPAD'
export const SKINPAD_X_URL = env('VITE_SKINPAD_X') || 'https://x.com/skinpadfamily'

const official = env('VITE_SKINPAD_TOKEN')
export const SKINPAD_OFFICIAL_TOKEN = (official || '') as Address | ''

export function isOfficialToken(address: string): boolean {
  if (!SKINPAD_OFFICIAL_TOKEN) return false
  return address.toLowerCase() === SKINPAD_OFFICIAL_TOKEN.toLowerCase()
}

export const PINATA_DOCS = 'https://docs.pinata.cloud/api-reference/endpoint/pin-file-to-ipfs'

export const SECRET_ENV = ['PINATA_JWT'] as const

export function configuredIntegrations() {
  return {
    pinata: Boolean(env('PINATA_JWT')),
    officialToken: Boolean(SKINPAD_OFFICIAL_TOKEN),
  }
}

export const CATALOGUE_SIZE = 300
export const ON_PEG_BAND = 0.05
export const STEAM_APP_ID = 730
