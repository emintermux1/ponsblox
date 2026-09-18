import type { Address } from 'viem'

/**
 * Official integration surface.
 *
 * Every address / URL below is tagged with its source. Do not add Pons
 * methods that are not in docs.ponsfamily.com/v2 or the published factory ABI.
 * Secrets never live here — only public identifiers and env *names*.
 */

function env(name: string): string {
  const fromProcess = typeof process !== 'undefined' ? process.env[name] : undefined
  const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  const fromVite = viteEnv?.[name]
  return (fromProcess || fromVite || '').trim()
}

function officialAddress(envName: string, published: Address, _source: string): Address {
  const override = env(envName)
  return (override || published) as Address
}

/** https://docs.ponsfamily.com/v2 — "There is no pons API in the trust path." */
export const PONS_DOCS_URL = 'https://docs.ponsfamily.com/v2'
export const PONS_GITHUB_URL = 'https://github.com/ponsdotdev/ponsfamily'
export const PONS_TRUST_NOTE =
  'Pons: index the factory and the curves. There is no official Pons API in the trust path.'

/**
 * SOURCE: https://docs.ponsfamily.com/v2 — Deployed addresses, Robinhood Chain 4663.
 */
export const PONS_FACTORY = officialAddress(
  'VITE_PONS_FACTORY',
  '0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e',
  'https://docs.ponsfamily.com/v2',
)

/**
 * SOURCE: https://docs.ponsfamily.com/v2 — Launch and buy router.
 */
export const PONS_LAUNCH_AND_BUY = officialAddress(
  'VITE_PONS_LAUNCH_AND_BUY',
  '0xe33E9E479dF8802cb0866d5d05258bEc4cF62948',
  'https://docs.ponsfamily.com/v2',
)

/** SOURCE: https://docs.ponsfamily.com/v2 — Deployed addresses. */
export const PONS_MEME_HOOK = officialAddress('VITE_PONS_MEME_HOOK', '0xE5e702641Ea86F4ae6cC3cDaeD2B886f976Be044', 'https://docs.ponsfamily.com/v2')
export const PONS_FEE_ESCROW = officialAddress('VITE_PONS_FEE_ESCROW', '0xd3AFEB2a57f70eF218Aa82451c51B2fb0416Ac9e', 'https://docs.ponsfamily.com/v2')
export const PONS_BUYBACK_VAULT = officialAddress('VITE_PONS_BUYBACK_VAULT', '0x42df2a798f82289E177311362e8f5ccC45c1219c', 'https://docs.ponsfamily.com/v2')
export const PONS_LAUNCH_LOCKER = officialAddress('VITE_PONS_LAUNCH_LOCKER', '0x267444D099b10fB5Ed7c3Cc7B7c767AdcA574952', 'https://docs.ponsfamily.com/v2')
export const PONS_LAUNCH_DEPLOYER = officialAddress('VITE_PONS_LAUNCH_DEPLOYER', '0x3711ceA4feaDE896C913C68F01Eda97Cb06D1A42', 'https://docs.ponsfamily.com/v2')

/**
 * SOURCE: https://docs.ponsfamily.com/v2 — native ETH is pairToken 0x0.
 * GitPad only launches against ETH.
 */
const ETH_PAIR = '0x0000000000000000000000000000000000000000' as Address
const blockedQuote = '0xf0c4bf4c582cb3836e98394b1d4e7b7281101be8'
const pairOverride = env('VITE_PONS_PAIR')
export const QUOTE_TOKEN = (
  pairOverride && pairOverride.toLowerCase() !== blockedQuote
    ? pairOverride
    : ETH_PAIR
) as Address

/**
 * SOURCE: docs.ponsfamily.com/v2 — configs are an append-only list.
 * Read `launchConfigCount` / `getLaunchConfig` before treating this as final.
 */
export const LAUNCH_CONFIG_ID = BigInt(env('VITE_PONS_LAUNCH_CONFIG_ID') || '0')

/** SOURCE: Robinhood Chain public RPC / explorer. */
export const ROBINHOOD_CHAIN_ID = Number(env('VITE_ROBINHOOD_CHAIN_ID') || '4663')
export const ROBINHOOD_RPC = env('VITE_ROBINHOOD_RPC') || 'https://rpc.mainnet.chain.robinhood.com'
export const ROBINHOOD_EXPLORER = env('VITE_ROBINHOOD_EXPLORER') || 'https://robinhoodchain.blockscout.com'

export const GITHUB_API = 'https://api.github.com'
export const GITHUB_DOCS = 'https://docs.github.com/en/rest'

/** Official GitPad X. Every token socials.twitter uses this URL. */
export const GITPAD_X_URL = 'https://x.com/LaunchGitLab'

/** Official GitPad coin on Pons V2. TokenLaunched in the factory. */
export const GITPAD_OFFICIAL_TOKEN = '0xCE8E2fD91eaB5536Fd347c94dEB4e54DFaf62016' as Address
export const GITPAD_OFFICIAL_TX = '0x4a102aae0afff71341f6337d288cfec1a55cd9a3216018892f6ef60ce72bbe8a'

export function isOfficialToken(address: string): boolean {
  return address.toLowerCase() === GITPAD_OFFICIAL_TOKEN.toLowerCase()
}

export const PINATA_DOCS = 'https://docs.pinata.cloud/api-reference/endpoint/pin-file-to-ipfs'
export const BITQUERY_DOCS = 'https://docs.bitquery.io/docs/blockchain/robinhood/pons-api/'

export const SECRET_ENV = [
  'GITHUB_TOKEN',
  'GITHUB_OAUTH_CLIENT_SECRET',
  'PINATA_JWT',
  'BITQUERY_API_KEY',
] as const

export function configuredIntegrations() {
  return {
    githubToken: Boolean(env('GITHUB_TOKEN')),
    githubOAuth: Boolean(env('GITHUB_OAUTH_CLIENT_ID') && env('GITHUB_OAUTH_CLIENT_SECRET')),
    pinata: Boolean(env('PINATA_JWT')),
    bitquery: Boolean(env('BITQUERY_API_KEY')),
    gitpadFactory: Boolean(env('VITE_GITPAD_FACTORY')),
    feeRouter: Boolean(env('VITE_GITPAD_FEE_ROUTER')),
  }
}

export const ADMIN_ADDRESSES = (env('VITE_GITPAD_ADMINS') || env('GITPAD_ADMINS') || '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean)
