import { isAddress } from 'viem'
import { editorUserUrl, resolveEditorFeeTo } from '../lib/editorFees.ts'
import { stripHtml } from '../lib/format.ts'
import type { KnowledgeIndex, KnowledgePage, PageEditor, SearchHit, TrendingItem } from './wikiTypes.ts'

const UA = 'WikiPad/1.0 (https://wikipad; knowledge markets on Pons V2; ponsblox)'
const cache = new Map<string, { at: number; value: unknown }>()
const TTL = 5 * 60_000

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function ymd(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

function utcDaysAgo(n: number): Date {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - n)
  return d
}

function articleKey(title: string): string {
  return title.trim().replace(/ /g, '_')
}

function absUrl(url?: string | null): string | null {
  const v = (url || '').trim()
  if (!v) return null
  if (v.startsWith('//')) return `https:${v}`
  return v
}

async function wikiGet<T>(url: string): Promise<T> {
  const hit = cache.get(url)
  if (hit && Date.now() - hit.at < TTL) return hit.value as T
  const res = await fetch(url, {
    headers: { 'user-agent': UA, accept: 'application/json' },
  })
  if (!res.ok) {
    throw new ApiError(res.status === 404 ? 404 : 502, 'Wikipedia is unavailable. Try again.')
  }
  const json = await res.json() as T
  cache.set(url, { at: Date.now(), value: json })
  return json
}

const SKIP = /^(Main_Page|Special:|Wikipedia:|File:|Portal:|Template:|Category:|Help:|User:|Talk:|Draft:|TimedText:|MediaWiki:|Module:|Book:)/i

type RestSearch = {
  pages?: {
    id: number
    key: string
    title: string
    excerpt?: string
    description?: string
    thumbnail?: { url?: string }
  }[]
}

export async function searchPages(q: string): Promise<SearchHit[]> {
  const query = q.trim()
  if (!query) return []
  const url = `https://en.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(query)}&limit=12`
  const data = await wikiGet<RestSearch>(url)
  return (data.pages || [])
    .filter((p) => p.title && !SKIP.test(p.key || p.title.replace(/ /g, '_')))
    .map((p) => ({
      title: p.title,
      pageid: p.id,
      snippet: stripHtml(p.excerpt || ''),
      description: p.description || '',
      thumbnail: absUrl(p.thumbnail?.url),
      key: p.key,
    }))
}

type RestSummary = {
  type?: string
  title?: string
  displaytitle?: string
  pageid?: number
  extract?: string
  description?: string
  thumbnail?: { source?: string }
  originalimage?: { source?: string }
  content_urls?: { desktop?: { page?: string } }
  titles?: { canonical?: string; normalized?: string }
  namespace?: { id?: number }
}

type ActionQuery = {
  query?: {
    pages?: Record<string, {
      pageid?: number
      title?: string
      pageprops?: { wikibase_item?: string; disambiguation?: string }
      langlinks?: { lang: string }[]
    }>
  }
}

type ViewsPayload = {
  items?: { views?: number; timestamp?: string }[]
}

type TopPayload = {
  items?: { articles?: { article: string; views: number; rank: number }[] }[]
}

type EditCount = { count?: number }

type RevQuery = {
  query?: {
    pages?: Record<string, {
      revisions?: {
        user?: string
        timestamp?: string
        comment?: string
        anon?: boolean
        bot?: boolean
        minor?: boolean
      }[]
    }>
  }
}

type UserPageQuery = {
  query?: {
    pages?: Record<string, {
      missing?: string
      revisions?: {
        slots?: { main?: { content?: string; ['*']?: string } }
        ['*']?: string
      }[]
    }>
  }
}

type WdEntities = {
  entities?: Record<string, {
    id?: string
    labels?: { en?: { value?: string } }
    descriptions?: { en?: { value?: string } }
    missing?: string
  }>
}

async function fetchSummary(title: string): Promise<RestSummary> {
  const key = encodeURIComponent(articleKey(title))
  return wikiGet<RestSummary>(`https://en.wikipedia.org/api/rest_v1/page/summary/${key}`)
}

