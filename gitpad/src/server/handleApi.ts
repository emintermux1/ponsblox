import { configuredIntegrations, ADMIN_ADDRESSES, PONS_TRUST_NOTE } from '../config/official.ts'
import { byGitlabName } from '../lib/naming.ts'
import {
  ApiError,
  isRepoSlug,
  listRemembered,
  readRepo,
  rememberLaunch,
  searchRepos,
  type ExploreSort,
} from './github.ts'
import { handleIpfsBody, ipfsStatus } from './ipfs.ts'
import { authorizeUrl, exchangeCode, oauthConfigured, verifyRepoControl } from './oauth.ts'
import { searchGitPad } from './search.ts'
import {
  addActivity,
  addDeployment,
  addMarket,
  listActivity,
  maintainerForRepo,
  marketsFor,
  noteIpfs,
  readStore,
  rememberToken,
  removeWatch,
  setMaintainer,
  setWatch,
  snapshotsFor,
  tokensForRepo,
  watchesFor,
} from './store.ts'

import {
  buildBoard,
  buildFeed,
  buildFirst,
  buildMap,
  buildPulse,
  composeDaily,
} from './growth.ts'
import type { BoardRange, FeedFilter, MapCategory } from '../lib/growthTypes.ts'
import { indexFactory } from './indexer.ts'
import { shareCardSvg } from './og.ts'
import { funnelNote, launchFunnelCounts, recordLaunchEvent } from './funnel.ts'
import { logServer } from './log.ts'
import { rateLimit, sameOrigin } from './security.ts'

const FEED_FILTERS: FeedFilter[] = ['all', 'trending', 'launches', 'github', 'markets']
const BOARD_RANGES: BoardRange[] = ['now', '24H', '7D', '30D']
const MAP_CATS: MapCategory[] = [
  'ai', 'devtools', 'crypto', 'gaming', 'infrastructure', 'agents', 'consumer', 'other',
]

export type ApiReq = {
  method: string
  pathname: string
  search: URLSearchParams
  body?: unknown
  origin?: string
  host?: string
  ip?: string
}

export type ApiRes = { status: number; json?: unknown; raw?: string; contentType?: string }

const SORTS: ExploreSort[] = [
  'trending', 'new', 'starred', 'growing', 'forked', 'today',
  'ai', 'crypto', 'devtools', 'gaming', 'rising',
]

function asSort(value: string | null): ExploreSort {
  const v = (value || 'trending') as ExploreSort
  return SORTS.includes(v) ? v : 'trending'
}

function addrOk(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value)
}

function rangeSince(range: string): number {
  const now = Date.now()
  switch (range) {
    case '24H': return now - 86_400_000
    case '7D': return now - 7 * 86_400_000
    case '30D': return now - 30 * 86_400_000
    default: return 0
  }
}

