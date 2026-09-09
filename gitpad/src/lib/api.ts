import type { ExploreSort as GhSort, RepoCard, RepoDetail, Remembered } from '../server/github.ts'
import type { ActivityEvent, TokenRow, VerifiedMaintainer, WatchItem } from '../server/models.ts'
import type { SearchHit } from '../server/search.ts'
import type {
  BoardRange,
  BoardRow,
  DailyPage,
  FeedFilter,
  FeedItem,
  MapCategory,
  PulseStats,
} from './growthTypes.ts'

export type { RepoCard, RepoDetail, Remembered, ActivityEvent, TokenRow, SearchHit, WatchItem, VerifiedMaintainer }
export type { GhSort as ExploreSort }
export type { BoardRange, BoardRow, DailyPage, FeedFilter, FeedItem, MapCategory, PulseStats }

const UNREACHABLE = 'GitPad API is unreachable.'

function isNetworkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /Failed to fetch|\bNetworkError\b|\bLoad failed\b|network request failed/i.test(message)
}

async function parseApi<T>(res: Response): Promise<{ error?: string } & T> {
  const type = res.headers.get('content-type') || ''
  if (type.includes('text/html')) {
    if (res.status === 401 || res.status === 403 || res.redirected) {
      throw new Error('This deployment is behind Vercel Authentication.')
    }
    throw new Error(UNREACHABLE)
  }
  return await res.json().catch(() => ({})) as { error?: string } & T
}

