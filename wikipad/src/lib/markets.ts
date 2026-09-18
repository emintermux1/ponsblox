import type { Address } from 'viem'
import { isOfficialToken, WIKIPAD_OFFICIAL_TOKEN, WIKIPAD_TICKER } from '../config/official.ts'
import { sameTopic, type WikiBinding } from './metadata.ts'
import { ZERO } from './pons/config.ts'
import {
  filterWikiHits,
  launchTimesFromHits,
  readToken,
  scanRecentLaunches,
  type TokenRecord,
} from './pons/index.ts'

const LS = 'wikipad.launches'
const CACHE_LS = 'wikipad.markets.v2'

/** Real factory tokens whose on-chain description binds a Wikipedia page. */
const KNOWN_WIKI_MARKETS: { token: Address; name: string; title: string; qid: string; pageid: number }[] = [
  { token: '0x7aec9316dfbe24cd99a7a1e802606c8f336145f0', name: 'Robin Hood', title: 'Robin Hood', qid: 'Q122634', pageid: 26171 },
  { token: '0xeb491c8cb4ea810ba1f5a8a5b466912e4cbf0c4f', name: 'Adolf Hitler', title: 'Adolf Hitler', qid: 'Q352', pageid: 2731583 },
  { token: '0xcbe67d43e9350bf835ec3cf132b7b0968d26d015', name: 'MASTER', title: 'Vlad Tenev', qid: 'Q56248473', pageid: 57971100 },
  { token: '0xbcfcaad58d590a764c30f55c2a49957acad708a4', name: 'Vlad the Impaler', title: 'Vlad the Impaler', qid: 'Q43715', pageid: 716868 },
  { token: '0xc1a19375c4f401becfb93be37a22b7ef925329da', name: 'September 11 attacks', title: 'September 11 attacks', qid: 'Q10806', pageid: 5058690 },
  { token: '0x9111cb15edc196653fe95050cae18534c4051c6a', name: 'September 11 attacks', title: 'September 11 attacks', qid: 'Q10806', pageid: 5058690 },
  { token: '0xd0dc7217988ad3130a41aa061b966ccceb0e106c', name: 'September 11 attacks', title: 'September 11 attacks', qid: 'Q10806', pageid: 5058690 },
  { token: '0x67330a9b3567ab197de68a7a1c4f3d02a3ab5766', name: 'The Falling Man', title: 'The Falling Man', qid: 'Q1259460', pageid: 4416125 },
  { token: '0xb5589ad160c82bd4a137e9de5f2253c1442b8e98', name: 'The Falling Man', title: 'The Falling Man', qid: 'Q1259460', pageid: 4416125 },
  { token: '0xc5224d692c91a356e48b931cf7749aaf1ac9c022', name: 'MrWhite', title: 'Pablo Escobar', qid: 'Q187447', pageid: 161570 },
  { token: '0xc18437b9cd5d768cbb480ee8737c115a7aae6ca4', name: 'YooHoo & Friends (2009 TV series)', title: 'YooHoo & Friends (2009 TV series)', qid: 'Q8055128', pageid: 27723352 },
  { token: '0xea3872e2f346d948b4d2e347ca3317f414769879', name: 'Cat', title: 'Cat', qid: 'Q146', pageid: 6678 },
]

const KNOWN_WIKI_TOKENS = KNOWN_WIKI_MARKETS.map((r) => r.token)

export type RememberedLaunch = {
  token: string
  title: string
  pageid: number | null
  qid: string | null
  symbol: string
  hash: string
  at: number
}

type CachedMarket = {
  token: string
  name: string
  symbol: string
  logo: string
  curve: string
  pairSymbol: string
  title: string
  pageid: number | null
  qid: string | null
  url: string
  launchedAt: number | null
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    const rows = raw ? JSON.parse(raw) as T : fallback
    return rows ?? fallback
  } catch {
    return fallback
  }
}

function readLocal(): RememberedLaunch[] {
  const rows = readJson<RememberedLaunch[]>(LS, [])
  return Array.isArray(rows) ? rows : []
}

function writeLocal(rows: RememberedLaunch[]) {
  try {
    localStorage.setItem(LS, JSON.stringify(rows.slice(0, 200)))
  } catch { /* quota */ }
}

function readCache(): CachedMarket[] {
  const rows = readJson<CachedMarket[]>(CACHE_LS, [])
  return Array.isArray(rows) ? rows : []
}

