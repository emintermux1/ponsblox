import type { Address } from 'viem'

export type AssetId = 'NVDA3X' | 'META3X' | 'TSLA3X' | 'AAPL3X' | 'MSFT3X'

export type AssetStatus = 'live' | 'listed' | 'development'

export type LeveragedAsset = {
  id: AssetId
  symbol: string
  name: string
  underlying: string
  leveragedSymbol: string
  address: Address | ''
  logo: string
  leverage: 3
  enabled: boolean
}

function envAddress(name: string): Address | '' {
  const v = (process.env[name] || '').trim()
  if (/^0x[a-fA-F0-9]{40}$/.test(v)) return v as Address
  return ''
}

/**
 * Verified on Robinhood Chain RPC (4663) as name "NVDA 3x Long" / symbol "NVDAx3L".
 * Do not add other CAs unless supplied via env or verified the same way.
 */
const NVDA3X_VERIFIED = '0xf51fb54de60f6e16252e852a5ed0e60b8307606a' as Address

const NVDA_ADDRESS = envAddress('NEXT_PUBLIC_NVDA3X_ADDRESS') || NVDA3X_VERIFIED
const META_ADDRESS = envAddress('NEXT_PUBLIC_META3X_ADDRESS')
const TSLA_ADDRESS = envAddress('NEXT_PUBLIC_TSLA3X_ADDRESS')
const AAPL_ADDRESS = envAddress('NEXT_PUBLIC_AAPL3X_ADDRESS')
const MSFT_ADDRESS = envAddress('NEXT_PUBLIC_MSFT3X_ADDRESS')

export const ASSETS: LeveragedAsset[] = [
  {
    id: 'NVDA3X',
    symbol: 'NVDA',
    name: 'NVIDIA',
    underlying: 'NVDA',
    leveragedSymbol: 'NVDA3X',
    address: NVDA_ADDRESS,
    logo: '/logos/nvidia.svg',
    leverage: 3,
    enabled: Boolean(NVDA_ADDRESS),
  },
  {
    id: 'META3X',
    symbol: 'META',
    name: 'Meta',
    underlying: 'META',
    leveragedSymbol: 'META3X',
    address: META_ADDRESS,
    logo: '/logos/meta.svg',
    leverage: 3,
    enabled: Boolean(META_ADDRESS),
  },
  {
    id: 'TSLA3X',
    symbol: 'TSLA',
    name: 'Tesla',
    underlying: 'TSLA',
    leveragedSymbol: 'TSLA3X',
    address: TSLA_ADDRESS,
    logo: '/logos/tesla.svg',
    leverage: 3,
    enabled: Boolean(TSLA_ADDRESS),
  },
  {
    id: 'AAPL3X',
    symbol: 'AAPL',
    name: 'Apple',
    underlying: 'AAPL',
    leveragedSymbol: 'AAPL3X',
    address: AAPL_ADDRESS,
    logo: '/logos/apple.svg',
    leverage: 3,
    enabled: Boolean(AAPL_ADDRESS),
  },
  {
    id: 'MSFT3X',
    symbol: 'MSFT',
    name: 'Microsoft',
    underlying: 'MSFT',
    leveragedSymbol: 'MSFT3X',
    address: MSFT_ADDRESS,
    logo: '/logos/microsoft.svg',
    leverage: 3,
    enabled: Boolean(MSFT_ADDRESS),
  },
]

export function getAsset(id: string | null | undefined): LeveragedAsset | undefined {
  if (!id) return undefined
  return ASSETS.find((a) => a.id === id.toUpperCase() || a.symbol === id.toUpperCase())
}

export function getAssetByAddress(address: string | null | undefined): LeveragedAsset | undefined {
  if (!address) return undefined
  const lower = address.toLowerCase()
  return ASSETS.find((a) => a.address && a.address.toLowerCase() === lower)
}

export function pairLabel(asset: LeveragedAsset): string {
  return `${asset.symbol} ${asset.leverage}X`
}

export function pairTicker(asset: LeveragedAsset): string {
  return `${asset.symbol} ${asset.leverage}X`
}

export function tokenPairLabel(ticker: string, asset: LeveragedAsset): string {
  return `${ticker.toUpperCase()} / ${pairTicker(asset)}`
}

export function assetStatus(asset: LeveragedAsset, _ponsApproved?: boolean): AssetStatus {
  if (!asset.enabled || !asset.address) return 'development'
  return 'live'
}

export function statusCopy(status: AssetStatus): string {
  switch (status) {
    case 'live':
      return 'Live'
    case 'listed':
      return 'Live'
    case 'development':
      return 'Soon'
    default: {
      const _e: never = status
      return _e
    }
  }
}

export function registryAddresses(): Address[] {
  return ASSETS.map((a) => a.address).filter((a): a is Address => Boolean(a))
}
