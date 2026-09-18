import {
  addActivityOnce, addSnapshot, noteGithubLimit, tokensForGithubId, upsertRepository,
} from './store.ts'

export type ExploreSort =
  | 'trending'
  | 'new'
  | 'starred'
  | 'growing'
  | 'forked'
  | 'today'
  | 'ai'
  | 'crypto'
  | 'devtools'
  | 'gaming'
  | 'rising'

export type TokenStatus = 'none' | 'live' | 'available'

export type RepoCard = {
  id: number
  owner: string
  name: string
  fullName: string
  description: string
  language: string | null
  stars: number
  forks: number
  watchers: number
  openIssues: number
  createdAt: string
  updatedAt: string
  pushedAt: string
  htmlUrl: string
  avatarUrl: string
  topics: string[]
  rank: number
  recentGrowth: number | null
  growthLabel: string
  stars24h: number | null
  stars7d: number | null
  contributorEstimate: number | null
  trendScore: number
  tokenStatus: TokenStatus
  archived: boolean
  fork: boolean
  mirror: boolean
  parentFullName: string | null
}

export type Contributor = {
  login: string
  avatarUrl: string
  contributions: number
  htmlUrl: string
}

export type WeekActivity = { week: number; total: number }

export type Commit = {
  sha: string
  message: string
  date: string
  author: string
  htmlUrl: string
}

export type LatestRelease = {
  tag: string
  name: string
  publishedAt: string
}

export type RepoDetail = RepoCard & {
  homepage: string | null
  defaultBranch: string
  license: string | null
  subscribers: number
  size: number
  languages: { name: string; bytes: number }[]
  contributors: Contributor[]
  commits: Commit[]
  readme: string
  commitActivity: WeekActivity[]
  latestRelease: LatestRelease | null
  renamedFrom: string | null
  disabled: boolean
}

type CacheRow = { at: number; value: unknown }
const cache = new Map<string, CacheRow>()

function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < ttlMs) return Promise.resolve(hit.value as T)
  return load().then((value) => {
    cache.set(key, { at: Date.now(), value })
    return value
  })
}

