import type { LaunchRetry } from './errors.ts'

const KEY = 'gitpad.launchHistory'

export type LaunchStatus = 'LIVE' | 'PENDING' | 'FAILED'

export type LaunchHistoryRow = {
  id: string
  wallet: string
  owner: string
  repo: string
  githubId?: number
  name: string
  symbol: string
  status: LaunchStatus
  hash?: string
  token?: string
  error?: string
  retry?: LaunchRetry
  at: number
  metaUri?: string
}

function readAll(): LaunchHistoryRow[] {
  try {
    const raw = localStorage.getItem(KEY)
    const rows = raw ? JSON.parse(raw) as LaunchHistoryRow[] : []
    return Array.isArray(rows) ? rows : []
  } catch {
    return []
  }
}

function writeAll(rows: LaunchHistoryRow[]) {
  localStorage.setItem(KEY, JSON.stringify(rows.slice(0, 80)))
}

export function readLaunchHistory(wallet?: string | null): LaunchHistoryRow[] {
  const rows = readAll().sort((a, b) => b.at - a.at)
  if (!wallet) return rows
  return rows.filter((r) => r.wallet.toLowerCase() === wallet.toLowerCase())
}

export function upsertLaunchHistory(row: LaunchHistoryRow) {
  const next = [row, ...readAll().filter((r) => r.id !== row.id && !(row.hash && r.hash === row.hash))]
  writeAll(next)
}

export function launchId(input: { wallet: string; owner: string; repo: string; at?: number }): string {
  return `${input.wallet.slice(0, 10)}-${input.owner}-${input.repo}-${input.at || Date.now()}`
}
