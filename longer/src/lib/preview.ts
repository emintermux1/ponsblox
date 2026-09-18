import { ASSETS, getAsset, type AssetId } from './assets'
import type { HolderRow, LongerLaunch, TokenMarket, TradeRow } from './pons/types'
import { walkSeries } from './series'

const NOW = Date.now()

function pair(id: string) {
  const asset = getAsset(id)
  if (!asset) throw new Error(`Unknown preview pair ${id}`)
  return asset
}

export function previewTape(id: AssetId): number[] {
  const row = PREVIEW_LAUNCHES.find((l) => l.pair.id === id)
  const seed = row ? row.symbol.charCodeAt(0) * 13 + row.pair.symbol.charCodeAt(0) : id.charCodeAt(0)
  return walkSeries(seed)
}

export const PREVIEW_LAUNCHES: LongerLaunch[] = [
  {
    id: 'preview-chips',
    token: '',
    curve: '',
    name: 'Chips',
    symbol: 'CHIPS',
    logo: '/tokens/chips.svg',
    description: 'NVIDIA weekend tape. Preview listing on LONGER.',
    website: '',
    twitter: '',
    telegram: '',
    pair: pair('NVDA3X'),
    marketCap: 512_400,
    volume24h: 91_200,
    price: 0.00184,
    holders: 318,
    createdAt: NOW - 42 * 60 * 1000,
    bonding: 'bonding',
    bondingPct: 61,
    creator: '',
    source: 'preview',
  },
  {
    id: 'preview-zuck',
    token: '',
    curve: '',
    name: 'Zuck',
    symbol: 'ZUCK',
    logo: '/tokens/zuck.svg',
    description: 'Launch a meme. Pair it with META 3X. Preview market on LONGER.',
    website: '',
    twitter: 'https://x.com',
    telegram: '',
    pair: pair('META3X'),
    marketCap: 184_200,
    volume24h: 42_800,
    price: 0.00062,
    holders: 147,
    createdAt: NOW - 18 * 60 * 1000,
    bonding: 'bonding',
    bondingPct: 34,
    creator: '',
    source: 'preview',
  },
  {
    id: 'preview-silicon',
    token: '',
    curve: '',
    name: 'Silicon',
    symbol: 'SILICON',
    logo: '/tokens/silicon.svg',
    description: 'Foundry hours. Preview NVDA 3X pair.',
    website: '',
    twitter: '',
    telegram: '',
    pair: pair('NVDA3X'),
    marketCap: 1_240_000,
    volume24h: 210_400,
    price: 0.0041,
    holders: 802,
    createdAt: NOW - 6 * 60 * 60 * 1000,
    bonding: 'graduated',
    bondingPct: 100,
    creator: '',
    source: 'preview',
  },
  {
    id: 'preview-green',
    token: '',
    curve: '',
    name: 'Green',
    symbol: 'GREEN',
    logo: '/tokens/green.svg',
    description: 'Datacenter green. Preview NVDA 3X pair.',
    website: '',
    twitter: '',
    telegram: '',
    pair: pair('NVDA3X'),
    marketCap: 88_600,
    volume24h: 16_400,
    price: 0.00021,
    holders: 76,
    createdAt: NOW - 3 * 60 * 60 * 1000,
    bonding: 'bonding',
    bondingPct: 19,
    creator: '',
    source: 'preview',
  },
  {
    id: 'preview-face',
    token: '',
    curve: '',
    name: 'Face',
    symbol: 'FACE',
    logo: '/tokens/face.svg',
    description: 'Preview META 3X pair. Asset is in development until a verified CA is supplied.',
    website: '',
    twitter: '',
    telegram: '',
    pair: pair('META3X'),
    marketCap: 61_200,
    volume24h: 9_400,
    price: 0.00014,
    holders: 54,
    createdAt: NOW - 26 * 60 * 60 * 1000,
    bonding: 'bonding',
    bondingPct: 12,
    creator: '',
    source: 'preview',
  },
  {
    id: 'preview-roadst',
    token: '',
    curve: '',
    name: 'Roadster',
    symbol: 'ROADST',
    logo: '/tokens/roadst.svg',
    description: 'Preview TSLA 3X pair. Asset is in development.',
    website: '',
    twitter: '',
    telegram: '',
    pair: pair('TSLA3X'),
    marketCap: 67_400,
    volume24h: 12_100,
    price: 0.00018,
    holders: 61,
    createdAt: NOW - 9 * 60 * 60 * 1000,
    bonding: 'bonding',
    bondingPct: 18,
    creator: '',
    source: 'preview',
  },
  {
    id: 'preview-fruit',
    token: '',
    curve: '',
    name: 'Fruit',
    symbol: 'FRUIT',
    logo: '/tokens/fruit.svg',
    description: 'Preview AAPL 3X pair. Asset is in development.',
    website: '',
    twitter: '',
    telegram: '',
    pair: pair('AAPL3X'),
    marketCap: 44_800,
    volume24h: 6_200,
    price: 0.00009,
    holders: 39,
    createdAt: NOW - 2 * 24 * 60 * 60 * 1000,
    bonding: 'bonding',
    bondingPct: 8,
    creator: '',
    source: 'preview',
  },
  {
    id: 'preview-window',
    token: '',
    curve: '',
    name: 'Window',
    symbol: 'WINDOW',
    logo: '/tokens/window.svg',
    description: 'Preview MSFT 3X pair. Asset is in development.',
    website: '',
    twitter: '',
    telegram: '',
    pair: pair('MSFT3X'),
    marketCap: 39_100,
    volume24h: 5_800,
    price: 0.00008,
    holders: 33,
    createdAt: NOW - 4 * 24 * 60 * 60 * 1000,
    bonding: 'bonding',
    bondingPct: 7,
    creator: '',
    source: 'preview',
  },
]

