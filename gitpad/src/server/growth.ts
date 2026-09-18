import { momentumSignal, weeklyGrowthPct } from '../lib/signal.ts'
import type {
  BoardRange,
  BoardRow,
  DailyPage,
  FeedFilter,
  FeedItem,
  MapCategory,
  PulseStats,
} from '../lib/growthTypes.ts'
import { searchRepos, type ExploreSort, type RepoCard } from './github.ts'
import type { ActivityEvent, StoreShape, TokenRow } from './models.ts'
import { listActivity, readStore, tokensForGithubId, tokensForRepo } from './store.ts'

const DAY = 86_400_000

function startOfUtcDay(at = Date.now()): number {
  const d = new Date(at)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

function channelFor(kind: ActivityEvent['kind']): FeedItem['channel'] {
  switch (kind) {
    case 'token_launched':
    case 'fee_distributed':
      return kind === 'token_launched' ? 'launch' : 'market'
    case 'repo_claimed':
      return 'claim'
    case 'trending_detected':
    case 'rank_moved':
    case 'star_growth':
    case 'release_published':
      return 'github'
    default: {
      const _e: never = kind
      return _e
    }
  }
}

function feedBucket(kind: ActivityEvent['kind']): FeedFilter {
  switch (kind) {
    case 'token_launched':
      return 'launches'
    case 'fee_distributed':
      return 'markets'
    case 'trending_detected':
    case 'rank_moved':
    case 'star_growth':
      return 'trending'
    case 'repo_claimed':
    case 'release_published':
      return 'github'
    default: {
      const _e: never = kind
      return _e
    }
  }
}

export function buildPulse(store: StoreShape): PulseStats {
  const start = startOfUtcDay()
  const dayAgo = Date.now() - DAY
  const tokenized = new Set(store.tokens.map((t) => `${t.owner}/${t.name}`.toLowerCase()))
  const trending = new Set(
    store.activity
      .filter((e) => (
        e.at >= dayAgo
        && (e.kind === 'trending_detected' || e.kind === 'star_growth' || e.kind === 'rank_moved')
        && e.owner
        && e.name
      ))
      .map((e) => `${e.owner}/${e.name}`.toLowerCase()),
  )
  const launchesToday = Math.max(
    store.activity.filter((e) => e.at >= start && e.kind === 'token_launched').length,
    store.tokens.filter((t) => t.deployedAt >= start).length,
    store.deployments.filter((d) => d.at >= start && d.status === 'success').length,
  )
  return {
    repositoriesTracked: store.repositories.length,
    trendingToday: trending.size,
    tokenizedRepositories: tokenized.size,
    launchesToday,
    generatedAt: Date.now(),
    source: 'indexed store',
    note: '',
  }
}

export function buildFeed(store: StoreShape, filter: FeedFilter): FeedItem[] {
  const fromActivity: FeedItem[] = store.activity.map((e) => ({
    id: e.id,
    channel: channelFor(e.kind),
    filter: feedBucket(e.kind),
    at: e.at,
    title: e.title,
    body: e.body,
    href: e.href,
    owner: e.owner,
    name: e.name,
    token: e.token,
    tokenized: Boolean(e.token),
  }))
  const fromMarkets: FeedItem[] = store.markets.slice(-24).map((m) => {
    const tok = store.tokens.find((t) => t.address.toLowerCase() === m.token.toLowerCase())
    return {
      id: `mkt-${m.token}-${m.at}`,
      channel: 'market' as const,
      filter: 'markets' as const,
      at: m.at,
      title: tok ? `${tok.displayName} $${tok.symbol} snapshot` : `${m.token.slice(0, 10)}… snapshot`,
      body: m.capRblx ? `Cap ${m.capRblx}` : 'Market snapshot recorded',
      href: `/token/${m.token}`,
      token: m.token,
      owner: tok?.owner,
      name: tok?.name,
      tokenized: true,
    }
  })
  const items = [...fromActivity, ...fromMarkets].sort((a, b) => b.at - a.at)
  if (filter === 'all') return items.slice(0, 80)
  if (filter === 'github') return items.filter((i) => i.channel === 'github' || i.channel === 'claim').slice(0, 80)
  if (filter === 'markets') return items.filter((i) => i.filter === 'markets' || i.channel === 'market').slice(0, 80)
  if (filter === 'launches') return items.filter((i) => i.filter === 'launches').slice(0, 80)
  return items.filter((i) => i.filter === 'trending').slice(0, 80)
}

function latestCap(store: StoreShape, token: string): string | null {
  const rows = store.markets.filter((m) => m.token.toLowerCase() === token.toLowerCase())
  return rows.at(-1)?.capRblx ?? null
}

function tokenMomentumLine(store: StoreShape, token: TokenRow | null): string {
  if (!token) return 'No GitPad token — repository momentum only'
  const rows = store.markets.filter((m) => m.token.toLowerCase() === token.address.toLowerCase())
  if (rows.length < 2) return 'Token market: no comparable snapshots yet'
  const a = Number(rows[0].capRblx)
  const b = Number(rows[rows.length - 1].capRblx)
  if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0) return 'Token market: snapshots incomplete'
  const pct = ((b - a) / a) * 100
  return `Token cap change ${pct >= 0 ? '+' : ''}${pct.toFixed(1)}% across indexed snapshots`
}

