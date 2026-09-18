export type IndexComponent = {
  ticker: string
  symbol?: string
  name?: string
  weight?: number
  weightBps?: number
  logoUrl?: string | null
}

export type PonsIndex = {
  id: string
  slug: string
  name: string
  ticker: string
  logoUrl?: string | null
  creator: string
  createdAt?: number | string | null
  change24h?: number | null
  change24hBps?: number | null
  change7d?: number | null
  change7dBps?: number | null
  marketCap?: number | string | null
  marketCapQuote?: string | null
  assetCount?: number | null
  components?: IndexComponent[]
  sparkline?: number[] | null
  volume24h?: number | null
  tradeCount?: number | null
  launchCount?: number | null
  launchedCoinAddress?: string | null
  launchedAt?: string | number | null
}

export type IndexLaunch = {
  id: string
  indexId: string
  indexSlug: string
  name: string
  ticker: string
  tokenAddress: string
  launcher: string
  createdAt: string | number
  logoUrl?: string | null
  txHash?: string | null
  curveAddress?: string | null
}

export type WalletIndexCard = {
  id: string
  slug: string
  name: string
  ticker: string
  creator?: string
  logoUrl?: string | null
  assetCount?: number
  launchedCoinAddress?: string | null
}