function tradesFor(row: LongerLaunch): TradeRow[] {
  const seed = row.symbol.length + row.pair.symbol.length
  return Array.from({ length: 8 }, (_, i) => ({
    id: `${row.id}-t${i}`,
    side: ((i + seed) % 3 === 0 ? 'sell' : 'buy') as TradeRow['side'],
    amount: 1200 + ((i + seed) * 173) % 8400,
    quote: 0.4 + ((i * 17 + seed) % 40) / 10,
    account: `0x${(i + 3).toString(16).padStart(4, '0')}…${(i + 11).toString(16).padStart(4, '0')}`,
    at: row.createdAt + (i + 1) * 7 * 60 * 1000,
  }))
}

function holdersFor(row: LongerLaunch): HolderRow[] {
  const base = [18.4, 11.2, 8.6, 6.1, 4.8]
  return base.map((pct, i) => ({
    account: `0x${(i + 9).toString(16).padStart(4, '0')}…hold`,
    pct,
    amount: (row.marketCap / Math.max(row.price, 0.00001)) * (pct / 100),
  }))
}

export function previewMarket(id: string): TokenMarket | null {
  const row = PREVIEW_LAUNCHES.find((l) => l.id === id || l.symbol.toLowerCase() === id.toLowerCase())
  if (!row) return null
  return {
    ...row,
    quoteReserve: '0',
    tokenReserve: '0',
    totalSupply: '1000000000',
    trades: tradesFor(row),
    holderRows: holdersFor(row),
    series: walkSeries(row.symbol.charCodeAt(0)),
  }
}

export function previewStats() {
  return ASSETS.map((asset) => {
    const rows = PREVIEW_LAUNCHES.filter((l) => l.pair.id === asset.id)
    return {
      id: asset.id,
      launchCount: rows.length,
      combinedVolume: rows.reduce((s, r) => s + r.volume24h, 0),
    }
  })
}

export function seedAssets() {
  const stats = previewStats()
  return ASSETS.map((asset) => {
    const preview = stats.find((s) => s.id === asset.id)
    return {
      ...asset,
      ponsApproved: false,
      launchCount: preview?.launchCount ?? 0,
      combinedVolume: preview?.combinedVolume ?? 0,
    }
  })
}
