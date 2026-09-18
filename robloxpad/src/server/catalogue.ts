import { CATALOGUE_SIZE } from '../config/official.ts'
import {
  gameId,
  likeRatio,
  parseRobloxInput,
  robloxGameUrl,
  SORTS,
  type GameListing,
  type GameSort,
} from '../lib/games.ts'
import { logServer } from './log.ts'
import { readStore, writeCatalogue, writePlayers } from './store.ts'

const UA = 'Mozilla/5.0 (compatible; RobloxPad/1.0; +https://robloxpad.family)'
const SESSION = 'robloxpad'

type ExploreGame = {
  universeId?: number
  rootPlaceId?: number
  name?: string
  playerCount?: number
  totalUpVotes?: number
  totalDownVotes?: number
  creatorName?: string
  creatorId?: number
  genreL1?: string
  ageRecommendationDisplayName?: string
  contentMaturity?: string
  description?: string
  canonicalUrlPath?: string
}

type ExploreSort = {
  sortId?: string
  games?: ExploreGame[]
}

async function rbx(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { accept: 'application/json', 'user-agent': UA },
  })
  if (!res.ok) throw new Error(`Roblox ${res.status}`)
  return res.json()
}

function toListing(g: ExploreGame, sort: GameSort, image = ''): GameListing | null {
  const universeId = Number(g.universeId)
  const rootPlaceId = Number(g.rootPlaceId)
  const name = (g.name || '').trim()
  if (!Number.isFinite(universeId) || universeId <= 0 || !name) return null
  if (!Number.isFinite(rootPlaceId) || rootPlaceId <= 0) return null
  const up = Number(g.totalUpVotes) || 0
  const down = Number(g.totalDownVotes) || 0
  const path = g.canonicalUrlPath
  return {
    id: gameId(universeId),
    universeId,
    rootPlaceId,
    name,
    description: (g.description || '').trim(),
    creatorName: (g.creatorName || '').trim(),
    creatorId: Number(g.creatorId) || 0,
    playing: Number(g.playerCount) || 0,
    upVotes: up,
    downVotes: down,
    likeRatio: likeRatio(up, down),
    genre: (g.genreL1 || '').trim() || 'Game',
    image,
    url: path ? `https://www.roblox.com${path}` : robloxGameUrl(rootPlaceId, name),
    sort,
    maturity: (g.ageRecommendationDisplayName || g.contentMaturity || '').trim(),
  }
}

async function iconsFor(ids: number[]): Promise<Map<number, string>> {
  const map = new Map<number, string>()
  for (let i = 0; i < ids.length; i += 80) {
    const chunk = ids.slice(i, i + 80)
    const url = `https://thumbnails.roblox.com/v1/games/icons?universeIds=${chunk.join(',')}&returnPolicy=PlaceHolder&size=512x512&format=Png&isCircular=false`
    try {
      const json = await rbx(url) as { data?: { targetId?: number; imageUrl?: string }[] }
      for (const row of json.data || []) {
        if (row.targetId && row.imageUrl) map.set(row.targetId, row.imageUrl)
      }
    } catch (e) {
      logServer('roblox', `icons ${(e as Error).message}`)
    }
  }
  return map
}

function decorate(raw: ExploreGame[], sort: GameSort, icons: Map<number, string>): GameListing[] {
  return raw
    .map((g) => toListing(g, sort, icons.get(Number(g.universeId)) || ''))
    .filter((g): g is GameListing => Boolean(g))
}

async function fetchExplore(): Promise<Map<GameSort, GameListing[]>> {
  const json = await rbx(`https://apis.roblox.com/explore-api/v1/get-sorts?sessionId=${SESSION}`) as { sorts?: ExploreSort[] }
  const byApi = new Map((json.sorts || []).map((s) => [s.sortId || '', s.games || []]))
  const raw = SORTS.flatMap((sort) => byApi.get(sort.api) || [])
  const icons = await iconsFor([...new Set(raw.map((g) => Number(g.universeId)).filter((n) => n > 0))])
  const out = new Map<GameSort, GameListing[]>()
  for (const sort of SORTS) {
    out.set(sort.id, decorate(byApi.get(sort.api) || [], sort.id, icons))
  }
  return out
}