async function get<T>(path: string): Promise<T> {
  const run = async () => {
    const res = await fetch(path, { headers: { accept: 'application/json' } })
    const json = await parseApi<T>(res)
    if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`)
    return json
  }
  try {
    return await run()
  } catch (error) {
    if (!isNetworkError(error) && !(error instanceof Error && error.message === UNREACHABLE)) throw error
    await new Promise((resolve) => setTimeout(resolve, 400))
    try {
      return await run()
    } catch (retryError) {
      if (isNetworkError(retryError)) throw new Error(UNREACHABLE)
      throw retryError
    }
  }
}

export async function fetchRepos(sort: GhSort, q?: string, page = 1): Promise<RepoCard[]> {
  const qs = new URLSearchParams({ sort, page: String(page) })
  if (q?.trim()) qs.set('q', q.trim())
  const data = await get<{ repos: RepoCard[] }>(`/api/repos/search?${qs}`)
  if (!Array.isArray(data.repos)) throw new Error('Repository list was empty or invalid.')
  return data.repos
}

export async function fetchRepo(owner: string, name: string): Promise<RepoDetail> {
  const qs = new URLSearchParams({ owner, name })
  const data = await get<{ repo: RepoDetail }>(`/api/repo?${qs}`)
  return data.repo
}

export async function fetchRepoBundle(owner: string, name: string) {
  const qs = new URLSearchParams({ owner, name })
  return get<{ repo: RepoDetail; tokens: TokenRow[]; verified: VerifiedMaintainer | null }>(`/api/repo?${qs}`)
}

export async function fetchRemembered(owner?: string, name?: string): Promise<Remembered[]> {
  const qs = new URLSearchParams()
  if (owner && name) {
    qs.set('owner', owner)
    qs.set('name', name)
  }
  const suffix = qs.toString() ? `?${qs}` : ''
  const data = await get<{ tokens: Remembered[] }>(`/api/tokens${suffix}`)
  return data.tokens
}

export async function rememberRemote(row: Remembered & {
  githubId?: number
  txHash?: string
  metadataURI?: string
  ipfsCid?: string
  deployer?: string
}): Promise<void> {
  await fetch('/api/tokens', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(row),
  }).catch(() => {})
}

export async function searchGitPad(q: string) {
  return get<{ hits: SearchHit[] }>(`/api/search?q=${encodeURIComponent(q)}`)
}

export async function fetchActivity() {
  return get<{ events: ActivityEvent[] }>('/api/activity')
}

export async function fetchAnalytics(input: { githubId?: number; token?: string; range: string }) {
  const qs = new URLSearchParams({ range: input.range })
  if (input.githubId) qs.set('githubId', String(input.githubId))
  if (input.token) qs.set('token', input.token)
  return get<{ repo: { at: number; stars: number; forks: number; commitsWeek: number }[]; market: { at: number; priceRblx: string | null; capRblx: string | null }[]; note: string }>(`/api/analytics?${qs}`)
}

export async function fetchWatch(wallet: string) {
  return get<{ items: WatchItem[] }>(`/api/watch?wallet=${wallet}`)
}

export async function saveWatch(body: Record<string, unknown>) {
  const res = await fetch('/api/watch', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json() as { items?: WatchItem[]; error?: string }
  if (!res.ok) throw new Error(json.error || 'Watch failed')
  return json.items || []
}

export async function startGithubOAuth(owner: string, name: string, wallet: string) {
  const qs = new URLSearchParams({ owner, name, wallet, origin: location.origin })
  return get<{ configured: boolean; url?: string; error?: string }>(`/api/oauth/github/start?${qs}`)
}

export async function exchangeGithubOAuth(body: { code: string; owner: string; name: string; wallet: string }) {
  const res = await fetch('/api/oauth/github/exchange', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json() as { maintainer?: VerifiedMaintainer; error?: string }
  if (!res.ok) throw new Error(json.error || 'Claim failed')
  return json.maintainer
}

export async function setTreasury(body: { owner: string; name: string; wallet: string; treasury: string }) {
  const res = await fetch('/api/claim/treasury', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json() as { maintainer?: VerifiedMaintainer; error?: string }
  if (!res.ok) throw new Error(json.error || 'Treasury failed')
  return json.maintainer
}

export async function fetchHealth() {
  return get<{ integrations: Record<string, boolean>; ponsNote: string; health: Record<string, unknown>; counts: Record<string, number> }>('/api/health')
}

export async function reportMarket(body: {
  token: string
  priceRblx?: string | null
  capRblx?: string | null
  quoteReserve?: string
  graduated?: boolean
}) {
  await fetch('/api/market', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => {})
}

export async function fetchAdmin(wallet: string) {
  return get<{
    health: {
      githubRemaining: number | null
      githubReset: number | null
      lastGithubAt: number | null
      lastIpfsError: string | null
      lastIpfsAt: number | null
      lastPonsError: string | null
    }
    deployments: { txHash: string; token: string; status: string; error?: string; at: number }[]
    failed: { txHash: string; token: string; status: string; error?: string; at: number }[]
    mappings: TokenRow[]
    repositories: { githubId: number; owner: string; name: string; archived: boolean; fork: boolean }[]
    feeRoutes: unknown[]
    feeDistributions: unknown[]
    activity: ActivityEvent[]
    integrations: Record<string, boolean>
    ponsNote: string
  }>(`/api/admin?wallet=${wallet}`)
}

export async function fetchPulse() {
  return get<PulseStats>('/api/pulse')
}

export async function fetchFeed(filter: FeedFilter = 'all') {
  return get<{ filter: FeedFilter; events: FeedItem[] }>(`/api/feed?filter=${filter}`)
}

export async function fetchBoard(range: BoardRange = 'now', page = 1) {
  return get<{ range: BoardRange; page: number; rows: BoardRow[] }>(`/api/board?range=${range}&page=${page}`)
}

export async function fetchFirst(page = 1) {
  return get<{ page: number; rows: BoardRow[] }>(`/api/first?page=${page}`)
}

export async function fetchDaily() {
  return get<DailyPage>('/api/daily')
}

export async function fetchMap(cat: MapCategory) {
  return get<{ cat: MapCategory; rows: { repo: RepoCard; token: TokenRow | null }[] }>(`/api/map?cat=${cat}`)
}
