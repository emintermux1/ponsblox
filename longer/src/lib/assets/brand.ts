import type { AssetId } from './registry'

export function brandInk(id: AssetId): string {
  switch (id) {
    case 'NVDA3X':
      return '#76B900'
    case 'META3X':
      return '#0082FB'
    case 'TSLA3X':
      return '#E82127'
    case 'AAPL3X':
      return '#F5F5F7'
    case 'MSFT3X':
      return '#00A4EF'
    default: {
      const _e: never = id
      return _e
    }
  }
}

export function brandLogo(id: AssetId): string {
  switch (id) {
    case 'NVDA3X':
      return '/logos/nvidia.svg'
    case 'META3X':
      return '/logos/meta.svg'
    case 'TSLA3X':
      return '/logos/tesla.svg'
    case 'AAPL3X':
      return '/logos/apple.svg'
    case 'MSFT3X':
      return '/logos/microsoft.svg'
    default: {
      const _e: never = id
      return _e
    }
  }
}