async function searchGames(q: string): Promise<GameListing[]> {
  const url = `https://apis.roblox.com/search-api/omni-search?verticalType=game&searchQuery=${encodeURIComponent(q)}&sessionId=${SESSION}&globalSessionId=${SESSION}`
  const json = await rbx(url) as { searchResults?: { contents?: ExploreGame[] }[] }
  const raw = (json.searchResults || []).flatMap((g) => g.contents || [])
  const icons = await iconsFor(raw.map((g) => Number(g.universeId)).filter((n) => n > 0))
  return decorate(raw, 'search', icons)
}

async function universeFromPlace(placeId: string): Promise<string | null> {
  try {
    const json = await rbx(`https://apis.roblox.com/universes/v1/places/${placeId}/universe`) as { universeId?: number }
    const id = Number(json.universeId)
    return Number.isFinite(id) && id > 0 ? String(id) : null
  } catch (e) {
    logServer('roblox', `place ${placeId} ${(e as Error).message}`)
    return null
  }
}

async function rebuild(): Promise<GameListing[]> {
  const seen = new Map<string, GameListing>()
  try {
    const bySort = await fetchExplore()
    for (const sort of SORTS) {
      for (const row of bySort.get(sort.id) || []) {
        const prev = seen.get(row.id)
        if (!prev) seen.set(row.id, row)
        else if (row.playing > prev.playing) seen.set(row.id, { ...row, sort: prev.sort })
      }
    }
  } catch (e) {
    logServer('roblox', `explore ${(e as Error).message}`)
  }
  const items = [...seen.values()]
    .sort((a, b) => b.playing - a.playing)
    .slice(0, CATALOGUE_SIZE)
  for (const row of items) writePlayers(row.id, row.playing)
  writeCatalogue(items, Date.now())
  return items
}

let inflight: Promise<GameListing[]> | null = null

export async function getCatalogue(): Promise<GameListing[]> {
  const s = readStore()
  const fresh = Date.now() - s.catalogueBuiltAt < 8 * 60_000
  if (s.catalogue.length && fresh) return s.catalogue
  if (s.catalogue.length) {
    if (!inflight) inflight = rebuild().finally(() => { inflight = null })
    return s.catalogue
  }
  if (!inflight) inflight = rebuild().finally(() => { inflight = null })
  return inflight
}

async function findInPool(id: string, extra?: GameListing[]): Promise<GameListing | null> {
  const nid = gameId(id)
  if (!nid) return null
  const items = extra?.length ? extra : await getCatalogue()
  return items.find((g) => g.id === nid) || null
}

export async function getGame(id: string): Promise<GameListing | null> {
  const parsed = parseRobloxInput(id)
  let universe = ''
  let query = ''
  switch (parsed.kind) {
    case 'universe':
      universe = parsed.id
      break
    case 'place': {
      universe = (await universeFromPlace(parsed.placeId)) || ''
      query = parsed.placeId
      break
    }
    case 'query':
      query = parsed.q
      break
    default: {
      const _e: never = parsed
      return _e
    }
  }
  if (universe) {
    const hit = await findInPool(universe)
    if (hit) return hit
  }
  const q = query || universe
  if (!q) return null
  try {
    const rows = await searchGames(q)
    if (universe) return rows.find((g) => g.id === universe) || rows[0] || null
    return rows[0] || null
  } catch {
    return null
  }
}

export async function filterCatalogue(items: GameListing[], input: { q?: string; sort?: string; genre?: string }): Promise<GameListing[]> {
  const q = (input.q || '').trim()
  const sort = (input.sort || 'all') as GameSort | 'all'
  const genre = (input.genre || 'all').toLowerCase()
  let pool = items
  if (q) {
    const parsed = parseRobloxInput(q)
    if (parsed.kind !== 'query') {
      const one = await getGame(q)
      return one ? [one] : []
    }
    try {
      const found = await searchGames(q)
      if (found.length) pool = found
      else {
        const needle = q.toLowerCase()
        pool = items.filter((g) => `${g.name} ${g.creatorName} ${g.genre}`.toLowerCase().includes(needle))
      }
    } catch {
      const needle = q.toLowerCase()
      pool = items.filter((g) => `${g.name} ${g.creatorName} ${g.genre}`.toLowerCase().includes(needle))
    }
  } else if (sort !== 'all') {
    pool = items.filter((g) => g.sort === sort)
    if (pool.length === 0) pool = items
  }
  if (genre !== 'all') pool = pool.filter((g) => g.genre.toLowerCase() === genre)
  return pool
}

export function genreList(items: GameListing[]): string[] {
  return [...new Set(items.map((g) => g.genre).filter(Boolean))].sort()
}
