import type { Kind, Status } from './markets.ts'

export type LocalLaunch = {
  id: string
  name: string
  ticker: string
  subreddit: string
  sourceUrl: string
  kind: Kind
  image: string
  blurb: string
  mcap: number
  volume: number
  holders: number
  createdAt: number
  bonding: number
  status: Status
  price: number
  change24h: number
  onchain?: { token: `0x${string}`; curve: `0x${string}`; hash: `0x${string}` }
}

const KEY = 'redditpad.launches'

export function loadLocalLaunches(): LocalLaunch[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as LocalLaunch[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveLocalLaunch(row: LocalLaunch) {
  const all = [row, ...loadLocalLaunches().filter((x) => x.id !== row.id)]
  localStorage.setItem(KEY, JSON.stringify(all))
}
