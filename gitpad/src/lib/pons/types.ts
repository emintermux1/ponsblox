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
  repo: { owner: string; name: string } | null
  graduated: boolean
  readyToGraduate: boolean
  quoteReserve: string
  tokenReserve: string
  sellableTokens: string
  totalSupply: string
  priceRblx: string | null
  capRblx: string | null
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

export type PendingRecipient = {
  recipient: Address
  effectiveAt: number
  expiresAt: number
}

export type FeePermission =
  | {
      kind: 'router_set'
      supported: true
      permission: 'GitPadFeeRouter.setRoute — current Pons deployer (or router owner)'
    }
  | {
      kind: 'transfer_recipient'
      supported: true
      permission: 'Pons transferCreatorFeeRecipient(token, newRecipient) — current creatorFeeRecipient only'
    }
  | {
      kind: 'need_creator'
      supported: false
      permission: null
      creator: Address
      connected: Address | null
    }
  | {
      kind: 'unsupported'
      supported: false
      permission: null
      reason: string
    }