export function isRepoSlug(value: string): boolean {
  return /^[A-Za-z0-9_.-]+$/.test(value) && value !== '.' && value !== '..'
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

function queryFor(sort: ExploreSort): { q: string; sort: string; order: string } {
  switch (sort) {
    case 'trending':
      return { q: `created:>${daysAgo(7)} stars:>10`, sort: 'stars', order: 'desc' }
    case 'new':
      return { q: `created:>${daysAgo(3)}`, sort: 'updated', order: 'desc' }
    case 'starred':
      return { q: 'stars:>1000', sort: 'stars', order: 'desc' }
    case 'growing':
      return { q: `created:>${daysAgo(30)} stars:>50`, sort: 'stars', order: 'desc' }
    case 'forked':
      return { q: `forks:>200 created:>${daysAgo(365)}`, sort: 'forks', order: 'desc' }
    case 'today':
      return { q: `created:>${daysAgo(1)} stars:>5`, sort: 'stars', order: 'desc' }
    case 'ai':
      return { q: `topic:ai stars:>20 pushed:>${daysAgo(21)}`, sort: 'stars', order: 'desc' }
    case 'crypto':
      return { q: `topic:cryptocurrency stars:>20 pushed:>${daysAgo(30)}`, sort: 'stars', order: 'desc' }
    case 'devtools':
      return { q: `topic:developer-tools stars:>20 pushed:>${daysAgo(30)}`, sort: 'stars', order: 'desc' }
    case 'gaming':
      return { q: `topic:game-development stars:>20 pushed:>${daysAgo(45)}`, sort: 'stars', order: 'desc' }
    case 'rising':
      return { q: `created:>${daysAgo(14)} stars:>20`, sort: 'stars', order: 'desc' }
    default: {
      const _e: never = sort
      return _e
    }
  }
}

function ageDays(iso: string): number {
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return 1
  return Math.max(1, Math.round((Date.now() - t) / 86_400_000))
}

function growthFor(sort: ExploreSort, stars: number, createdAt: string): { recentGrowth: number | null; growthLabel: string } {
  const age = ageDays(createdAt)
  switch (sort) {
    case 'trending':
    case 'rising':
      return { recentGrowth: stars, growthLabel: 'stars this window' }
    case 'new':
    case 'today':
      return { recentGrowth: stars, growthLabel: 'stars since create' }
    case 'growing':
      return { recentGrowth: Math.round(stars / age), growthLabel: 'stars / day' }
    case 'forked':
      return { recentGrowth: null, growthLabel: 'fork ranking' }
    case 'starred':
    case 'ai':
    case 'crypto':
    case 'devtools':
    case 'gaming':
      return { recentGrowth: age <= 30 ? Math.round(stars / age) : null, growthLabel: age <= 30 ? 'stars / day' : 'lifetime' }
    default: {
      const _e: never = sort
      return _e
    }
  }
}

export function trendScore(input: {
  stars: number
  forks: number
  openIssues: number
  createdAt: string
  pushedAt: string
  stars7d: number | null
  commitsWeek: number
}): number {
  const age = ageDays(input.createdAt)
  const quiet = ageDays(input.pushedAt)
  const daily = input.stars7d != null ? input.stars7d / 7 : (age <= 14 ? input.stars / Math.max(age, 1) : 0)
  const starV = Math.min(42, Math.log10(daily + 1) * 18)
  const forkV = Math.min(16, Math.log10(input.forks / Math.max(age, 1) + 1) * 14)
  const recency = Math.max(0, 18 - Math.min(quiet, 18))
  const youth = age < 21 ? 12 : age < 90 ? 6 : 2
  const issues = Math.min(8, input.openIssues * 0.03)
  const commits = Math.min(12, input.commitsWeek * 0.15)
  const size = Math.min(10, Math.log10(input.stars + 1) * 2.2)
  return Math.max(1, Math.min(99, Math.round(starV + forkV + recency + youth + issues + commits + size)))
}

type GhRepo = {
  id: number
  name: string
  full_name: string
  description: string | null
  language: string | null
  stargazers_count: number
  forks_count: number
  watchers_count?: number
  open_issues_count: number
  created_at: string
  updated_at: string
  pushed_at: string
  html_url: string
  homepage?: string | null
  default_branch?: string
  size?: number
  subscribers_count?: number
  topics?: string[]
  archived?: boolean
  disabled?: boolean
  fork?: boolean
  mirror_url?: string | null
  parent?: { full_name?: string } | null
  owner?: { login: string; avatar_url: string; id?: number }
  license?: { spdx_id?: string; name?: string } | null
}

function toCard(repo: GhRepo, rank: number, sort: ExploreSort, tokenStatus: TokenStatus = 'none'): RepoCard {
  const owner = repo.owner?.login || repo.full_name.split('/')[0] || ''
  const growth = growthFor(sort, repo.stargazers_count, repo.created_at)
  const age = ageDays(repo.created_at)
  const stars24h = sort === 'today' || age <= 1 ? repo.stargazers_count : growth.recentGrowth != null && age <= 7
    ? Math.round(growth.recentGrowth / Math.max(age, 1))
    : null
  const score = trendScore({
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    openIssues: repo.open_issues_count,
    createdAt: repo.created_at,
    pushedAt: repo.pushed_at,
    stars7d: age <= 7 ? repo.stargazers_count : null,
    commitsWeek: 0,
  })
  return {
    id: repo.id,
    owner,
    name: repo.name,
    fullName: repo.full_name,
    description: repo.description || '',
    language: repo.language,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    watchers: repo.watchers_count ?? repo.stargazers_count,
    openIssues: repo.open_issues_count,
    createdAt: repo.created_at,
    updatedAt: repo.updated_at,
    pushedAt: repo.pushed_at,
    htmlUrl: repo.html_url,
    avatarUrl: repo.owner?.avatar_url || `https://github.com/${owner}.png`,
    topics: repo.topics ?? [],
    rank,
    recentGrowth: growth.recentGrowth,
    growthLabel: growth.growthLabel,
    stars24h,
    stars7d: age <= 7 ? repo.stargazers_count : null,
    contributorEstimate: null,
    trendScore: score,
    tokenStatus,
    archived: Boolean(repo.archived),
    fork: Boolean(repo.fork),
    mirror: Boolean(repo.mirror_url),
    parentFullName: repo.parent?.full_name || null,
  }
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function gh(
  path: string,
  init: { accept?: string; raw?: boolean } = {},
): Promise<{ status: number; json: unknown; text: string; headers: Headers }> {
  const headers: Record<string, string> = {
    accept: init.accept || 'application/vnd.github+json',
    'user-agent': 'GitPad/1.0',
    'x-github-api-version': '2022-11-28',
  }
  const token = process.env.GITHUB_TOKEN?.trim()
  if (token) headers.authorization = `Bearer ${token}`
  const res = await fetch(`https://api.github.com${path}`, { headers })
  const text = await res.text()
  const remainingRaw = res.headers.get('x-ratelimit-remaining')
  const resetRaw = res.headers.get('x-ratelimit-reset')
  const remaining = remainingRaw == null ? null : Number(remainingRaw)
  const reset = resetRaw == null ? null : Number(resetRaw)
  noteGithubLimit(
    remaining != null && Number.isFinite(remaining) ? remaining : null,
    reset != null && Number.isFinite(reset) ? reset * 1000 : null,
  )
  if (res.status === 429 || (res.status === 403 && (remaining === 0 || /rate limit/i.test(text)))) {
    throw new ApiError(429, 'GitHub rate limit. Add GITHUB_TOKEN or wait a minute.')
  }
  if (res.status === 403) {
    throw new ApiError(403, 'This repository is private or blocked.')
  }
  if (!res.ok && res.status !== 202) {
    if (res.status === 404) throw new ApiError(404, 'Repository not found')
    throw new ApiError(res.status, text.slice(0, 180) || `GitHub ${res.status}`)
  }
  let json: unknown = null
  if (!init.raw) {
    try { json = text ? JSON.parse(text) as unknown : null } catch { json = null }
  }
  return { status: res.status, json, text, headers: res.headers }
}

export async function searchRepos(sort: ExploreSort, q?: string, page = 1): Promise<RepoCard[]> {
  const key = `search:${sort}:${q || ''}:${page}`
  return cached(key, 180_000, async () => {
    const built = queryFor(sort)
    const query = (q || '').trim() ? `${built.q} ${q!.trim()}` : built.q
    const params = new URLSearchParams({
      q: query,
      sort: built.sort,
      order: built.order,
      per_page: '24',
      page: String(Math.max(1, page)),
    })
    const { json } = await gh(`/search/repositories?${params}`)
    const items = (json as { items?: GhRepo[] } | null)?.items ?? []
    const ranked = items.map((repo, i) => {
      const live = tokensForGithubId(repo.id).some((t) => t.kind === 'canonical' || t.kind === 'community')
      return toCard(repo, (page - 1) * 24 + i + 1, sort, live ? 'live' : 'available')
    })
    ranked.sort((a, b) => b.trendScore - a.trendScore || b.stars - a.stars)
    const out = ranked.map((row, i) => ({ ...row, rank: (page - 1) * 24 + i + 1 }))
    if (page === 1) {
      for (const row of out.slice(0, 3)) {
        if (row.trendScore < 40) continue
        addActivityOnce({
          kind: 'trending_detected',
          at: Date.now(),
          title: `${row.fullName} is moving`,
          body: `GitPad Trend Score ${row.trendScore} · ${row.stars.toLocaleString()} stars`,
          owner: row.owner,
          name: row.name,
          href: `/repo/${row.owner}/${row.name}`,
        })
      }
    }
    return out
  })
}

function lastPage(link: string | null): number {
  if (!link) return 1
  const last = link.split(',').map((p) => p.trim()).find((p) => p.includes('rel="last"'))
  const m = last?.match(/[?&]page=(\d+)/)
  return m ? Number(m[1]) : 1
}

async function starsLast7d(owner: string, name: string): Promise<number | null> {
  return cached(`stars7:${owner}/${name}`, 300_000, async () => {
    const first = await gh(`/repos/${owner}/${name}/stargazers?per_page=100`, {
      accept: 'application/vnd.github.star+json',
    })
    const page = lastPage(first.headers.get('link'))
    const last = page <= 1 ? first : await gh(`/repos/${owner}/${name}/stargazers?per_page=100&page=${page}`, {
      accept: 'application/vnd.github.star+json',
    })
    const rows = (last.json as { starred_at?: string }[] | null) ?? []
    const since = Date.now() - 7 * 86_400_000
    return rows.filter((r) => r.starred_at && Date.parse(r.starred_at) >= since).length
  })
}

async function commitActivity(owner: string, name: string): Promise<WeekActivity[]> {
  return cached(`act:${owner}/${name}`, 300_000, async () => {
    let res = await gh(`/repos/${owner}/${name}/stats/commit_activity`)
    if (res.status === 202) {
      await new Promise((r) => setTimeout(r, 900))
      res = await gh(`/repos/${owner}/${name}/stats/commit_activity`)
    }
    const raw = (res.json as { week?: number; total?: number }[] | null) ?? []
    return raw.map((w) => ({ week: Number(w.week || 0), total: Number(w.total || 0) }))
  })
}

export async function readRepo(owner: string, name: string): Promise<RepoDetail> {
  if (!isRepoSlug(owner) || !isRepoSlug(name)) throw new ApiError(400, 'Bad repository slug')
  return cached(`repo:${owner}/${name}`, 180_000, async () => {
    const [core, langs, contrib, readmeRes, commitRes, releaseRes] = await Promise.all([
      gh(`/repos/${owner}/${name}`),
      gh(`/repos/${owner}/${name}/languages`).catch(() => ({ json: {} })),
      gh(`/repos/${owner}/${name}/contributors?per_page=12`).catch(() => ({ json: [] })),
      gh(`/repos/${owner}/${name}/readme`, { accept: 'application/vnd.github.raw+json', raw: true }).catch(() => ({ text: '' })),
      gh(`/repos/${owner}/${name}/commits?per_page=8`).catch(() => ({ json: [] })),
      gh(`/repos/${owner}/${name}/releases?per_page=1`).catch(() => ({ json: [] })),
    ])
    const repo = core.json as GhRepo
    if (!repo?.full_name) throw new ApiError(404, 'Repository not found')
    const langMap = (langs.json as Record<string, number> | null) ?? {}
    const languages = Object.entries(langMap)
      .map(([n, bytes]) => ({ name: n, bytes }))
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 6)
    const contributors = ((contrib.json as { login?: string; avatar_url?: string; contributions?: number; html_url?: string }[] | null) ?? [])
      .filter((c) => c.login)
      .map((c) => ({
        login: c.login!,
        avatarUrl: c.avatar_url || '',
        contributions: c.contributions || 0,
        htmlUrl: c.html_url || `https://github.com/${c.login}`,
      }))
    const commits = ((commitRes.json as {
      sha?: string
      html_url?: string
      commit?: { message?: string; author?: { date?: string; name?: string }; committer?: { date?: string } }
      author?: { login?: string }
    }[] | null) ?? []).map((c) => ({
      sha: (c.sha || '').slice(0, 7),
      message: (c.commit?.message || '').split('\n')[0] || 'commit',
      date: c.commit?.author?.date || c.commit?.committer?.date || '',
      author: c.author?.login || c.commit?.author?.name || 'unknown',
      htmlUrl: c.html_url || '',
    }))
    const [activity, weekStars] = await Promise.all([
      commitActivity(owner, name).catch(() => [] as WeekActivity[]),
      starsLast7d(owner, name).catch(() => null),
    ])
    const live = tokensForGithubId(repo.id).length > 0
    const commitsWeek = activity.slice(-1)[0]?.total ?? 0
    const card = toCard(repo, 1, 'starred', live ? 'live' : 'available')
    const requested = `${owner}/${name}`.toLowerCase()
    const canonical = repo.full_name.toLowerCase()
    const releaseRow = ((releaseRes.json as { name?: string; tag_name?: string; published_at?: string }[] | null) ?? [])[0]
    const latestRelease = releaseRow?.tag_name || releaseRow?.name
      ? {
          tag: releaseRow.tag_name || releaseRow.name || '',
          name: releaseRow.name || releaseRow.tag_name || '',
          publishedAt: releaseRow.published_at || '',
        }
      : null
    const detail: RepoDetail = {
      ...card,
      trendScore: trendScore({
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        openIssues: repo.open_issues_count,
        createdAt: repo.created_at,
        pushedAt: repo.pushed_at,
        stars7d: weekStars,
        commitsWeek,
      }),
      stars7d: weekStars,
      stars24h: weekStars == null ? card.stars24h : Math.round(weekStars / 7),
      recentGrowth: weekStars,
      growthLabel: 'stars / 7d',
      contributorEstimate: contributors.length,
      homepage: repo.homepage || null,
      defaultBranch: repo.default_branch || 'main',
      license: repo.license?.spdx_id || repo.license?.name || null,
      subscribers: repo.subscribers_count ?? 0,
      size: repo.size ?? 0,
      languages,
      contributors,
      commits,
      readme: readmeRes.text || '',
      commitActivity: activity,
      latestRelease,
      renamedFrom: requested !== canonical ? `${owner}/${name}` : null,
      disabled: Boolean(repo.disabled),
    }
    upsertRepository({
      githubId: repo.id,
      owner: detail.owner,
      name: detail.name,
      fullName: detail.fullName,
      htmlUrl: detail.htmlUrl,
      description: detail.description,
      language: detail.language,
      archived: detail.archived,
      fork: detail.fork,
      mirror: detail.mirror,
      parentFullName: detail.parentFullName,
      renamedFrom: detail.renamedFrom,
      lastSeenAt: Date.now(),
    })
    addSnapshot({
      githubId: repo.id,
      at: Date.now(),
      stars: detail.stars,
      forks: detail.forks,
      watchers: detail.subscribers || detail.watchers,
      openIssues: detail.openIssues,
      contributors: contributors.length,
      commitsWeek,
      stars7d: weekStars,
    })
    if (weekStars != null && weekStars >= 200) {
      addActivityOnce({
        kind: 'star_growth',
        at: Date.now(),
        title: `${detail.fullName} gained +${weekStars.toLocaleString()} stars in 7d`,
        body: 'Repository is moving on GitHub.',
        owner: detail.owner,
        name: detail.name,
        href: `/repo/${detail.owner}/${detail.name}`,
      })
    }
    const published = latestRelease?.publishedAt ? Date.parse(latestRelease.publishedAt) : NaN
    if (Number.isFinite(published) && Date.now() - published < 14 * 86_400_000) {
      addActivityOnce({
        kind: 'release_published',
        at: published,
        title: `${detail.fullName} released ${latestRelease?.tag || latestRelease?.name || 'a version'}`,
        body: 'New GitHub release in the last 14 days.',
        owner: detail.owner,
        name: detail.name,
        href: `/repo/${detail.owner}/${detail.name}`,
      }, 14 * 86_400_000)
    }
    return detail
  })
}

export type Remembered = {
  token: string
  owner: string
  name: string
  symbol?: string
  at: number
  githubId?: number
  txHash?: string
  deployer?: string
}

const remembered: Remembered[] = []

export function listRemembered(): Remembered[] {
  return remembered
}

export function rememberLaunch(row: Remembered): Remembered[] {
  const k = row.token.toLowerCase()
  const next = remembered.filter((r) => r.token.toLowerCase() !== k)
  remembered.splice(0, remembered.length, { ...row, at: Date.now() }, ...next)
  return remembered
}
