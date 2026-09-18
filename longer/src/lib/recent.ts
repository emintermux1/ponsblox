import type { Address } from 'viem'
import type { AssetId } from './assets'

const KEY = 'longer:launches'

export type RecentLaunch = {
  token: Address
  pairId: AssetId
  symbol: string
  name: string
  logo?: string
  at: number
}

export function loadRecent(): RecentLaunch[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return []
    const rows = JSON.parse(raw) as RecentLaunch[]
    return Array.isArray(rows) ? rows.filter((r) => typeof r.token === 'string') : []
  } catch {
    return []
  }
}

export function saveRecent(row: RecentLaunch) {
  if (typeof window === 'undefined') return
  const next = [row, ...loadRecent().filter((r) => r.token.toLowerCase() !== row.token.toLowerCase())].slice(0, 40)
  window.localStorage.setItem(KEY, JSON.stringify(next))
}