export function toBoardRow(repo: RepoCard, store: StoreShape): BoardRow {
  const token = tokensForGithubId(repo.id)[0] || tokensForRepo(repo.owner, repo.name)[0] || null
  const signal = momentumSignal({
    stars: repo.stars,
    stars24h: repo.stars24h,
    stars7d: repo.stars7d,
    forks: repo.forks,
    pushedAt: repo.pushedAt,
    createdAt: repo.createdAt,
    trendScore: repo.trendScore,
  })
  return {
    rank: repo.rank,
    repo,
    weeklyGrowth: weeklyGrowthPct(repo.stars, repo.stars7d),
    signal: signal.level,
    token,
    capRblx: token ? latestCap(store, token.address) : null,
    volume: null,
    holders: null,
    tokenMomentum: tokenMomentumLine(store, token),
  }
}

function boardSort(range: BoardRange): ExploreSort {
  switch (range) {
    case 'now': return 'trending'
    case '24H': return 'today'
    case '7D': return 'growing'
    case '30D': return 'growing'
    default: {
      const _e: never = range
      return _e
    }
  }
}

export async function buildBoard(range: BoardRange, page = 1): Promise<BoardRow[]> {
  const store = readStore()
  const repos = await searchRepos(boardSort(range), undefined, page)
  const rows = repos.map((repo) => toBoardRow(repo, store))
  if (range === '24H') rows.sort((a, b) => (b.repo.stars24h ?? -1) - (a.repo.stars24h ?? -1))
  if (range === '7D') rows.sort((a, b) => (b.repo.stars7d ?? b.repo.trendScore) - (a.repo.stars7d ?? a.repo.trendScore))
  if (range === '30D') rows.sort((a, b) => b.repo.trendScore - a.repo.trendScore)
  return rows.map((row, i) => ({ ...row, rank: (page - 1) * 24 + i + 1 }))
}

export async function buildFirst(page = 1): Promise<BoardRow[]> {
  const store = readStore()
  const repos = await searchRepos('trending', undefined, page)
  return repos
    .filter((r) => r.tokenStatus !== 'live')
    .map((repo, i) => ({ ...toBoardRow(repo, store), rank: (page - 1) * 24 + i + 1 }))
}

function mapQuery(cat: MapCategory): { sort: ExploreSort; q?: string } {
  switch (cat) {
    case 'ai': return { sort: 'ai' }
    case 'devtools': return { sort: 'devtools' }
    case 'crypto': return { sort: 'crypto' }
    case 'gaming': return { sort: 'gaming' }
    case 'infrastructure': return { sort: 'starred', q: 'topic:infrastructure' }
    case 'agents': return { sort: 'ai', q: 'agent' }
    case 'consumer': return { sort: 'starred', q: 'topic:frontend OR topic:mobile' }
    case 'other': return { sort: 'trending' }
    default: {
      const _e: never = cat
      return _e
    }
  }
}

export async function buildMap(cat: MapCategory): Promise<{ repo: RepoCard; token: TokenRow | null }[]> {
  const { sort, q } = mapQuery(cat)
  const repos = await searchRepos(sort, q, 1)
  return repos.map((repo) => ({
    repo,
    token: tokensForGithubId(repo.id)[0] || tokensForRepo(repo.owner, repo.name)[0] || null,
  }))
}

