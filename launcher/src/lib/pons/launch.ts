import { parseEventLogs, type Address, type Hex, type Log, type WalletClient } from 'viem'
import { PONS_FACTORY, PONS_LAUNCH_AND_BUY, ZERO, robinhood } from '../chain.ts'
import { FACTORY_ABI, ROUTER_ABI, TOKEN_LAUNCHED } from './abi.ts'
import { publicClient } from './client.ts'

export type PonsLaunchDraft = {
  name: string
  symbol: string
  logo: string
  description: string
  website: string
  twitter: string
  creatorFeeRecipient: Address
  creatorTaxBps: number
  quoteWei?: bigint
}

export type PonsLaunchResult = {
  token: Address
  curve: Address
  hash: Hex
}

export type PonsTokenParams = {
  name: string
  symbol: string
  logo: string
  description: string
  socials: {
    twitter: string
    telegram: string
    discord: string
    website: string
    farcaster: string
  }
  creatorFeeRecipient: Address
  creatorTaxBps: number
  buybackEnabled: boolean
  expectedEconomics: Hex
  salt: Hex
}

export function randomSalt(): Hex {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return `0x${[...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')}` as Hex
}

export function buildTokenParams(
  draft: PonsLaunchDraft,
  expectedEconomics: Hex,
  salt: Hex,
): PonsTokenParams {
  return {
    name: draft.name,
    symbol: draft.symbol,
    logo: draft.logo,
    description: draft.description,
    socials: {
      twitter: draft.twitter,
      telegram: '',
      discord: '',
      website: draft.website,
      farcaster: '',
    },
    creatorFeeRecipient: draft.creatorFeeRecipient,
    creatorTaxBps: draft.creatorTaxBps,
    buybackEnabled: false,
    expectedEconomics,
    salt,
  }
}

export function tokenFromLaunchLogs(logs: Log[]): { token: Address; curve: Address } | null {
  const parsed = parseEventLogs({ abi: [TOKEN_LAUNCHED], logs, eventName: 'TokenLaunched' })
  const ev = parsed[0]
  if (!ev?.args.token || !ev.args.curve) return null
  return { token: ev.args.token, curve: ev.args.curve }
}

export async function readPonsLaunchFee(): Promise<bigint> {
  return publicClient.readContract({
    address: PONS_FACTORY,
    abi: FACTORY_ABI,
    functionName: 'launchFee',
  })
}

export async function readCanLaunch(account: Address): Promise<boolean> {
  return publicClient.readContract({
    address: PONS_FACTORY,
    abi: FACTORY_ABI,
    functionName: 'canLaunch',
    args: [account],
  })
}

export async function readLaunchEnabled(): Promise<boolean> {
  return publicClient.readContract({
    address: PONS_FACTORY,
    abi: FACTORY_ABI,
    functionName: 'launchEnabled',
  })
}

export async function previewEconomics(): Promise<Hex> {
  return publicClient.readContract({
    address: PONS_FACTORY,
    abi: FACTORY_ABI,
    functionName: 'previewLaunchEconomics',
    args: [0n, ZERO],
  })
}

export async function launchOnPons(
  wallet: WalletClient,
  account: Address,
  draft: PonsLaunchDraft,
): Promise<PonsLaunchResult> {
  const quoteWei = draft.quoteWei ?? 0n
  const [fee, economics, enabled] = await Promise.all([
    readPonsLaunchFee(),
    previewEconomics(),
    readLaunchEnabled(),
  ])
  if (!enabled) throw new Error('Pons is not accepting launches right now.')
  const params = buildTokenParams(draft, economics, randomSalt())
  const hash = quoteWei > 0n
    ? await wallet.writeContract({
        account,
        chain: robinhood,
        address: PONS_LAUNCH_AND_BUY,
        abi: ROUTER_ABI,
        functionName: 'launchAndBuy',
        args: [params, 0n, ZERO, quoteWei, 0n, account, []],
        value: fee + quoteWei,
      })
    : await wallet.writeContract({
        account,
        chain: robinhood,
        address: PONS_FACTORY,
        abi: FACTORY_ABI,
        functionName: 'launchToken',
        args: [params, 0n, ZERO],
        value: fee,
      })
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  if (receipt.status !== 'success') throw new Error('Pons launch reverted.')
  const parsed = tokenFromLaunchLogs(receipt.logs)
  if (!parsed) throw new Error('Pons launch mined without TokenLaunched.')
  return { token: parsed.token, curve: parsed.curve, hash }
}