export async function handleApi(req: ApiReq): Promise<ApiRes> {
  const path = req.pathname.replace(/\/+$/, '') || '/'
  if (!rateLimit(`${req.ip || 'local'}:${path}`, path.startsWith('/api/ipfs') ? 10 : 60)) {
    return { status: 429, json: { error: 'Rate limited. Wait a minute.', code: 'RATE_LIMITED' } }
  }
  if ((req.method === 'POST' || req.method === 'PUT') && !sameOrigin({ origin: req.origin, host: req.host })) {
    return { status: 403, json: { error: 'Cross-origin write rejected' } }
  }
  try {
    if ((path === '/api/repos' || path === '/api/repos/search' || path === '/api/github' || path === '/api/github/search') && req.method === 'GET') {
      const sort = asSort(req.search.get('sort'))
      const q = req.search.get('q') || undefined
      const page = Number(req.search.get('page') || '1')
      const repos = await searchRepos(sort, q, page)
      return { status: 200, json: { repos, sort, page } }
    }
    if ((path === '/api/github/repo' || path === '/api/repo') && req.method === 'GET') {
      const owner = req.search.get('owner') || ''
      const name = req.search.get('name') || ''
      const repo = await readRepo(owner, name)
      const tokens = tokensForRepo(repo.owner, repo.name)
      const verified = maintainerForRepo(repo.owner, repo.name) || null
      return { status: 200, json: { repo, tokens, verified } }
    }
    if (path === '/api/search' && req.method === 'GET') {
      const q = req.search.get('q') || ''
      const hits = await searchGitPad(q)
      return { status: 200, json: { hits } }
    }
    if (path === '/api/activity' && req.method === 'GET') {
      return { status: 200, json: { events: listActivity(60) } }
    }
    if (path === '/api/market' && req.method === 'POST') {
      const body = (req.body || {}) as {
        token?: string
        priceRblx?: string | null
        capRblx?: string | null
        quoteReserve?: string
        graduated?: boolean
      }
      if (!body.token || !addrOk(body.token)) return { status: 400, json: { error: 'Not an address' } }
      addMarket({
        token: body.token,
        at: Date.now(),
        priceRblx: body.priceRblx ?? null,
        capRblx: body.capRblx ?? null,
        quoteReserve: body.quoteReserve || '0',
        graduated: Boolean(body.graduated),
      })
      return { status: 200, json: { ok: true } }
    }
    if (path === '/api/analytics' && req.method === 'GET') {
      const githubId = Number(req.search.get('githubId') || '0')
      const token = (req.search.get('token') || '').toLowerCase()
      const range = req.search.get('range') || '7D'
      const since = rangeSince(range)
      return {
        status: 200,
        json: {
          range,
          repo: githubId ? snapshotsFor(githubId, since) : [],
          market: addrOk(token) ? marketsFor(token, since) : [],
          note: '',
        },
      }
    }
    if (path === '/api/watch' && req.method === 'GET') {
      const wallet = req.search.get('wallet') || ''
      if (!addrOk(wallet)) return { status: 400, json: { error: 'Not an address' } }
      return { status: 200, json: { items: watchesFor(wallet) } }
    }
    if (path === '/api/watch' && req.method === 'POST') {
      const body = (req.body || {}) as {
        wallet?: string
        kind?: 'repo' | 'token'
        owner?: string
        name?: string
        githubId?: number
        token?: string
        remove?: boolean
        alerts?: { trending?: boolean; launch?: boolean }
      }
      if (!body.wallet || !addrOk(body.wallet)) return { status: 400, json: { error: 'Not an address' } }
      if (body.remove) {
        removeWatch(body.wallet, body.kind === 'token' ? 'token' : 'repo', body.token || `${body.owner}/${body.name}` || String(body.githubId || ''))
        return { status: 200, json: { items: watchesFor(body.wallet) } }
      }
      if (body.kind !== 'repo' && body.kind !== 'token') return { status: 400, json: { error: 'kind must be repo or token' } }
      setWatch({
        wallet: body.wallet,
        kind: body.kind,
        owner: body.owner,
        name: body.name,
        githubId: body.githubId,
        token: body.token,
        alerts: { trending: Boolean(body.alerts?.trending), launch: Boolean(body.alerts?.launch) },
        at: Date.now(),
      })
      return { status: 200, json: { items: watchesFor(body.wallet) } }
    }
    if (path === '/api/oauth/github/start' && req.method === 'GET') {
      if (!oauthConfigured()) {
        return { status: 503, json: { configured: false, error: 'Set GITHUB_OAUTH_CLIENT_ID and GITHUB_OAUTH_CLIENT_SECRET. Claim stays disabled until then.' } }
      }
      const owner = req.search.get('owner') || ''
      const name = req.search.get('name') || ''
      const wallet = req.search.get('wallet') || ''
      const redirect = (process.env.GITHUB_OAUTH_REDIRECT || '').trim()
        || `${req.search.get('origin') || ''}/claim`
      const state = Buffer.from(JSON.stringify({ owner, name, wallet, n: Date.now() })).toString('base64url')
      return { status: 200, json: { configured: true, url: authorizeUrl(state, redirect), state } }
    }
    if (path === '/api/oauth/github/exchange' && req.method === 'POST') {
      const body = (req.body || {}) as { code?: string; owner?: string; name?: string; wallet?: string }
      if (!body.code || !body.owner || !body.name || !body.wallet) {
        return { status: 400, json: { error: 'Need code, repository, and wallet' } }
      }
      const token = await exchangeCode(body.code)
      const row = await verifyRepoControl(token, body.owner, body.name, body.wallet)
      addActivity({
        kind: 'repo_claimed',
        at: Date.now(),
        title: `${row.owner}/${row.name} claimed by ${row.login}`,
        body: 'GitHub verification only. Token ownership did not move.',
        owner: row.owner,
        name: row.name,
        href: `/repo/${row.owner}/${row.name}`,
      })
      return { status: 200, json: { maintainer: row } }
    }
    if (path === '/api/claim/treasury' && req.method === 'POST') {
      const body = (req.body || {}) as { owner?: string; name?: string; wallet?: string; treasury?: string }
      if (!body.owner || !body.name || !body.wallet || !addrOk(body.wallet)) {
        return { status: 400, json: { error: 'Need verified wallet and repository' } }
      }
      if (!body.treasury || !addrOk(body.treasury)) return { status: 400, json: { error: 'Treasury must be an address' } }
      const cur = maintainerForRepo(body.owner, body.name)
      if (!cur || cur.wallet.toLowerCase() !== body.wallet.toLowerCase()) {
        return { status: 403, json: { error: 'Only the verified maintainer can set a treasury.' } }
      }
      setMaintainer({ ...cur, treasury: body.treasury })
      return { status: 200, json: { maintainer: { ...cur, treasury: body.treasury } } }
    }
    if (path === '/api/tokens' && req.method === 'GET') {
      const owner = req.search.get('owner')
      const name = req.search.get('name')
      let rows = listRemembered()
      if (owner && name && isRepoSlug(owner) && isRepoSlug(name)) {
        rows = rows.filter((r) => r.owner.toLowerCase() === owner.toLowerCase() && r.name.toLowerCase() === name.toLowerCase())
      }
      const mapped = owner && name ? tokensForRepo(owner, name) : readStore().tokens
      return { status: 200, json: { tokens: rows, mapped } }
    }
    if (path === '/api/ipfs' && req.method === 'GET') {
      return { status: 200, json: ipfsStatus() }
    }
    if (path === '/api/ipfs' && req.method === 'POST') {
      try {
        const pin = await handleIpfsBody(req.body)
        noteIpfs(null)
        return { status: 200, json: pin }
      } catch (e) {
        noteIpfs((e as Error).message)
        throw e
      }
    }
    if (path === '/api/tokens' && req.method === 'POST') {
      const body = (req.body || {}) as {
        token?: string
        owner?: string
        name?: string
        symbol?: string
        githubId?: number
        txHash?: string
        metadataURI?: string
        ipfsCid?: string
        deployer?: string
      }
      if (!body.token || !addrOk(body.token)) return { status: 400, json: { error: 'Not an address', code: 'BAD_ADDRESS' } }
      if (!body.owner || !body.name || !isRepoSlug(body.owner) || !isRepoSlug(body.name)) {
        return { status: 400, json: { error: 'Need owner and repo', code: 'BAD_REPO' } }
      }
      const tokens = rememberLaunch({
        token: body.token,
        owner: body.owner,
        name: body.name,
        symbol: body.symbol,
        at: Date.now(),
      })
      const mapped = rememberToken({
        address: body.token,
        githubId: body.githubId || 0,
        owner: body.owner,
        name: body.name,
        symbol: body.symbol || '',
        displayName: byGitlabName(body.name),
        kind: tokensForRepo(body.owner, body.name).length ? 'community' : 'canonical',
        deployer: body.deployer || '',
        deployedAt: Date.now(),
        txHash: body.txHash,
        metadataURI: body.metadataURI,
        ipfsCid: body.ipfsCid,
      })
      if (body.txHash) {
        addDeployment({ txHash: body.txHash, token: body.token, status: 'success', at: Date.now() })
      }
      addActivity({
        kind: 'token_launched',
        at: Date.now(),
        title: `${byGitlabName(body.name)} is now live`,
        body: `${body.owner}/${body.name} · $${(body.symbol || '').toUpperCase()}`,
        owner: body.owner,
        name: body.name,
        token: body.token,
        href: `/token/${body.token}`,
      })
      return { status: 200, json: { tokens, mapped } }
    }
    if (path === '/api/index' && req.method === 'GET') {
      const out = await indexFactory().catch((e: Error) => ({ error: e.message }))
      return { status: 200, json: out }
    }
    if (path === '/api/pulse' && req.method === 'GET') {
      return { status: 200, json: buildPulse(readStore()) }
    }
    if (path === '/api/feed' && req.method === 'GET') {
      const raw = (req.search.get('filter') || 'all') as FeedFilter
      const filter = FEED_FILTERS.includes(raw) ? raw : 'all'
      return { status: 200, json: { filter, events: buildFeed(readStore(), filter) } }
    }
    if (path === '/api/board' && req.method === 'GET') {
      const raw = (req.search.get('range') || 'now') as BoardRange
      const range = BOARD_RANGES.includes(raw) ? raw : 'now'
      const page = Number(req.search.get('page') || '1')
      const rows = await buildBoard(range, page)
      return { status: 200, json: { range, page, rows } }
    }
    if (path === '/api/first' && req.method === 'GET') {
      const page = Number(req.search.get('page') || '1')
      const rows = await buildFirst(page)
      return { status: 200, json: { page, rows } }
    }
    if (path === '/api/daily' && req.method === 'GET') {
      return { status: 200, json: await composeDaily() }
    }
    if (path === '/api/map' && req.method === 'GET') {
      const raw = (req.search.get('cat') || 'ai') as MapCategory
      const cat = MAP_CATS.includes(raw) ? raw : 'ai'
      const rows = await buildMap(cat)
      return { status: 200, json: { cat, rows } }
    }
    if (path === '/api/launch-events' && req.method === 'POST') {
      const body = (req.body || {}) as { event?: string; session?: string; wallet?: string; address?: string }
      if (body.wallet || body.address) {
        return { status: 400, json: { error: 'Do not send a wallet or contract in launch analytics.' } }
      }
      if (!body.session || !/^[a-f0-9]{8,64}$/i.test(body.session)) {
        return { status: 400, json: { error: 'Session is required and must be opaque.' } }
      }
      const counts = recordLaunchEvent(body.event || '')
      if (!counts) return { status: 400, json: { error: 'Unknown launch event.' } }
      return { status: 204 }
    }
    if (path === '/api/launch-events' && req.method === 'GET') {
      return { status: 200, json: { counts: launchFunnelCounts(), note: funnelNote() } }
    }
    if (path === '/api/og' && req.method === 'GET') {
      const svg = shareCardSvg({
        title: req.search.get('title') || 'GitPad',
        repo: req.search.get('repo') || '',
        stars: req.search.get('stars') || '',
        ticker: req.search.get('ticker') || '',
        contract: req.search.get('contract') || '',
        rank: req.search.get('rank') || '',
        layout: req.search.get('layout') || 'launch',
      })
      return { status: 200, raw: svg, contentType: 'image/svg+xml; charset=utf-8' }
    }
    if (path === '/api/health' && req.method === 'GET') {
      const s = readStore()
      return {
        status: 200,
        json: {
          integrations: configuredIntegrations(),
          ponsNote: PONS_TRUST_NOTE,
          health: s.health,
          indexer: s.indexer.lastBlock,
          counts: {
            repositories: s.repositories.length,
            tokens: s.tokens.length,
            deployments: s.deployments.length,
            activity: s.activity.length,
            maintainers: s.maintainers.length,
          },
        },
      }
    }
    if (path === '/api/admin' && req.method === 'GET') {
      const wallet = (req.search.get('wallet') || '').toLowerCase()
      if (!wallet || !ADMIN_ADDRESSES.includes(wallet)) {
        return { status: 403, json: { error: 'Admin only. Set VITE_GITPAD_ADMINS.' } }
      }
      const s = readStore()
      return {
        status: 200,
        json: {
          health: s.health,
          deployments: s.deployments.slice(0, 40),
          failed: s.deployments.filter((d) => d.status === 'failed' || d.status === 'reverted').slice(0, 20),
          mappings: s.tokens.slice(0, 40),
          repositories: s.repositories.slice(0, 40),
          feeRoutes: s.feeRoutes.slice(0, 20),
          feeDistributions: s.feeDistributions.slice(0, 20),
          activity: s.activity.slice(0, 40),
          integrations: configuredIntegrations(),
          ponsNote: PONS_TRUST_NOTE,
        },
      }
    }
    return { status: 404, json: { error: 'Not found' } }
  } catch (e) {
    if (e instanceof ApiError) {
      const code = e.status === 404 ? 'REPO_NOT_FOUND' : e.status === 429 ? 'RATE_LIMITED' : e.status === 403 ? 'REPO_PRIVATE' : 'GENERIC'
      if (e.status >= 500) logServer('github', e.message)
      return { status: e.status, json: { error: e.message, code } }
    }
    logServer('api', (e as Error).message || 'Server error')
    return { status: 500, json: { error: 'Something failed. Retry, then check Docs.' } }
  }
}
