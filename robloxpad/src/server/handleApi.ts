import { isAddress, type Address } from 'viem'
import { CATALOGUE_SIZE, ROBLOXPAD_TICKER, configuredIntegrations } from '../config/official.ts'
import { tokenUsdFromEth } from '../lib/format.ts'
import { gameId, type GameListing } from '../lib/games.ts'
import { readFactoryStatus, readToken } from '../lib/pons/factory.ts'
import { filterCatalogue, genreList, getCatalogue, getGame } from './catalogue.ts'
import { fetchEthUsd } from './eth.ts'
import { indexFactory } from './indexer.ts'
import { ApiError, handleIpfsBody, ipfsStatus, pinImageUrl } from './ipfs.ts'
import { logServer } from './log.ts'
import { rateLimit, sameOrigin } from './security.ts'
import { launchFor, launchesForGame, listLaunches, playerHistory, rememberLaunch, type LaunchRecord } from './store.ts'

export type ApiReq = {
  method: string
  pathname: string
  search: URLSearchParams
  body?: unknown
  origin?: string
  host?: string
}

export type ApiRes = {
  status: number
  json?: unknown
  raw?: string
  contentType?: string
  headers?: Record<string, string>
}

function originOf(req: ApiReq): string {
  if (req.origin) return req.origin.replace(/\/$/, '')
  const host = req.host || 'localhost:5179'
  const proto = host.includes('localhost') || host.startsWith('127.') ? 'http' : 'https'
  return `${proto}://${host}`
}

function artUrl(req: ApiReq, id: string): string {
  return `${originOf(req)}/api/art?id=${encodeURIComponent(id)}`
}

function asLaunch(body: unknown): LaunchRecord {
  const b = (body || {}) as Record<string, unknown>
  const token = String(b.token || '')
  const curve = String(b.curve || '')
  const hash = String(b.hash || '')
  const deployer = String(b.deployer || '')
  const universeId = gameId(String(b.universeId || b.gameId || ''))
  const name = String(b.gameName || '')
  const quotedAt = String(b.quotedAt || new Date().toISOString())
  const playing = Number(b.playing)
  if (!isAddress(token) || !isAddress(curve) || !isAddress(deployer)) throw new ApiError(400, 'Not a valid address')
  if (!/^0x[a-fA-F0-9]{64}$/.test(hash)) throw new ApiError(400, 'Not a valid transaction hash')
  if (!universeId) throw new ApiError(400, 'Roblox universe id is required')
  if (!Number.isFinite(playing) || playing < 0) throw new ApiError(400, 'playing is invalid')
  return {
    token,
    curve,
    hash,
    deployer,
    universeId,
    gameId: universeId,
    gameName: name,
    playing,
    quotedAt,
    createdAt: Date.now(),
  }
}

async function marketsJson() {
  void indexFactory()
  const ethUsd = await fetchEthUsd()
  const launches = listLaunches()
  const catalogue = await getCatalogue().catch(() => [] as GameListing[])
  const rows = []
  for (const row of launches.slice(0, 80)) {
    const token = await readToken(row.token as Address).catch(() => null)
    const cat = catalogue.find((g) => g.id === row.gameId || g.id === row.universeId)
    rows.push({
      token: row.token,
      name: token?.name || row.gameName,
      symbol: token?.symbol || '',
      gameId: row.gameId,
      gameName: cat?.name || row.gameName,
      playing: cat?.playing ?? row.playing,
      tokenUsd: tokenUsdFromEth(token?.priceRblx, ethUsd),
      priceEth: token?.priceRblx ?? null,
      graduated: Boolean(token?.graduated),
      readyToGraduate: Boolean(token?.readyToGraduate),
      createdAt: row.createdAt,
      image: cat?.image || token?.logo || '',
    })
  }
  return { ethUsd, rows }
}