async function fetchProps(title: string): Promise<{ qid: string | null; languages: number; disambiguation: boolean; pageid: number | null }> {
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageprops|langlinks&ppprop=wikibase_item|disambiguation&lllimit=500&format=json&origin=*`
  const data = await wikiGet<ActionQuery>(url)
  const page = Object.values(data.query?.pages || {})[0]
  if (!page || page.pageid == null) return { qid: null, languages: 1, disambiguation: false, pageid: null }
  return {
    qid: page.pageprops?.wikibase_item || null,
    languages: 1 + (page.langlinks?.length || 0),
    disambiguation: page.pageprops?.disambiguation !== undefined,
    pageid: page.pageid,
  }
}

async function fetchQidFromWikidata(title: string): Promise<string | null> {
  const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&sites=enwiki&titles=${encodeURIComponent(title)}&props=labels&languages=en&format=json&origin=*`
  const data = await wikiGet<WdEntities>(url)
  const row = Object.values(data.entities || {})[0]
  if (!row || row.missing || !row.id) return null
  return row.id
}

async function fetchViews(title: string): Promise<{ views24h: number | null; views7d: number | null; viewsPrev7d: number | null; growthPct: number | null }> {
  const start = ymd(utcDaysAgo(16))
  const end = ymd(utcDaysAgo(0))
  const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents/${encodeURIComponent(articleKey(title))}/daily/${start}/${end}`
  const data = await wikiGet<ViewsPayload>(url).catch(() => ({ items: [] as { views?: number }[] }))
  const series = (data.items || []).map((i) => Number(i.views || 0)).filter((n) => Number.isFinite(n))
  if (!series.length) return { views24h: null, views7d: null, viewsPrev7d: null, growthPct: null }
  const complete = series.slice(0, -1)
  const used = complete.length ? complete : series
  const views24h = used[used.length - 1] ?? null
  const last7 = used.slice(-7)
  const prev7 = used.slice(-14, -7)
  const views7d = last7.length ? last7.reduce((a, b) => a + b, 0) : null
  const viewsPrev7d = prev7.length ? prev7.reduce((a, b) => a + b, 0) : null
  const growthPct = views7d != null && viewsPrev7d != null && viewsPrev7d > 0
    ? ((views7d - viewsPrev7d) / viewsPrev7d) * 100
    : null
  return { views24h, views7d, viewsPrev7d, growthPct }
}

async function fetchEdits(title: string): Promise<number | null> {
  const url = `https://en.wikipedia.org/w/rest.php/v1/page/${encodeURIComponent(articleKey(title))}/history/counts/edits`
  const data = await wikiGet<EditCount>(url).catch(() => ({ count: undefined }))
  return typeof data.count === 'number' ? data.count : null
}

function isBotName(user: string): boolean {
  return /bot$/i.test(user.trim()) || /\bbot\b/i.test(user)
}

function isIpUser(user: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(user) || /:/.test(user)
}

type WikiRevision = {
  user?: string
  timestamp?: string
  comment?: string
  anon?: boolean
  bot?: boolean
  minor?: boolean
}

function pickEditor(revs: WikiRevision[] | undefined): { name: string; timestamp: string | null } | null {
  const list = revs || []
  for (const r of list) {
    if (!r.user) continue
    if (r.bot) continue
    if (isBotName(r.user)) continue
    return { name: r.user, timestamp: r.timestamp || null }
  }
  const first = list[0]
  if (first?.user) return { name: first.user, timestamp: first.timestamp || null }
  return null
}

const ADDR_RE = /0x[a-fA-F0-9]{40}/g

async function fetchUserWallet(username: string): Promise<string | null> {
  if (isIpUser(username)) return null
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(`User:${username}`)}&prop=revisions&rvprop=content&rvslots=main&format=json&origin=*`
  const data = await wikiGet<UserPageQuery>(url).catch(() => null)
  if (!data) return null
  const page = Object.values(data.query?.pages || {})[0]
  if (!page || page.missing !== undefined) return null
  const rev = page.revisions?.[0]
  const text = rev?.slots?.main?.content || rev?.slots?.main?.['*'] || rev?.['*'] || ''
  const hits = text.match(ADDR_RE) || []
  for (const h of hits) {
    if (isAddress(h)) return h
  }
  return null
}

async function fetchPageEditor(title: string): Promise<PageEditor | null> {
  const url = `https://en.wikipedia.org/w/api.php?action=query&prop=revisions&titles=${encodeURIComponent(title)}&rvlimit=25&rvprop=user|timestamp|comment|flags&redirects=1&format=json&origin=*`
  const data = await wikiGet<RevQuery>(url).catch(() => null)
  const page = Object.values(data?.query?.pages || {})[0]
  const picked = pickEditor(page?.revisions)
  if (!picked) return null
  const wallet = await fetchUserWallet(picked.name).catch(() => null)
  const route = resolveEditorFeeTo(wallet)
  return {
    name: picked.name,
    timestamp: picked.timestamp,
    userUrl: editorUserUrl(picked.name),
    wallet,
    feeTo: route.feeTo,
    held: route.kind === 'held',
  }
}

