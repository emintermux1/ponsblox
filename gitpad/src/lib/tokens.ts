import type { Address } from 'viem'
import { GITPAD_OFFICIAL_TOKEN, isOfficialToken } from '../config/official.ts'
import { rememberRemote, fetchRemembered, type Remembered } from './api.ts'
import { readToken, scanRecentLaunches, type TokenRecord } from './pons.ts'

const LS = 'gitpad.tokens'

function readLocal(): Remembered[] {
  try {
    const raw = localStorage.getItem(LS)
    const rows = raw ? JSON.parse(raw) as Remembered[] : []
    return Array.isArray(rows) ? rows : []
  } catch {
    return []
  }
}

function writeLocal(rows: Remembered[]) {
  localStorage.setItem(LS, JSON.stringify(rows.slice(0, 200)))
}

export function rememberLocal(row: Remembered) {
  const next = [row, ...readLocal().filter((r) => r.token.toLowerCase() !== row.token.toLowerCase())]
  writeLocal(next)
  void rememberRemote(row)
}

export async function loadIndexed(): Promise<TokenRecord[]> {
  const local = readLocal()
  const remote = await fetchRemembered().catch(() => [] as Remembered[])
  const scanned = await scanRecentLaunches().catch(() => [] as Address[])
  const addrs = [...new Set([
    GITPAD_OFFICIAL_TOKEN.toLowerCase(),
    ...local.map((r) => r.token.toLowerCase()),
    ...remote.map((r) => r.token.toLowerCase()),
    ...scanned.map((a) => a.toLowerCase()),
  ])]
  const rows = (await Promise.all(addrs.map((a) => readToken(a as Address).catch(() => null))))
    .filter((r): r is TokenRecord => r !== null && (r.repo !== null || isOfficialToken(r.token)))
  rows.sort((a, b) => Number(isOfficialToken(b.token)) - Number(isOfficialToken(a.token)))
  for (const r of rows) {
    if (r.repo) rememberLocal({ token: r.token, owner: r.repo.owner, name: r.repo.name, symbol: r.symbol, at: Date.now() })
  }
  return rows
}

export async function tokenForRepo(owner: string, name: string): Promise<TokenRecord | null> {
  const local = readLocal().find(
    (r) => r.owner.toLowerCase() === owner.toLowerCase() && r.name.toLowerCase() === name.toLowerCase(),
  )
  if (local) {
    const row = await readToken(local.token as Address).catch(() => null)
    if (row) return row
  }
  const remote = await fetchRemembered(owner, name).catch(() => [] as Remembered[])
  if (remote[0]) {
    const row = await readToken(remote[0].token as Address).catch(() => null)
    if (row) return row
  }
  const all = await loadIndexed().catch(() => [] as TokenRecord[])
  return all.find((t) => t.repo
    && t.repo.owner.toLowerCase() === owner.toLowerCase()
    && t.repo.name.toLowerCase() === name.toLowerCase()) ?? null
}
