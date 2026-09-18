export const SORTS = [
  { id: 'upcoming', label: 'Up-and-coming', api: 'up-and-coming' },
  { id: 'trending', label: 'Trending', api: 'top-trending' },
  { id: 'playing', label: 'Playing now', api: 'top-playing-now' },
  { id: 'friends', label: 'With friends', api: 'fun-with-friends' },
  { id: 'revisited', label: 'Revisited', api: 'top-revisited' },
] as const

export type GameSort = (typeof SORTS)[number]['id'] | 'search'

export type GameListing = {
  id: string
  universeId: number
  rootPlaceId: number
  name: string
  description: string
  creatorName: string
  creatorId: number
  playing: number
  upVotes: number
  downVotes: number
  likeRatio: number
  genre: string
  image: string
  url: string
  sort: GameSort
  maturity: string
}

export const TOKEN_NAME_SUFFIX = ' by RobloxPad'
export const TOKEN_NAME_MAX = 48

export function gameId(universeId: number | string): string {
  return String(universeId).replace(/[^0-9]/g, '')
}

export function robloxGameUrl(placeId: number, name?: string): string {
  const slug = (name || 'game')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'game'
  return `https://www.roblox.com/games/${placeId}/${slug}`
}

export function suggestTicker(name: string): string {
  const compact = name.replace(/[^A-Za-z0-9]/g, '').slice(0, 11).toUpperCase()
  return compact.length >= 2 ? compact : 'GAME'
}

export function suggestName(name: string): string {
  return name.replace(/\s+/g, ' ').trim().slice(0, TOKEN_NAME_MAX - TOKEN_NAME_SUFFIX.length)
}

export function finalTokenName(base: string): string {
  const clean = base
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*by\s+robloxpad$/i, '')
    .trimEnd()
  const maxBase = TOKEN_NAME_MAX - TOKEN_NAME_SUFFIX.length
  return `${clean.slice(0, maxBase).trimEnd()}${TOKEN_NAME_SUFFIX}`
}

export function likeRatio(up: number, down: number): number {
  const t = up + down
  if (t <= 0) return 0
  return up / t
}

export function formatPlayers(n: number): string {
  if (!Number.isFinite(n)) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}m`
  if (n >= 10_000) return `${Math.round(n / 1000)}k`
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return n.toLocaleString('en-US')
}

export function formatLikePct(ratio: number): string {
  if (!Number.isFinite(ratio) || ratio <= 0) return '—'
  return `${Math.round(ratio * 100)}%`
}

export type RobloxInput =
  | { kind: 'universe'; id: string }
  | { kind: 'place'; placeId: string }
  | { kind: 'query'; q: string }

export function parseRobloxInput(raw: string): RobloxInput {
  const t = raw.trim()
  const fromUrl = t.match(/roblox\.com\/(?:games|experiences)\/(\d+)/i)
  if (fromUrl?.[1]) return { kind: 'place', placeId: fromUrl[1] }
  if (/^\d+$/.test(t)) return { kind: 'universe', id: t }
  return { kind: 'query', q: t }
}
