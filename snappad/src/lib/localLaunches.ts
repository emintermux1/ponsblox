import type { SnapKind } from './snap.ts'

export type LocalLaunch = {
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
  videoUrl?: string
  snapUrl?: string
  onchain?: { token: `0x${string}`; curve: `0x${string}`; hash: `0x${string}` }
}

const KEY = 'snappad.launches.v2'

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
