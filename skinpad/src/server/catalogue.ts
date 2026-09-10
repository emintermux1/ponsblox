import { CATALOGUE_SIZE } from '../config/official.ts'
import {
  CATEGORIES,
  RARITY_COLORS,
  WEAR_SHORT,
  categoryFromSteamType,
  isWeaponMarketType,
  parseSkinParts,
  rarityFromSteamType,
  skinId,
  steamImage,
  type SkinCategory,
  type SkinListing,
  type Wear,
} from '../lib/skins.ts'
import { logServer } from './log.ts'
import { fetchSteamMedian, steamGet } from './prices.ts'
import { readStore, writeCatalogue, writePrice } from './store.ts'

type SteamHit = {
  name?: string
  hash_name?: string
  sell_price?: number
  sell_price_text?: string
  asset_description?: {
    icon_url?: string
    icon_url_large?: string
    type?: string
    market_hash_name?: string
  }
}

type SteamSearch = {
  success?: boolean | number
  start?: number
  pagesize?: number
  total_count?: number
  results?: SteamHit[]
}

type ByMykelSkin = {
  name?: string
  image?: string
  weapon?: { name?: string }
  category?: { name?: string }
  pattern?: { name?: string }
  rarity?: { name?: string; color?: string }
  stattrak?: boolean
  souvenir?: boolean
  wears?: { name?: string }[]
  collections?: { name?: string }[]
}

const BYMYKEL = 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json'
const CATALOGUE_TTL = 6 * 60 * 60_000

let building: Promise<SkinListing[]> | null = null

function listingFromSteam(hit: SteamHit, rank: number): SkinListing | null {
  const hash = (hit.asset_description?.market_hash_name || hit.hash_name || hit.name || '').trim()
  if (!hash) return null
  const type = hit.asset_description?.type || ''
  if (!isWeaponMarketType(type)) return null
  const parts = parseSkinParts(hash)
  const rarity = rarityFromSteamType(type)
  const lowest = typeof hit.sell_price === 'number' && hit.sell_price > 0 ? hit.sell_price / 100 : null
  const icon = hit.asset_description?.icon_url_large || hit.asset_description?.icon_url || ''
  return {
    id: skinId(hash),
    marketHashName: hash,
    weapon: parts.weapon,
    finish: parts.finish,
    wear: parts.wear,
    wearShort: parts.wear ? WEAR_SHORT[parts.wear] : '',
    category: categoryFromSteamType(type),
    rarity,
    rarityColor: RARITY_COLORS[rarity] || '#4b69ff',
    collection: '',
    stattrak: parts.stattrak,
    souvenir: parts.souvenir,
    star: parts.star,
    image: steamImage(icon),
    quoteUsd: null,
    lowestUsd: lowest,
    volume: '',
    quoteSource: lowest != null ? 'steam_ask' : 'unavailable',
    quoteAt: new Date().toISOString(),
    rank,
  }
}

const STEAM_TYPES = [
  'tag_CSGO_Type_Knife',
  'tag_Type_Hands',
  'tag_CSGO_Type_SniperRifle',
  'tag_CSGO_Type_Rifle',
  'tag_CSGO_Type_Pistol',
  'tag_CSGO_Type_SMG',
  'tag_CSGO_Type_Shotgun',
  'tag_CSGO_Type_Machinegun',
]

async function searchSteamPage(start: number, typeTag?: string): Promise<SteamHit[]> {
  const type = typeTag ? `&category_730_Type[]=${encodeURIComponent(typeTag)}` : ''
  const url = `https://steamcommunity.com/market/search/render/?query=&start=${start}&count=100&search_descriptions=0&sort_column=price&sort_dir=desc&appid=730&norender=1&currency=1${type}`
  const res = await steamGet(url)
  if (!res.ok) throw new Error(`Steam search ${res.status}`)
  const json = await res.json() as SteamSearch
  if (!json.success) throw new Error('Steam search returned unsuccessful')
  return json.results || []
}

function hydrateListing(row: SkinListing): SkinListing {
  const cached = readStore().prices[row.marketHashName]
  if (cached) {
    row.quoteUsd = cached.median
    row.lowestUsd = cached.lowest ?? row.lowestUsd
    row.volume = cached.volume
    row.quoteSource = cached.median != null ? cached.source : (row.lowestUsd != null ? 'steam_ask' : 'unavailable')
    row.quoteAt = new Date(cached.at).toISOString()
    return row
  }
  if (row.lowestUsd != null) {
    writePrice(row.marketHashName, {
      median: null,
      lowest: row.lowestUsd,
      volume: '',
      source: 'steam_ask',
      at: Date.now(),
    })
  }
  return row
}

