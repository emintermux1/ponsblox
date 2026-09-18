import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  emptyStore,
  type ActivityEvent,
  type Deployment,
  type MarketSnapshot,
  type Repository,
  type RepositorySnapshot,
  type StoreShape,
  type TokenKind,
  type TokenRow,
  type VerifiedMaintainer,
  type WatchItem,
} from './models.ts'

function storeFile() {
  if (process.env.VERCEL) return '/tmp/gitpad-store.json'
  try {
    return resolve(dirname(fileURLToPath(import.meta.url)), '../../.data/store.json')
  } catch {
    return resolve(process.cwd(), '.data/store.json')
  }
}

let mem: StoreShape | null = null

function load(): StoreShape {
  if (mem) return mem
  try {
    const raw = JSON.parse(readFileSync(storeFile(), 'utf8')) as StoreShape
    mem = {
      ...emptyStore(),
      ...raw,
      health: { ...emptyStore().health, ...raw.health },
      indexer: { ...emptyStore().indexer, ...raw.indexer, processed: { ...emptyStore().indexer.processed, ...raw.indexer?.processed } },
      funnel: { ...emptyStore().funnel, ...raw.funnel },
    }
  } catch {
    mem = emptyStore()
  }
  return mem
}

function save() {
  const data = load()
  try {
    const file = storeFile()
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, JSON.stringify(data, null, 2))
  } catch {
    /* serverless / read-only — keep the in-memory store */
  }
}

export function readStore(): StoreShape {
  return load()
}

export function upsertRepository(row: Repository) {
  const s = load()
  const i = s.repositories.findIndex((r) => r.githubId === row.githubId)
  if (i >= 0) s.repositories[i] = { ...s.repositories[i], ...row }
  else s.repositories.unshift(row)
  save()
}

export function addSnapshot(row: RepositorySnapshot) {
  const s = load()
  const last = s.snapshots.filter((x) => x.githubId === row.githubId).at(-1)
  if (last && row.at - last.at < 10 * 60_000) return
  s.snapshots.push(row)
  if (s.snapshots.length > 4000) s.snapshots.splice(0, s.snapshots.length - 4000)
  save()
}

export function tokensForRepo(owner: string, name: string): TokenRow[] {
  const o = owner.toLowerCase()
  const n = name.toLowerCase()
  return load().tokens.filter((t) => t.owner.toLowerCase() === o && t.name.toLowerCase() === n)
}

export function tokensForGithubId(githubId: number): TokenRow[] {
  return load().tokens.filter((t) => t.githubId === githubId)
}

export function rememberToken(row: TokenRow) {
  const s = load()
  const existing = s.tokens.filter((t) => (
    (row.githubId && t.githubId === row.githubId)
    || (t.owner.toLowerCase() === row.owner.toLowerCase() && t.name.toLowerCase() === row.name.toLowerCase())
  ))
  const kind: TokenKind = existing.some((t) => t.kind === 'canonical' && t.address.toLowerCase() !== row.address.toLowerCase())
    ? 'community'
    : (existing.some((t) => t.address.toLowerCase() === row.address.toLowerCase()) ? row.kind : (existing.length ? 'community' : 'canonical'))
  const next = { ...row, kind }
  const i = s.tokens.findIndex((t) => t.address.toLowerCase() === row.address.toLowerCase())
  if (i >= 0) s.tokens[i] = { ...s.tokens[i], ...next }
  else s.tokens.unshift(next)
  save()
  return next
}

export function addDeployment(row: Deployment) {
  const s = load()
  s.deployments.unshift(row)
  s.deployments = s.deployments.slice(0, 400)
  save()
}

export function addActivity(row: Omit<ActivityEvent, 'id'>) {
  const s = load()
  const ev: ActivityEvent = { ...row, id: `${row.at}-${row.kind}-${s.activity.length}` }
  s.activity.unshift(ev)
  s.activity = s.activity.slice(0, 300)
  save()
  return ev
}