export function buildDaily(store: StoreShape, trending: RepoCard[]): DailyPage {
  const start = startOfUtcDay()
  const now = new Date()
  const dateLabel = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
  const isoDate = now.toISOString().slice(0, 10)
  const first = trending.filter((r) => r.tokenStatus !== 'live')
  const launched = store.tokens.filter((t) => t.deployedAt >= start)
  const watchCounts = new Map<string, number>()
  for (const w of store.watchlist) {
    if (w.kind !== 'repo' || !w.owner || !w.name) continue
    const key = `${w.owner}/${w.name}`
    watchCounts.set(key, (watchCounts.get(key) || 0) + 1)
  }
  const watched = [...watchCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
  const moves = new Map<string, { first: number; last: number; token: TokenRow }>()
  for (const m of store.markets) {
    const cap = Number(m.capRblx)
    if (!Number.isFinite(cap)) continue
    const tok = store.tokens.find((t) => t.address.toLowerCase() === m.token.toLowerCase())
    if (!tok) continue
    const cur = moves.get(m.token.toLowerCase())
    if (!cur) moves.set(m.token.toLowerCase(), { first: cap, last: cap, token: tok })
    else cur.last = cap
  }
  const biggest = [...moves.values()]
    .filter((m) => m.first > 0 && m.last !== m.first)
    .sort((a, b) => Math.abs(b.last - b.first) / b.first - Math.abs(a.last - a.first) / a.first)
    .slice(0, 8)

  return {
    dateLabel,
    isoDate,
    note: '',
    sections: [
      {
        id: 'top',
        title: 'TOP REPOSITORIES',
        empty: 'No trending repositories yet.',
        lines: trending.slice(0, 10).map((r, i) => ({
          rank: i + 1,
          label: r.fullName,
          meta: `Trend ${r.trendScore} · ${r.stars.toLocaleString('en-US')} stars`,
          href: `/repo/${r.owner}/${r.name}`,
        })),
      },
      {
        id: 'fast',
        title: 'FASTEST GROWING',
        empty: 'No 7-day star deltas yet.',
        lines: [...trending]
          .filter((r) => r.stars7d != null)
          .sort((a, b) => (b.stars7d || 0) - (a.stars7d || 0))
          .slice(0, 8)
          .map((r, i) => ({
            rank: i + 1,
            label: r.fullName,
            meta: `+${(r.stars7d || 0).toLocaleString('en-US')} stars / 7D`,
            href: `/repo/${r.owner}/${r.name}`,
          })),
      },
      {
        id: 'new',
        title: 'NEWLY TOKENIZED',
        empty: 'No launches today.',
        lines: launched.map((t, i) => ({
          rank: i + 1,
          label: `${t.owner}/${t.name}`,
          meta: `${t.displayName} $${t.symbol}`,
          href: `/token/${t.address}`,
        })),
      },
      {
        id: 'moves',
        title: 'BIGGEST TOKEN MOVES',
        empty: 'No token moves yet.',
        lines: biggest.map((m, i) => {
          const pct = ((m.last - m.first) / m.first) * 100
          return {
            rank: i + 1,
            label: `${m.token.displayName} $${m.token.symbol}`,
            meta: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}% cap across snapshots`,
            href: `/token/${m.token.address}`,
          }
        }),
      },
      {
        id: 'watched',
        title: 'MOST WATCHED',
        empty: 'No watches yet.',
        lines: watched.map(([label, n], i) => ({
          rank: i + 1,
          label,
          meta: `${n} watch${n === 1 ? '' : 'es'}`,
          href: `/repo/${label}`,
        })),
      },
      {
        id: 'first',
        title: 'STILL UNTOKENIZED',
        empty: 'No untokenized repositories in this window.',
        lines: first.slice(0, 8).map((r, i) => ({
          rank: i + 1,
          label: r.fullName,
          meta: 'NOT YET TOKENIZED',
          href: `/launch?repo=${encodeURIComponent(r.fullName)}`,
        })),
      },
    ],
  }
}

export async function composeDaily(): Promise<DailyPage> {
  const trending = await searchRepos('trending').catch(() => [] as RepoCard[])
  return buildDaily(readStore(), trending)
}

export function liveEvents(): ActivityEvent[] {
  return listActivity(24)
}
