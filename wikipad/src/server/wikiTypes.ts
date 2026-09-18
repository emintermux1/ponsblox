export type SearchHit = {
  title: string
  pageid: number
  snippet: string
  description: string
  thumbnail: string | null
  key: string
}

export type KnowledgeIndex = {
  views24h: number | null
  views7d: number | null
  viewsPrev7d: number | null
  growthPct: number | null
  edits: number | null
  languages: number | null
  rank: number | null
}

export type PageEditor = {
  name: string
  timestamp: string | null
  userUrl: string
  wallet: string | null
  feeTo: string
  held: boolean
}

export type KnowledgePage = {
  title: string
  displayTitle: string
  pageid: number
  qid: string | null
  extract: string
  description: string
  thumbnail: string | null
  originalImage: string | null
  wikipediaUrl: string
  wikidataUrl: string | null
  type: 'standard' | 'disambiguation' | 'other'
  launchable: boolean
  launchBlock: string | null
  index: KnowledgeIndex
  editor: PageEditor | null
}

export type TrendingItem = {
  title: string
  pageid: number | null
  extract: string
  description: string
  thumbnail: string | null
  views: number
  rank: number
  growthPct: number | null
  views24h: number | null
}
