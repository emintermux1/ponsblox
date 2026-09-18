import { isAddress } from 'viem'
import { parseGithubInput } from '../lib/naming.ts'
import { readRepo, searchRepos, type RepoCard } from './github.ts'
import type { TokenRow, VerifiedMaintainer } from './models.ts'
import { maintainerForRepo, readStore } from './store.ts'

export type SearchHit =
  | { kind: 'repo'; repo: RepoCard; launchAvailable: boolean; maintainer: VerifiedMaintainer | null }
  | { kind: 'token'; token: TokenRow; maintainer: VerifiedMaintainer | null }
  | { kind: 'owner'; login: string; repos: number }
  | { kind: 'contract'; address: string; token: TokenRow | null }

function withMaintainer(owner: string, name: string) {
  return maintainerForRepo(owner, name) || null
}

export async function searchGitPad(q: string): Promise<SearchHit[]> {
  const query = q.trim().replace(/^\$/, '')
  if (!query) return []
  const hits: SearchHit[] = []
  const store = readStore()

  if (isAddress(query)) {
    const token = store.tokens.find((r) => r.address.toLowerCase() === query.toLowerCase()) || null
    if (token) {
      hits.push({ kind: 'token', token, maintainer: withMaintainer(token.owner, token.name) })
    }
    hits.push({ kind: 'contract', address: query, token })
    return hits
  }

  const slug = parseGithubInput(query)
  if (slug) {
    try {
      const repo = await readRepo(slug.owner, slug.name)
      hits.push({
        kind: 'repo',
        repo,
        launchAvailable: repo.tokenStatus !== 'live',
        maintainer: withMaintainer(repo.owner, repo.name),
      })
    } catch { /* not a repo */ }
  }

  const lower = query.toLowerCase()
  for (const t of store.tokens) {
    if (
      t.displayName.toLowerCase().includes(lower)
      || t.symbol.toLowerCase().includes(lower)
      || t.address.toLowerCase().includes(lower)
      || `${t.owner}/${t.name}`.toLowerCase().includes(lower)
    ) {
      hits.push({ kind: 'token', token: t, maintainer: withMaintainer(t.owner, t.name) })
    }
  }

  const ownerHits = store.repositories.filter((r) => r.owner.toLowerCase() === lower)
  if (ownerHits.length) {
    hits.push({ kind: 'owner', login: ownerHits[0].owner, repos: ownerHits.length })
  }

  if (hits.length < 8 && !slug) {
    const extra = await searchRepos('starred', query, 1).catch(() => [] as RepoCard[])
    for (const repo of extra.slice(0, 8)) {
      hits.push({
        kind: 'repo',
        repo,
        launchAvailable: repo.tokenStatus !== 'live',
        maintainer: withMaintainer(repo.owner, repo.name),
      })
    }
  }
  return hits.slice(0, 16)
}