export function addActivityOnce(row: Omit<ActivityEvent, 'id'>, windowMs = 6 * 60 * 60_000) {
  const s = load()
  const dup = s.activity.find((e) => (
    e.kind === row.kind
    && (e.owner || '').toLowerCase() === (row.owner || '').toLowerCase()
    && (e.name || '').toLowerCase() === (row.name || '').toLowerCase()
    && (e.token || '').toLowerCase() === (row.token || '').toLowerCase()
    && row.at - e.at < windowMs
  ))
  if (dup) return dup
  return addActivity(row)
}

export function listActivity(limit = 40): ActivityEvent[] {
  return load().activity.slice(0, limit)
}

export function setMaintainer(row: VerifiedMaintainer) {
  const s = load()
  const i = s.maintainers.findIndex((m) => m.repoGithubId === row.repoGithubId && m.login === row.login)
  if (i >= 0) s.maintainers[i] = row
  else s.maintainers.unshift(row)
  save()
}

export function maintainerForRepo(owner: string, name: string): VerifiedMaintainer | undefined {
  return load().maintainers.find(
    (m) => m.owner.toLowerCase() === owner.toLowerCase() && m.name.toLowerCase() === name.toLowerCase(),
  )
}

export function setWatch(item: WatchItem) {
  const s = load()
  s.watchlist = s.watchlist.filter((w) => !(
    w.wallet.toLowerCase() === item.wallet.toLowerCase()
    && w.kind === item.kind
    && (item.kind === 'repo' ? w.githubId === item.githubId : w.token?.toLowerCase() === item.token?.toLowerCase())
  ))
  s.watchlist.unshift(item)
  save()
}

export function removeWatch(wallet: string, kind: 'repo' | 'token', key: string) {
  const s = load()
  s.watchlist = s.watchlist.filter((w) => {
    if (w.wallet.toLowerCase() !== wallet.toLowerCase() || w.kind !== kind) return true
    if (kind === 'repo') return String(w.githubId) !== key && `${w.owner}/${w.name}` !== key
    return w.token?.toLowerCase() !== key.toLowerCase()
  })
  save()
}

export function watchesFor(wallet: string): WatchItem[] {
  return load().watchlist.filter((w) => w.wallet.toLowerCase() === wallet.toLowerCase())
}

export function addMarket(row: MarketSnapshot) {
  const s = load()
  const last = s.markets.filter((m) => m.token.toLowerCase() === row.token.toLowerCase()).at(-1)
  if (last && row.at - last.at < 5 * 60_000) return
  s.markets.push(row)
  if (s.markets.length > 4000) s.markets.splice(0, s.markets.length - 4000)
  save()
}

export function marketsFor(token: string, since: number): MarketSnapshot[] {
  return load().markets.filter((m) => m.token.toLowerCase() === token.toLowerCase() && m.at >= since)
}

export function snapshotsFor(githubId: number, since: number): RepositorySnapshot[] {
  return load().snapshots.filter((s) => s.githubId === githubId && s.at >= since)
}

export function noteGithubLimit(remaining: number | null, reset: number | null) {
  const s = load()
  s.health.githubRemaining = remaining
  s.health.githubReset = reset
  s.health.lastGithubAt = Date.now()
  save()
}

export function noteIpfs(error: string | null) {
  const s = load()
  s.health.lastIpfsError = error
  s.health.lastIpfsAt = Date.now()
  save()
}

export function notePons(error: string | null) {
  const s = load()
  s.health.lastPonsError = error
  save()
}

export function recordFunnel(event: string): Record<string, number> {
  const s = load()
  s.funnel = { ...s.funnel, [event]: (s.funnel[event] || 0) + 1 }
  save()
  return s.funnel
}

export function writeIndexerCursor(lastBlock: number, key?: string) {
  const s = load()
  if (lastBlock > s.indexer.lastBlock) s.indexer.lastBlock = lastBlock
  if (key) s.indexer.processed[key] = true
  const keys = Object.keys(s.indexer.processed)
  if (keys.length > 2500) {
    for (const k of keys.slice(0, keys.length - 2000)) delete s.indexer.processed[k]
  }
  save()
}
