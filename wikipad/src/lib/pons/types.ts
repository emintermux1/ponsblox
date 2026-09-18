import type { Address, Hash, Hex } from 'viem'
import type { WikiBinding } from '../metadata.ts'

export type FactoryStatus = {
  approved: boolean
  phantomQuote: string
  graduationThreshold: string
  graduationRblx: string
  decimals: number
  launchFee: string
  launchFeeEth: string
  launchEnabled: boolean
  maxCreatorTaxBps: number
  launchConfigEnabled: boolean | null
}

export type TokenRecord = {
  token: Address
  curve: Address
  deployer: Address
  creatorFeeRecipient: Address
  pairToken: Address
  pairSymbol: string
  graduationThreshold: string
  creatorTaxBps: number
  buybackEnabled: boolean
  phase: number
  exists: boolean
  name: string
  symbol: string
  logo: string
  description: string
  website: string
  wiki: WikiBinding | null
  graduated: boolean
  readyToGraduate: boolean
  quoteReserve: string
  tokenReserve: string
  sellableTokens: string
  totalSupply: string
  priceRblx: string | null
  capRblx: string | null
  launchedAt?: number | null
}

export type LaunchDraft = {
  name: string
  symbol: string
  logo: string
  description: string
  website: string
  telegram: string
  creatorTaxBps: number
  buybackEnabled: boolean
  quoteIn: string
  minOut?: string
  recipient: Address
  buyRecipient?: Address
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
}

export type LaunchReceipt = {
  hash: Hash
  token: Address
  curve: Address
}
