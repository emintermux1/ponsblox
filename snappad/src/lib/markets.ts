import { snapClock } from './countdown.ts'
import live from './liveCatalog.json'
import { loadLocalLaunches } from './localLaunches.ts'
import type { SnapKind } from './snap.ts'

export type SnapPair = {
  id: string
  name: string
  ticker: string
  account: string
  caption: string
  sourceUrl: string
  kind: SnapKind
  image: string
  avatar: string
  tone: string
  createdAt: number
  mcap: number
  volume: number
  holders: number
  price: number
  change24h: number
  streak: number
  videoTitle?: string
  videoUrl?: string
  snapUrl?: string
  onchain?: { token: `0x${string}`; curve: `0x${string}`; hash: `0x${string}` }
}

const TICKER: Record<string, string> = {
  espnsnap: 'ESPN',
  daviddobrik: 'DOBRIK',
  nba: 'NBA',
  nasa: 'NASA',
  nytimes: 'NYT',
  mrbeast: 'BEAST',
  lakers: 'LAKERS',
  nfl: 'NFL',
  teamsnapchat: 'TEAM',
  cnn: 'CNN',
  netflix: 'NFLX',
  spotify: 'SPOT',
  nhl: 'NHL',
  mlb: 'MLB',
  marvel: 'MARVEL',
  disney: 'DISNEY',
  wwe: 'WWE',
  bleacherreport: 'BR',
  sportscenter: 'SC',
  mtv: 'MTV',
  people: 'PEOPLE',
  billboard: 'BBORD',
  xbox: 'XBOX',
  playstation: 'PSN',
}

type CatalogRow = {
  id: string
  name: string
  ticker: string
  account: string
  caption: string
  sourceUrl: string
  kind: string
  image: string
  videoTitle?: string
  videoUrl?: string
  snapUrl?: string
}

const SKIP = new Set(['snap'])
const NOW = Date.now()

function accountKey(account: string) {
  return account.replace('@', '').replace(/[^a-z0-9]/gi, '').toLowerCase()
}

function firstPerAccount(pairs: SnapPair[]): SnapPair[] {
  const seen = new Set<string>()
  return pairs.filter((p) => {
    const key = p.account.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function catalog(): SnapPair[] {
  return (live as CatalogRow[])
    .filter((row) => !SKIP.has(row.id))
    .map((row, i) => {
      const key = accountKey(row.account)
      const videoTitle = row.videoTitle && row.videoTitle !== 'Spotlight Snap' ? row.videoTitle : ''
      return {
        id: row.id,
        name: row.name,
        ticker: TICKER[key] || TICKER[row.id] || row.ticker.slice(0, 8),
        account: row.account,
        caption: videoTitle || row.caption,
        sourceUrl: row.sourceUrl,
        kind: row.kind as SnapKind,
        image: row.image,
        avatar: `/live/ava/${row.account.replace('@', '')}.jpg`,
        tone: '#111',
        createdAt: NOW - (i * 11 + 4) * 60_000,
        mcap: 0,
        volume: 0,
        holders: 0,
        price: 0,
        change24h: 0,
        streak: 0,
        videoTitle,
        videoUrl: row.videoUrl || undefined,
        snapUrl: row.snapUrl || undefined,
      }
    })
}

export function allPairs(): SnapPair[] {
  const local = loadLocalLaunches()
  const seen = new Set(local.map((x) => x.id))
  return [...local, ...catalog().filter((p) => !seen.has(p.id))]
}

export function pairById(key: string): SnapPair | null {
  const k = key.toLowerCase()
  return allPairs().find((p) => p.id.toLowerCase() === k || p.ticker.toLowerCase() === k) ?? null
}

export function liveStories(now = Date.now()): SnapPair[] {
  return firstPerAccount(
    allPairs()
      .filter((p) => !snapClock(p.createdAt, now).expired)
      .sort((a, b) => b.createdAt - a.createdAt),
  )
}

export function chatFeed(): SnapPair[] {
  return firstPerAccount(allPairs().sort((a, b) => b.createdAt - a.createdAt))
}

export function spotlightFeed(): SnapPair[] {
  return allPairs()
    .filter((p) => p.kind === 'spotlight' || Boolean(p.image))
    .sort((a, b) => b.createdAt - a.createdAt)
}