export async function handleApi(req: ApiReq): Promise<ApiRes> {
  const path = req.pathname.replace(/\/+$/, '') || '/'
  const ip = req.host || 'local'
  try {
    if (path === '/api/health') {
      return { status: 200, json: { ok: true, ticker: ROBLOXPAD_TICKER, integrations: configuredIntegrations() } }
    }

    if (path === '/api/catalogue' && req.method === 'GET') {
      if (!rateLimit(`cat:${ip}`, 60)) return { status: 429, json: { error: 'Slow down.' } }
      const items = await getCatalogue()
      const filtered = await filterCatalogue(items, {
        q: req.search.get('q') || '',
        sort: req.search.get('sort') || 'all',
        genre: req.search.get('genre') || 'all',
      })
      return {
        status: 200,
        json: {
          builtAt: items[0] ? new Date().toISOString() : '',
          size: items.length,
          note: `Live Roblox games from Explore — trending, up-and-coming, playing now. Top ${CATALOGUE_SIZE} by CCU.`,
          genres: genreList(items),
          items: filtered,
        },
      }
    }

    if ((path === '/api/game' || path === '/api/skin') && req.method === 'GET') {
      const id = req.search.get('id') || ''
      if (!id) return { status: 400, json: { error: 'Missing game id' } }
      const game = await getGame(id)
      if (!game) return { status: 404, json: { error: 'That game is not on RobloxPad.' } }
      return { status: 200, json: { ...game, art: artUrl(req, game.id), tokens: launchesForGame(game.id) } }
    }

    if (path === '/api/history' && req.method === 'GET') {
      if (!rateLimit(`hist:${ip}`, 30)) return { status: 429, json: { error: 'Slow down.' } }
      const id = req.search.get('id') || ''
      if (!id) return { status: 400, json: { error: 'Missing game id' } }
      const game = await getGame(id)
      if (!game) return { status: 404, json: { error: 'That game is not on RobloxPad.' } }
      const points = playerHistory(game.id)
      if (points.length === 0 || points[points.length - 1].n !== game.playing) {
        points.push({ t: Date.now(), n: game.playing })
      }
      return { status: 200, json: { source: 'snapshots', points } }
    }

    if (path === '/api/art' && req.method === 'GET') {
      const id = req.search.get('id') || path.split('/').pop() || ''
      const game = await getGame(id)
      if (!game?.image) return { status: 404, json: { error: 'No Roblox icon for that game.' } }
      return {
        status: 302,
        json: { image: game.image },
        headers: { location: game.image },
        contentType: 'text/plain',
        raw: '',
      }
    }

    if (path === '/api/markets' && req.method === 'GET') {
      const data = await marketsJson()
      const q = (req.search.get('q') || '').toLowerCase()
      const rows = q
        ? data.rows.filter((r) => `${r.name} ${r.symbol} ${r.gameName}`.toLowerCase().includes(q))
        : data.rows
      return { status: 200, json: { ...data, rows } }
    }

    if (path === '/api/pulse' && req.method === 'GET') {
      const items = await getCatalogue().catch(() => [] as GameListing[])
      const data = await marketsJson().catch(() => ({ ethUsd: null, rows: [] as Awaited<ReturnType<typeof marketsJson>>['rows'] }))
      return {
        status: 200,
        json: {
          catalogue: items.length,
          tokensLive: data.rows.length,
          onCurve: data.rows.filter((r) => !r.graduated).length,
          graduated: data.rows.filter((r) => r.graduated).length,
          playingNow: items.reduce((n, g) => n + (g.playing || 0), 0),
        },
      }
    }

    if (path === '/api/launches' && req.method === 'GET') {
      const token = req.search.get('token') || ''
      if (token) {
        const row = launchFor(token)
        if (!row) return { status: 404, json: { error: 'No RobloxPad index for that token.' } }
        return { status: 200, json: row }
      }
      return { status: 200, json: { launches: listLaunches() } }
    }

    if (path === '/api/launches' && req.method === 'POST') {
      if (!sameOrigin(req)) return { status: 403, json: { error: 'Cross-origin writes are blocked.' } }
      if (!rateLimit(`launch:${ip}`, 10)) return { status: 429, json: { error: 'Slow down.' } }
      const row = asLaunch(req.body)
      rememberLaunch(row)
      return { status: 200, json: { ok: true } }
    }

    if (path === '/api/factory' && req.method === 'GET') {
      const status = await readFactoryStatus()
      return {
        status: 200,
        json: {
          launchFeeEth: status.launchFeeEth,
          launchEnabled: status.launchEnabled,
          maxCreatorTaxBps: status.maxCreatorTaxBps,
          graduationRblx: status.graduationRblx,
        },
      }
    }

    if (path === '/api/ipfs' && req.method === 'GET') {
      return { status: 200, json: ipfsStatus() }
    }

    if (path === '/api/ipfs' && req.method === 'POST') {
      if (!sameOrigin(req)) return { status: 403, json: { error: 'Cross-origin writes are blocked.' } }
      if (!rateLimit(`ipfs:${ip}`, 8)) return { status: 429, json: { error: 'Slow down.' } }
      const b = (req.body || {}) as { kind?: string; id?: string }
      if (b.kind === 'game' || b.kind === 'skin') {
        const game = await getGame(String(b.id || ''))
        if (!game) return { status: 404, json: { error: 'That game is not on RobloxPad.' } }
        if (!game.image) return { status: 404, json: { error: 'No Roblox icon for that game.' } }
        const pin = await pinImageUrl(game.id, game.image)
        return { status: 200, json: pin }
      }
      const pin = await handleIpfsBody(req.body)
      return { status: 200, json: pin }
    }

    if (path === '/api/index' && req.method === 'POST') {
      if (!sameOrigin(req)) return { status: 403, json: { error: 'Cross-origin writes are blocked.' } }
      const result = await indexFactory()
      return { status: 200, json: result }
    }

    return { status: 404, json: { error: 'Unknown RobloxPad API route.' } }
  } catch (e) {
    if (e instanceof ApiError) return { status: e.status, json: { error: e.message } }
    logServer('api', (e as Error).message)
    return { status: 500, json: { error: 'Something failed. Retry, then check Docs.' } }
  }
}