async function fetchTopDay(offset: number): Promise<{ article: string; views: number; rank: number }[]> {
  const d = utcDaysAgo(offset)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/en.wikipedia/all-access/${y}/${m}/${day}`
  const data = await wikiGet<TopPayload>(url)
  return data.items?.[0]?.articles || []
}

async function topArticles(): Promise<{ article: string; views: number; rank: number }[]> {
  for (const offset of [1, 2, 3]) {
    const rows = await fetchTopDay(offset).catch(() => [])
    if (rows.length) return rows.filter((r) => !SKIP.test(r.article))
  }
  return []
}

export async function loadPage(title: string): Promise<KnowledgePage> {
  const raw = title.trim()
  if (!raw) throw new ApiError(400, 'Title is required')
  const [summary, props] = await Promise.all([
    fetchSummary(raw),
    fetchProps(raw),
  ])
  const canonical = summary.titles?.normalized || summary.titles?.canonical || summary.title || raw
  const type: KnowledgePage['type'] = summary.type === 'disambiguation' || props.disambiguation
    ? 'disambiguation'
    : summary.type === 'standard'
      ? 'standard'
      : 'other'
  let qid = props.qid
  if (!qid) qid = await fetchQidFromWikidata(canonical).catch(() => null)

  const [views, edits, top, editor] = await Promise.all([
    fetchViews(canonical),
    fetchEdits(canonical),
    topArticles().catch(() => [] as { article: string; rank: number }[]),
    fetchPageEditor(canonical).catch(() => null),
  ])
  const rank = top.find((r) => r.article.replace(/_/g, ' ').toLowerCase() === canonical.replace(/_/g, ' ').toLowerCase())?.rank ?? null

  const ns = summary.namespace?.id
  let launchBlock: string | null = null
  if (type === 'disambiguation') launchBlock = 'This is a disambiguation page. Choose a specific article before pairing.'
  else if (ns != null && ns !== 0) launchBlock = 'Only main-namespace Wikipedia articles can be paired.'
  else if (!summary.pageid && !props.pageid) launchBlock = 'This title is not a Wikipedia article.'
  else if (!qid) launchBlock = 'No Wikidata entity is attached to this page, so it cannot be verified for launch.'

  const index: KnowledgeIndex = {
    views24h: views.views24h,
    views7d: views.views7d,
    viewsPrev7d: views.viewsPrev7d,
    growthPct: views.growthPct,
    edits,
    languages: props.languages,
    rank,
  }

  const pageid = summary.pageid || props.pageid || 0
  return {
    title: canonical,
    displayTitle: stripHtml(summary.displaytitle || canonical),
    pageid,
    qid,
    extract: summary.extract || '',
    description: summary.description || '',
    thumbnail: absUrl(summary.thumbnail?.source),
    originalImage: absUrl(summary.originalimage?.source),
    wikipediaUrl: summary.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(articleKey(canonical))}`,
    wikidataUrl: qid ? `https://www.wikidata.org/wiki/${qid}` : null,
    type,
    launchable: launchBlock == null && pageid > 0,
    launchBlock,
    index,
    editor,
  }
}

async function hydrateTop(limit: number): Promise<TrendingItem[]> {
  const top = (await topArticles()).slice(0, limit)
  const rows = await Promise.all(top.map(async (row) => {
    const title = row.article.replace(/_/g, ' ')
    const [summary, views] = await Promise.all([
      fetchSummary(title).catch(() => null),
      fetchViews(title).catch(() => ({ views24h: null, growthPct: null as number | null })),
    ])
    if (summary?.type === 'disambiguation') return null
    return {
      title: summary?.titles?.normalized || summary?.title || title,
      pageid: summary?.pageid ?? null,
      extract: (summary?.extract || '').slice(0, 220),
      description: summary?.description || '',
      thumbnail: absUrl(summary?.thumbnail?.source),
      views: row.views,
      rank: row.rank,
      growthPct: views.growthPct,
      views24h: views.views24h,
    } satisfies TrendingItem
  }))
  return rows.filter((r): r is TrendingItem => r !== null)
}

export async function loadTrending(): Promise<TrendingItem[]> {
  return hydrateTop(10)
}

export async function loadMostViewed(): Promise<TrendingItem[]> {
  return hydrateTop(16)
}
