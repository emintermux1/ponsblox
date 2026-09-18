import type { Address, Hash, Hex } from 'viem'
import type { AssetId, LeveragedAsset } from '../assets'

export type SortKey = 'newest' | 'mcap' | 'volume'

export type PairFilter = 'all' | AssetId

export type LaunchSource = 'live' | 'preview'

export type BondingState = 'bonding' | 'graduated' | 'unknown'

export type LongerLaunch = {
  id: string
  token: Address | ''
  curve: Address | ''
  name: string
  symbol: string
  logo: string
  description: string
  website: string
  twitter: string
  telegram: string
  pair: LeveragedAsset
  marketCap: number
  volume24h: number
  price: number
  holders: number
  createdAt: number
  bonding: BondingState
  bondingPct: number | null
  creator: Address | ''
  source: LaunchSource
}

export type TokenMarket = LongerLaunch & {
  quoteReserve: string
  tokenReserve: string
  totalSupply: string
  trades: TradeRow[]
  holderRows: HolderRow[]
  series: number[]
}

export type TradeRow = {
  id: string
  side: 'buy' | 'sell'
  amount: number
  quote: number
  account: string
  at: number
}

export type HolderRow = {
  account: string
  pct: number
  amount: number
}

export type LaunchDraft = {
  name: string
  symbol: string
  logo: string
  description: string
  website: string
  twitter: string
  telegram: string
  pairId: AssetId
  quoteIn: string
  recipient: Address | ''
}

export type LaunchCall = {
  to: Address
  functionName: 'launchToken' | 'launchAndBuy'
  value: bigint
  data: Hex
  approveToken: Address | null
  approveSpender: Address | null
  approveAmount: string
  quoteIn: string
  launchFee: bigint
  pairToken: Address
}

export type LaunchReceipt = {
  hash: Hash
  token: Address
  curve: Address
}

export type LaunchBlock =
  | { kind: 'connect' }
  | { kind: 'wrong_chain' }
  | { kind: 'factory_paused' }
  | { kind: 'invalid_form'; message: string }
  | { kind: 'ready' }

export type PrepareResult =
  | { ok: true; call: LaunchCall }
  | { ok: false; block: LaunchBlock }

export type FactoryStatus = {
  approved: boolean
  launchEnabled: boolean
  launchFee: string
  launchFeeEth: string
  maxCreatorTaxBps: number
}

export type AssetWithPons = LeveragedAsset & {
  ponsApproved: boolean
  launchCount: number
  combinedVolume: number
}
