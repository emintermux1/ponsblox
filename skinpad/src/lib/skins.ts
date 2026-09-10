export const WEARS = [
  'Factory New',
  'Minimal Wear',
  'Field-Tested',
  'Well-Worn',
  'Battle-Scarred',
] as const

export type Wear = (typeof WEARS)[number]

export const WEAR_SHORT: Record<Wear, string> = {
  'Factory New': 'FN',
  'Minimal Wear': 'MW',
  'Field-Tested': 'FT',
  'Well-Worn': 'WW',
  'Battle-Scarred': 'BS',
}

export const CATEGORIES = [
  'Knives',
  'Gloves',
  'Rifles',
  'Pistols',
  'SMGs',
  'Heavy',
  'Other',
] as const

export type SkinCategory = (typeof CATEGORIES)[number]

export const RARITY_COLORS: Record<string, string> = {
  'Consumer Grade': '#b0c3d9',
  'Industrial Grade': '#5e98d9',
  'Mil-Spec Grade': '#4b69ff',
  Restricted: '#8847ff',
  Classified: '#d32ce6',
  Covert: '#eb4b4b',
  Extraordinary: '#e4ae39',
  Contraband: '#e4ae39',
  Gold: '#e4ae39',
}

export type QuoteSource = 'steam_median' | 'steam_ask' | 'unavailable'

export type SkinListing = {
  id: string
  marketHashName: string
  weapon: string
  finish: string
  wear: Wear | null
  wearShort: string
  category: SkinCategory
  rarity: string
  rarityColor: string
  collection: string
  stattrak: boolean
  souvenir: boolean
  star: boolean
  image: string
  quoteUsd: number | null
  lowestUsd: number | null
  volume: string
  quoteSource: QuoteSource
  quoteAt: string | null
  rank: number
}

export function skinId(hash: string): string {
  return hash
    .replace(/★\s*/g, 'star-')
    .replace(/StatTrak™\s*/gi, 'st-')
    .replace(/Souvenir\s*/gi, 'sv-')
    .replace(/\s*\|\s*/g, '--')
    .replace(/[()]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .toLowerCase()
}

export function parseWear(hash: string): Wear | null {
  const m = hash.match(/\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)\s*$/)
  return (m?.[1] as Wear | undefined) ?? null
}

export function parseSkinParts(hash: string): {
  star: boolean
  stattrak: boolean
  souvenir: boolean
  weapon: string
  finish: string
  wear: Wear | null
} {
  let rest = hash.trim()
  const star = rest.startsWith('★')
  if (star) rest = rest.replace(/^★\s*/, '')
  const stattrak = /^StatTrak™\s*/i.test(rest)
  if (stattrak) rest = rest.replace(/^StatTrak™\s*/i, '')
  const souvenir = /^Souvenir\s*/i.test(rest)
  if (souvenir) rest = rest.replace(/^Souvenir\s*/i, '')
  const wear = parseWear(rest)
  const body = rest.replace(/\s*\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)\s*$/, '')
  const [weapon, ...finishParts] = body.split('|').map((s) => s.trim())
  return {
    star,
    stattrak,
    souvenir,
    weapon: weapon || body,
    finish: finishParts.join(' | ') || body,
    wear,
  }
}

export function suggestTicker(hash: string): string {
  const { finish } = parseSkinParts(hash)
  const compact = finish.replace(/[^A-Za-z0-9]/g, '').slice(0, 11).toUpperCase()
  return compact.length >= 2 ? compact : 'SKIN'
}

export function suggestName(hash: string): string {
  const { weapon, finish } = parseSkinParts(hash)
  const name = `${finish} ${weapon}`.trim()
  return name.slice(0, 48)
}

export const TOKEN_NAME_SUFFIX = ' by SkinPad'
export const TOKEN_NAME_MAX = 48

/**
 * The on-chain token name: always ends with " by SkinPad", exactly once.
 * The base is truncated when needed so the suffix always fits whole.
 */
export function finalTokenName(base: string): string {
  const clean = base
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*by\s+skinpad$/i, '')
    .trimEnd()
  const maxBase = TOKEN_NAME_MAX - TOKEN_NAME_SUFFIX.length
  return `${clean.slice(0, maxBase).trimEnd()}${TOKEN_NAME_SUFFIX}`
}

export function categoryFromSteamType(type: string): SkinCategory {
  const t = type.toLowerCase()
  if (/knife|dagger|bayonet|karambit|butterfly|talon|skeleton|kukri|nomad|survival|paracord|bowie|falchion|shadow daggers|gut knife|flip knife|huntsman|ursus|stiletto|navaja|classic knife/.test(t)) {
    return 'Knives'
  }
  if (/glove|hand wrap|wraps/.test(t)) return 'Gloves'
  if (/rifle|sniper/.test(t) && !/smg/.test(t)) return 'Rifles'
  if (/pistol/.test(t)) return 'Pistols'
  if (/\bsmg\b/.test(t)) return 'SMGs'
  if (/shotgun|machinegun|heavy|negev|m249/.test(t)) return 'Heavy'
  return 'Other'
}

export function rarityFromSteamType(type: string): string {
  const order = [
    'Contraband',
    'Extraordinary',
    'Covert',
    'Classified',
    'Restricted',
    'Mil-Spec Grade',
    'Industrial Grade',
    'Consumer Grade',
  ]
  for (const name of order) {
    if (type.includes(name)) return name
  }
  if (/★|knife|gloves/i.test(type)) return 'Covert'
  return 'Mil-Spec Grade'
}

export function isWeaponMarketType(type: string): boolean {
  const t = type.toLowerCase()
  if (/sticker|graffiti|music kit|agent|patch|pin|collectible|container|case|capsule|package|key|pass|tool|gift|tag|nametag|swap|storage unit|souvenir token/.test(t)) {
    return false
  }
  return /knife|glove|hand wrap|pistol|rifle|smg|shotgun|machinegun|sniper|heavy|gun/.test(t)
}

export function steamImage(iconUrl: string): string {
  const path = iconUrl.trim()
  if (!path) return ''
  if (/^https:\/\//i.test(path)) return path
  return `https://community.cloudflare.steamstatic.com/economy/image/${path}`
}

export function steamListingUrl(marketHashName: string): string {
  return `https://steamcommunity.com/market/listings/730/${encodeURIComponent(marketHashName)}`
}

export function quoteSourceLabel(source: QuoteSource): string {
  switch (source) {
    case 'steam_median': return 'Steam median'
    case 'steam_ask': return 'Steam ask'
    case 'unavailable': return 'last known'
    default: {
      const _e: never = source
      return _e
    }
  }
}

export function parseUsd(raw: string | null | undefined): number | null {
  if (!raw) return null
  const n = Number(String(raw).replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}
