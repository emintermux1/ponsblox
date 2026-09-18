import type { MomentumLevel } from './signal.ts'
import type { RepoCard } from '../server/github.ts'
import type { TokenRow } from '../server/models.ts'

export type FeedFilter = 'all' | 'trending' | 'launches' | 'github' | 'markets'
export type BoardRange = 'now' | '24H' | '7D' | '30D'
export type MapCategory =
  | 'ai'
  | 'devtools'
  | 'crypto'
  | 'gaming'
  | 'infrastructure'
  | 'agents'
  | 'consumer'
  | 'other'

export type PulseStats = {
  repositoriesTracked: number
  trendingToday: number
  tokenizedRepositories: number
  launchesToday: number
  generatedAt: number
  source: 'indexed store'
  note: string
}

export type FeedItem = {
  id: string
  channel: 'github' | 'launch' | 'market' | 'claim'
  filter: FeedFilter
  at: number
  title: string
  body: string
  href?: string
  owner?: string
  name?: string
  token?: string
  tokenized?: boolean
}

export type BoardRow = {
  rank: number
  repo: RepoCard
  weeklyGrowth: number | null
  signal: MomentumLevel
  token: TokenRow | null
  capRblx: string | null
  volume: null
  holders: null
  tokenMomentum: string
}

export type DailySection = {
  id: string
  title: string
  lines: { rank?: number; label: string; meta: string; href: string }[]
  empty: string
}

export type DailyPage = {
  dateLabel: string
  isoDate: string
  sections: DailySection[]
  note: string
}

export type MapRepo = {
  repo: RepoCard
  token: TokenRow | null
}

export const MAP_CATEGORIES: { id: MapCategory; label: string }[] = [
  { id: 'ai', label: 'AI' },
  { id: 'devtools', label: 'Developer Tools' },
  { id: 'crypto', label: 'Crypto' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'infrastructure', label: 'Infrastructure' },
  { id: 'agents', label: 'Agents' },
  { id: 'consumer', label: 'Consumer' },
  { id: 'other', label: 'Other' },
]