function writeCache(rows: TokenRecord[]) {
  const slim: CachedMarket[] = rows.map((r) => ({
    token: r.token,
    name: r.name,
    symbol: r.symbol,
    logo: r.logo,
    curve: r.curve,
    pairSymbol: r.pairSymbol,
    title: r.wiki?.title || '',
    pageid: r.wiki?.pageid ?? null,
    qid: r.wiki?.qid ?? null,
    url: r.wiki?.url || '',
    launchedAt: r.launchedAt ?? null,
  }))
  try {
    localStorage.setItem(CACHE_LS, JSON.stringify(slim.slice(0, 200)))
  } catch { /* quota */ }
}

export function rememberLaunch(row: RememberedLaunch) {
  const prev = readLocal().find((r) => r.token.toLowerCase() === row.token.toLowerCase())
  const at = row.at && prev?.at ? Math.min(row.at, prev.at) : (row.at || prev?.at || Date.now())
  const next = [{
    ...row,
    at,
    hash: row.hash || prev?.hash || '',
  }, ...readLocal().filter((r) => r.token.toLowerCase() !== row.token.toLowerCase())]
  writeLocal(next)
}

export function readRemembered(): RememberedLaunch[] {
  return readLocal()
}

function rowFromKnown(k: (typeof KNOWN_WIKI_MARKETS)[number]): TokenRecord {
  return {
    ...officialStub(),
    token: k.token,
    name: k.name,
    symbol: k.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 11).toUpperCase() || 'WIKI',
    wiki: {
      title: k.title,
      pageid: k.pageid,
      qid: k.qid,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(k.title.replace(/ /g, '_'))}`,
    },
  }
}

export function seedMarkets(): TokenRecord[] {
  return finishRows([
    officialStub(),
    ...KNOWN_WIKI_MARKETS.map(rowFromKnown),
    ...readCache().map(rowFromCache),
    ...readLocal().map(rowFromRemembered),
  ])
}

function officialStub(): TokenRecord {
  return {
    token: WIKIPAD_OFFICIAL_TOKEN as Address,
    curve: ZERO,
    deployer: ZERO,
    creatorFeeRecipient: ZERO,
    pairToken: ZERO,
    pairSymbol: 'ETH',
    graduationThreshold: '0',
    creatorTaxBps: 0,
    buybackEnabled: false,
    phase: 0,
    exists: true,
    name: 'WikiPad',
    symbol: WIKIPAD_TICKER.replace(/^\$/, ''),
    logo: '/logo.png',
    description: 'Official WikiPad token on Pons V2.',
    website: '',
    wiki: null,
    graduated: false,
    readyToGraduate: false,
    quoteReserve: '0',
    tokenReserve: '0',
    sellableTokens: '0',
    totalSupply: '0',
    priceRblx: null,
    capRblx: null,
    launchedAt: null,
  }
}

function rowFromCache(c: CachedMarket): TokenRecord {
  const wiki = c.title || c.qid
    ? { title: c.title || c.qid || 'Unknown', pageid: c.pageid, qid: c.qid, url: c.url } satisfies WikiBinding
    : null
  return {
    ...officialStub(),
    token: c.token as Address,
    name: c.name || 'Unknown',
    symbol: c.symbol || '???',
    logo: isOfficialToken(c.token) ? (c.logo || '/logo.png') : c.logo,
    curve: (c.curve || ZERO) as Address,
    pairSymbol: c.pairSymbol || 'ETH',
    wiki,
    launchedAt: c.launchedAt,
  }
}

function rowFromRemembered(r: RememberedLaunch): TokenRecord {
  return {
    ...officialStub(),
    token: r.token as Address,
    name: r.title || r.symbol || 'Unknown',
    symbol: r.symbol || '???',
    logo: isOfficialToken(r.token) ? '/logo.png' : '',
    wiki: bindingFromRemembered(r),
    launchedAt: r.at,
  }
}

function keepMarket(row: TokenRecord, remembered: Set<string>): boolean {
  if (isOfficialToken(row.token)) return true
  if (row.wiki) return true
  return remembered.has(row.token.toLowerCase())
}

function finishRows(input: TokenRecord[]): TokenRecord[] {
  const byAddr = new Map<string, TokenRecord>()
  for (const row of input) {
    const key = row.token.toLowerCase()
    const prev = byAddr.get(key)
    if (!prev) {
      byAddr.set(key, row)
      continue
    }
    byAddr.set(key, {
      ...prev,
      ...row,
      logo: row.logo || prev.logo,
      wiki: row.wiki || prev.wiki,
      launchedAt: row.launchedAt ?? prev.launchedAt ?? null,
      curve: row.curve && row.curve !== ZERO ? row.curve : prev.curve,
    })
  }
  const rows = [...byAddr.values()]
  if (!rows.some((r) => isOfficialToken(r.token))) rows.unshift(officialStub())
  const official = rows.find((r) => isOfficialToken(r.token))
  if (official && !official.logo) official.logo = '/logo.png'
  rows.sort((a, b) => {
    const off = Number(isOfficialToken(b.token)) - Number(isOfficialToken(a.token))
    if (off) return off
    return (b.launchedAt ?? 0) - (a.launchedAt ?? 0)
  })
  return rows
}

async function hydrate(
  hits: { token: string; blockNumber?: bigint }[],
  remembered: Set<string>,
  local: RememberedLaunch[],
): Promise<TokenRecord[]> {
  const times = await launchTimesFromHits(
    hits.filter((h): h is { token: Address; blockNumber: bigint } => typeof h.blockNumber === 'bigint'),
  ).catch(() => new Map<string, number>())
  const addrs = [...new Set([
    WIKIPAD_OFFICIAL_TOKEN.toLowerCase(),
    ...KNOWN_WIKI_TOKENS,
    ...local.map((r) => r.token.toLowerCase()),
    ...readCache().map((r) => r.token.toLowerCase()),
    ...hits.map((h) => h.token.toLowerCase()),
  ])]
  const live = (await Promise.all(addrs.map(async (a) => {
    const row = await readToken(a as Address).catch(() => null)
    if (!row) {
      if (isOfficialToken(a)) return officialStub()
      const known = KNOWN_WIKI_MARKETS.find((k) => k.token.toLowerCase() === a)
      if (known) return rowFromKnown(known)
      const cached = readCache().find((c) => c.token.toLowerCase() === a)
      if (cached) return rowFromCache(cached)
      const mem = local.find((r) => r.token.toLowerCase() === a)
      return mem ? rowFromRemembered(mem) : null
    }
    const localAt = local.find((r) => r.token.toLowerCase() === a)?.at
    row.launchedAt = times.get(a) ?? localAt ?? row.launchedAt ?? null
    if (isOfficialToken(row.token) && !row.logo) row.logo = '/logo.png'
    return row
  }))).filter((r): r is TokenRecord => r !== null && keepMarket(r, remembered))
  return finishRows(live)
}

function persist(rows: TokenRecord[]) {
  writeCache(rows)
  for (const r of rows) {
    if (!r.wiki) continue
    rememberLaunch({
      token: r.token,
      title: r.wiki.title,
      pageid: r.wiki.pageid,
      qid: r.wiki.qid,
      symbol: r.symbol,
      hash: '',
      at: r.launchedAt ?? Date.now(),
    })
  }
}

export async function loadWikiMarkets(onUpdate?: (rows: TokenRecord[]) => void): Promise<TokenRecord[]> {
  const fallback = seedMarkets()
  onUpdate?.(fallback)
  try {
    const local = readLocal()
    const remembered = new Set(local.map((r) => r.token.toLowerCase()))

    const wikiHits = new Map<string, { token: Address; blockNumber: bigint }>()
    let rows = await hydrate([], remembered, local).catch(() => fallback)
    persist(rows)
    onUpdate?.(rows)

    async function absorb(hits: { token: Address; blockNumber: bigint }[]) {
      for (const hit of hits) wikiHits.set(hit.token.toLowerCase(), hit)
      rows = await hydrate([...wikiHits.values()], remembered, local).catch(() => rows)
      persist(rows)
      onUpdate?.(rows)
    }

    const recent = await scanRecentLaunches({ windows: 20, chunk: 4000n }).catch(() => [])
    recent.sort((a, b) => (a.blockNumber < b.blockNumber ? 1 : -1))
    for (let i = 0; i < recent.length; i += 80) {
      const slice = recent.slice(i, i + 80)
      const wiki = await filterWikiHits(slice).catch(() => [])
      if (wiki.length) await absorb(wiki)
    }
    if (!recent.length) {
      rows = await hydrate([], remembered, local).catch(() => fallback)
      persist(rows)
      onUpdate?.(rows)
    }

    const deep = await scanRecentLaunches({ windows: 48, chunk: 4000n }).catch(() => [])
    deep.sort((a, b) => (a.blockNumber < b.blockNumber ? 1 : -1))
    for (let i = 0; i < deep.length; i += 80) {
      const slice = deep.slice(i, i + 80)
      const wiki = await filterWikiHits(slice).catch(() => [])
      if (wiki.length) await absorb(wiki)
    }
    return rows
  } catch {
    return finishRows(fallback)
  }
}

export function marketsForTopic(
  rows: TokenRecord[],
  title: string,
  qid: string | null,
  pageid: number | null,
): TokenRecord[] {
  return rows.filter((r) => r.wiki && sameTopic(r.wiki, title, qid, pageid))
}

export function bindingFromRemembered(row: RememberedLaunch): WikiBinding {
  return {
    title: row.title,
    pageid: row.pageid,
    qid: row.qid,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(row.title.replace(/ /g, '_'))}`,
  }
}