async function buildFromSteam(): Promise<SkinListing[]> {
  const seen = new Set<string>()
  const items: SkinListing[] = []
  for (const tag of STEAM_TYPES) {
    for (let start = 0; start < 200 && items.length < CATALOGUE_SIZE * 2; start += 100) {
      const page = await searchSteamPage(start, tag).catch((e: Error) => {
        logServer('steam', `${tag} ${e.message}`)
        return [] as SteamHit[]
      })
      if (!page.length) break
      for (const hit of page) {
        const row = listingFromSteam(hit, 0)
        if (!row || seen.has(row.marketHashName)) continue
        seen.add(row.marketHashName)
        items.push(hydrateListing(row))
      }
      await new Promise<void>((r) => setTimeout(r, 350))
    }
  }
  items.sort((a, b) => (b.lowestUsd ?? 0) - (a.lowestUsd ?? 0))
  const top = items.slice(0, CATALOGUE_SIZE).map((row, i) => ({ ...row, rank: i + 1 }))
  if (!top.length) throw new Error('Steam search returned no weapon listings')
  return top
}

function hashName(base: string, wear: string, stattrak: boolean, souvenir: boolean): string {
  const star = /^★/.test(base)
  let body = base.replace(/^★\s*/, '')
  if (stattrak) body = `StatTrak™ ${body}`
  if (souvenir) body = `Souvenir ${body}`
  const named = star ? `★ ${body}` : body
  return `${named} (${wear})`
}

async function buildFromByMykel(): Promise<SkinListing[]> {
  const res = await steamGet(BYMYKEL)
  if (!res.ok) throw new Error(`ByMykel ${res.status}`)
  const skins = await res.json() as ByMykelSkin[]
  const rows: SkinListing[] = []
  for (const skin of skins) {
    const base = (skin.name || '').trim()
    if (!base) continue
    const categoryName = skin.category?.name || ''
    const category = categoryFromSteamType(categoryName || skin.weapon?.name || '')
    if (category === 'Other' && !/knife|glove/i.test(categoryName)) continue
    const wears = (skin.wears || []).map((w) => w.name).filter(Boolean) as Wear[]
    const variants: Array<{ st: boolean; sv: boolean }> = [{ st: false, sv: false }]
    if (skin.stattrak) variants.push({ st: true, sv: false })
    if (skin.souvenir) variants.push({ st: false, sv: true })
    const rarity = skin.rarity?.name || 'Mil-Spec Grade'
    const image = (skin.image || '').startsWith('https://community.') || (skin.image || '').includes('steamstatic.com')
      ? skin.image || ''
      : ''
    for (const wear of wears) {
      for (const v of variants) {
        const hash = hashName(base, wear, v.st, v.sv)
        const parts = parseSkinParts(hash)
        rows.push({
          id: skinId(hash),
          marketHashName: hash,
          weapon: parts.weapon,
          finish: parts.finish,
          wear: parts.wear,
          wearShort: parts.wear ? WEAR_SHORT[parts.wear] : '',
          category,
          rarity,
          rarityColor: skin.rarity?.color || RARITY_COLORS[rarity] || '#4b69ff',
          collection: skin.collections?.[0]?.name || '',
          stattrak: v.st,
          souvenir: v.sv,
          star: parts.star,
          image,
          quoteUsd: null,
          lowestUsd: null,
          volume: '',
          quoteSource: 'unavailable',
          quoteAt: null,
          rank: 0,
        })
      }
    }
  }
  return rows.slice(0, CATALOGUE_SIZE).map((row, i) => ({ ...row, rank: i + 1 }))
}

async function rebuild(): Promise<SkinListing[]> {
  try {
    const items = await buildFromSteam()
    writeCatalogue(items, Date.now())
    return items
  } catch (e) {
    logServer('steam', `catalogue steam ${(e as Error).message}`)
    const cached = readStore().catalogue
    if (cached.length) return cached
    const fallback = await buildFromByMykel()
    writeCatalogue(fallback, Date.now())
    return fallback
  }
}

export async function getCatalogue(force = false): Promise<SkinListing[]> {
  const s = readStore()
  if (!force && s.catalogue.length) {
    const stale = Date.now() - s.catalogueBuiltAt >= CATALOGUE_TTL
    if (stale && !building) {
      building = rebuild().finally(() => { building = null })
    }
    return s.catalogue
  }
  if (building) return building
  building = rebuild().finally(() => { building = null })
  return building
}

export function filterCatalogue(
  items: SkinListing[],
  input: { q?: string; category?: string; wear?: string },
): SkinListing[] {
  const q = (input.q || '').trim().toLowerCase()
  const category = (input.category || 'all') as SkinCategory | 'all'
  const wear = input.wear || 'all'
  return items.filter((row) => {
    if (category !== 'all' && row.category !== category) return false
    if (wear !== 'all' && row.wearShort !== wear && row.wear !== wear) return false
    if (!q) return true
    return `${row.marketHashName} ${row.weapon} ${row.finish} ${row.collection}`.toLowerCase().includes(q)
  })
}

export async function getSkin(id: string): Promise<SkinListing | null> {
  const items = await getCatalogue()
  const found = items.find((r) => r.id === id || r.marketHashName === id)
  if (!found) return null
  const quote = await fetchSteamMedian(found.marketHashName)
  return {
    ...found,
    quoteUsd: quote.median,
    lowestUsd: quote.lowest ?? found.lowestUsd,
    volume: quote.volume || found.volume,
    quoteSource: quote.source,
    quoteAt: new Date(quote.at).toISOString(),
  }
}

export function categoryList() {
  return CATEGORIES
}
