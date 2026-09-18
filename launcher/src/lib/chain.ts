import { defineChain, getAddress, type Address, type Chain } from 'viem'

function env(name: string): string {
  const vite = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  return (vite?.[name] || '').trim()
}

export function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export const ROBINHOOD_CHAIN_ID = 4663
export const ARC_TESTNET_CHAIN_ID = 5042002
/** Circle has not published official mainnet RPC in docs.arc.io yet. Do not use until they do. */
export const ARC_MAINNET_CHAIN_ID = 5042

export const ROBINHOOD_RPC = env('VITE_ROBINHOOD_RPC') || 'https://rpc.mainnet.chain.robinhood.com'
export const ROBINHOOD_EXPLORER = 'https://robinhoodchain.blockscout.com'
export const PONS_FACTORY = '0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e' as Address
export const PONS_LAUNCH_AND_BUY = '0xe33E9E479dF8802cb0866d5d05258bEc4cF62948' as Address
export const PONS_DOCS = 'https://docs.ponsfamily.com/v2'
export const PONS_TOKEN_URL = (ca: string) => `https://www.ponsfamily.com/launchpad/token/${ca}`
export const GMGN_URL = (ca: string) => `https://gmgn.ai/robinhood/token/${ca}`
export const ZERO = '0x0000000000000000000000000000000000000000' as Address

export const ARC_RPC = env('VITE_ARC_RPC') || 'https://rpc.testnet.arc.io'
export const ARC_EXPLORER = 'https://testnet.arcscan.app'
export const ARC_DOCS = 'https://docs.arc.io/arc/references/rpc-endpoints'
/** Live LAUNCHER token on Arc testnet (5042002). Not Arc mainnet. */
export const LAUNCHER_TOKEN_ARC = getAddress('0x6068d35dadd947cab962b2f3fa7020c263b70e3b')
export const LAUNCHER_TOKEN_ARC_SHORT = shortAddress(LAUNCHER_TOKEN_ARC)
export const LAUNCHER_TOKEN_ARC_URL = `${ARC_EXPLORER}/address/${LAUNCHER_TOKEN_ARC}`

export const LAUNCHER_FACTORY = (env('VITE_LAUNCHER_FACTORY') || '0x97a23452EB9FaB5D0e886335B3D7E098D906F3c9') as Address
export const LAUNCHER_REGISTRY = (env('VITE_LAUNCHER_REGISTRY') || '0xc801579C373832BAB4F2cB9c90d3582E3927938E') as Address
export const LAUNCHER_FEE_ROUTER = (env('VITE_LAUNCHER_FEE_ROUTER') || '0x08e2f7dd349d1FA8802fa658c4C3C2ec9FD9B98E') as Address
export const ARC_FACTORY = (env('VITE_ARC_FACTORY') || '0x7800BBDb5253f6fC4BCbe7B88C8745a62eD6cCcb') as Address
export const ARC_REGISTRY = (env('VITE_ARC_REGISTRY') || '0x5d5AA1024f8fAff21A837BfC1c69f571e52367Df') as Address
export const ARC_FEE_ROUTER = (env('VITE_ARC_FEE_ROUTER') || '0xb1C46bFE4172D459e2730d6C505bECd13715Cbe1') as Address
export const ARC_BONDING_PAD = (env('VITE_ARC_BONDING_PAD') || '0xcbBe26735AAd929Ee560e000fD34C2bd237Fb6E2') as Address
export const LAUNCHER_FROM_BLOCK = BigInt(env('VITE_LAUNCHER_FROM_BLOCK') || '63601000')
export const ARC_FROM_BLOCK = BigInt(env('VITE_ARC_FROM_BLOCK') || '62220983')

export const robinhood = defineChain({
  id: ROBINHOOD_CHAIN_ID,
  name: 'Robinhood Chain',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [ROBINHOOD_RPC] } },
  blockExplorers: { default: { name: 'Blockscout', url: ROBINHOOD_EXPLORER } },
})

export const arcTestnet = defineChain({
  id: ARC_TESTNET_CHAIN_ID,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: [ARC_RPC] } },
  blockExplorers: { default: { name: 'Arcscan', url: ARC_EXPLORER } },
})

export type SupportedChain = 'robinhood' | 'arc'

export function chainOf(id: SupportedChain): Chain {
  switch (id) {
    case 'robinhood':
      return robinhood
    case 'arc':
      return arcTestnet
    default: {
      const _n: never = id
      return _n
    }
  }
}

export function chainLabel(id: SupportedChain): string {
  switch (id) {
    case 'robinhood':
      return 'Robinhood'
    case 'arc':
      return 'Arc testnet'
    default: {
      const _n: never = id
      return _n
    }
  }
}

/** Native quote asset on this pad. Never Solana/SOL/BNB. */
export function quoteAsset(id: SupportedChain): string {
  switch (id) {
    case 'robinhood':
      return 'ETH'
    case 'arc':
      return 'USDC'
    default: {
      const _n: never = id
      return _n
    }
  }
}

export function chainFromNumeric(id: number): SupportedChain {
  return id === ARC_TESTNET_CHAIN_ID ? 'arc' : 'robinhood'
}

export function numericChainId(id: SupportedChain): number {
  switch (id) {
    case 'robinhood':
      return ROBINHOOD_CHAIN_ID
    case 'arc':
      return ARC_TESTNET_CHAIN_ID
    default: {
      const _n: never = id
      return _n
    }
  }
}

export function explorerTx(id: SupportedChain, hash: string): string {
  switch (id) {
    case 'robinhood':
      return `${ROBINHOOD_EXPLORER}/tx/${hash}`
    case 'arc':
      return `${ARC_EXPLORER}/tx/${hash}`
    default: {
      const _n: never = id
      return _n
    }
  }
}

/** Blockscout-style REST used as a receipt fallback when RPC 429s. */
export function explorerApiTx(id: SupportedChain, hash: string): string {
  switch (id) {
    case 'robinhood':
      return `${ROBINHOOD_EXPLORER}/api/v2/transactions/${hash}`
    case 'arc':
      return `${ARC_EXPLORER}/api/v2/transactions/${hash}`
    default: {
      const _n: never = id
      return _n
    }
  }
}

export function explorerAddress(id: SupportedChain, addr: string): string {
  switch (id) {
    case 'robinhood':
      return `${ROBINHOOD_EXPLORER}/address/${addr}`
    case 'arc':
      return `${ARC_EXPLORER}/address/${addr}`
    default: {
      const _n: never = id
      return _n
    }
  }
}

export function factoryFor(id: SupportedChain): Address | '' {
  switch (id) {
    case 'robinhood':
      return LAUNCHER_FACTORY
    case 'arc':
      return ARC_FACTORY
    default: {
      const _n: never = id
      return _n
    }
  }
}

export function registryFor(id: SupportedChain): Address | '' {
  switch (id) {
    case 'robinhood':
      return LAUNCHER_REGISTRY
    case 'arc':
      return ARC_REGISTRY
    default: {
      const _n: never = id
      return _n
    }
  }
}

export function fromBlockFor(id: SupportedChain): bigint {
  switch (id) {
    case 'robinhood':
      return LAUNCHER_FROM_BLOCK
    case 'arc':
      return ARC_FROM_BLOCK
    default: {
      const _n: never = id
      return _n
    }
  }
}

export function isAddressSet(value: string): value is Address {
  return /^0x[0-9a-fA-F]{40}$/.test(value)
}
