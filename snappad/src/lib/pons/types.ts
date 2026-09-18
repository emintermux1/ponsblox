import type { Address, Hash, Hex } from 'viem'

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

export type LaunchDraft = {
  name: string
  symbol: string
  logo: string
  description: string
  website: string
  twitter: string
  telegram: string
  creatorTaxBps: number
  buybackEnabled: boolean
  quoteIn: string
  minOut?: string
  recipient: Address
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
