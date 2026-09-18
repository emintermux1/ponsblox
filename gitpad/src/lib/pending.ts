import type { Address, Hash } from 'viem'

const KEY = 'gitpad.pendingLaunch'

export type PendingLaunch = {
  hash: Hash
  name: string
  symbol: string
  owner: string
  repo: string
  githubId?: number
  startedAt: number
}

export function readPendingLaunch(): PendingLaunch | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const row = JSON.parse(raw) as PendingLaunch
    if (!row.hash || !/^0x[a-fA-F0-9]{64}$/.test(row.hash)) return null
    return row
  } catch {
    return null
  }
}

export function writePendingLaunch(row: PendingLaunch) {
  localStorage.setItem(KEY, JSON.stringify(row))
}

export function clearPendingLaunch() {
  localStorage.removeItem(KEY)
}

export function isAddressLike(value: string): value is Address {
  return /^0x[a-fA-F0-9]{40}$/.test(value)
}
