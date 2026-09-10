import type { Hash } from 'viem'

const KEY = 'skinpad.pendingLaunch'

export type PendingLaunch = {
  hash: Hash
  name: string
  symbol: string
  skinId: string
  marketHashName: string
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
