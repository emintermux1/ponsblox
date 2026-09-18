import { isAddress } from 'viem'
import { editorUserUrl, resolveEditorFeeTo } from './editorFees.ts'
import { stripHtml } from './format.ts'
import type { KnowledgePage, PageEditor, SearchHit, TrendingItem } from '../server/wikiTypes.ts'

export type { KnowledgePage, PageEditor, SearchHit, TrendingItem }

const SKIP = /^(Main_Page|Special:|Wikipedia:|File:|Portal:|Template:|Category:|Help:|User:|Talk:|Draft:|TimedText:|MediaWiki:|Module:|Book:)/i

function articleKey(title: string): string {
  return title.trim().replace(/ /g, '_')
}

function absUrl(url?: string | null): string | null {
  const v = (url || '').trim()
  if (!v) return null
  if (v.startsWith('//')) return `https:${v}`
  return v
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

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  const json = await res.json().catch(() => ({})) as T & { error?: string }
  if (!res.ok) throw new Error('Request failed')
  return json
}

async function wikiGet<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Request failed')
  return res.json() as Promise<T>
}

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

type TopPayload = {
  items?: { articles?: { article: string; views: number; rank: number }[] }[]
}

type ViewsPayload = {
  items?: { views?: number }[]
}

type ActionQuery = {
  query?: {
    pages?: Record<string, {
      pageid?: number
      pageprops?: { wikibase_item?: string; disambiguation?: string }
      langlinks?: { lang: string }[]
      revisions?: { user?: string; timestamp?: string; bot?: boolean }[]
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

async function searchRemote(q: string): Promise<SearchHit[]> {
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

async function fetchSummary(title: string): Promise<RestSummary | null> {
  const key = encodeURIComponent(articleKey(title))
  return wikiGet<RestSummary>(`https://en.wikipedia.org/api/rest_v1/page/summary/${key}`).catch(() => null)
}

async function fetchGrowth(title: string): Promise<number | null> {
  const start = ymd(utcDaysAgo(16))
  const end = ymd(utcDaysAgo(0))
  const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents/${encodeURIComponent(articleKey(title))}/daily/${start}/${end}`
  const data = await wikiGet<ViewsPayload>(url).catch(() => ({ items: [] as { views?: number }[] }))
  const series = (data.items || []).map((i) => Number(i.views || 0)).filter((n) => Number.isFinite(n))
  const complete = series.slice(0, -1)
  const used = complete.length ? complete : series
  const last7 = used.slice(-7)
  const prev7 = used.slice(-14, -7)
  const views7d = last7.length ? last7.reduce((a, b) => a + b, 0) : 0
  const viewsPrev7d = prev7.length ? prev7.reduce((a, b) => a + b, 0) : 0
  if (!viewsPrev7d) return null
  return ((views7d - viewsPrev7d) / viewsPrev7d) * 100
}

async function hydrateTop(limit: number): Promise<TrendingItem[]> {
  const top = (await topArticles()).slice(0, limit)
  const rows = await Promise.all(top.map(async (row) => {
    const title = row.article.replace(/_/g, ' ')
    const [summary, growthPct] = await Promise.all([
      fetchSummary(title),
      fetchGrowth(title),
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
      growthPct,
      views24h: null as number | null,
    } satisfies TrendingItem
  }))
  return rows.filter((r): r is TrendingItem => r !== null)
}

async function fetchUserWallet(username: string): Promise<string | null> {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(username) || /:/.test(username)) return null
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(`User:${username}`)}&prop=revisions&rvprop=content&rvslots=main&format=json&origin=*`
  const data = await wikiGet<UserPageQuery>(url).catch(() => null)
  const page = Object.values(data?.query?.pages || {})[0]
  if (!page || page.missing !== undefined) return null
  const rev = page.revisions?.[0]
  const text = rev?.slots?.main?.content || rev?.slots?.main?.['*'] || rev?.['*'] || ''
  const hits = text.match(/0x[a-fA-F0-9]{40}/g) || []
  for (const h of hits) {
    if (isAddress(h)) return h
  }
  return null
}

async function fetchPageEditor(title: string): Promise<PageEditor | null> {
  const url = `https://en.wikipedia.org/w/api.php?action=query&prop=revisions&titles=${encodeURIComponent(title)}&rvlimit=25&rvprop=user|timestamp|flags&redirects=1&format=json&origin=*`
  const data = await wikiGet<ActionQuery>(url).catch(() => null)
  const page = Object.values(data?.query?.pages || {})[0]
  const revs = page?.revisions || []
  const picked = revs.find((r) => r.user && !r.bot && !/bot$/i.test(r.user)) || revs[0]
  if (!picked?.user) return null
  const wallet = await fetchUserWallet(picked.user).catch(() => null)
  const route = resolveEditorFeeTo(wallet)
  return {
    name: picked.user,
    timestamp: picked.timestamp || null,
    userUrl: editorUserUrl(picked.user),
    wallet,
    feeTo: route.feeTo,
    held: route.kind === 'held',
  }
}

async function loadPageRemote(title: string): Promise<KnowledgePage> {
  const raw = title.trim()
  const [summary, propsData, editor] = await Promise.all([
    fetchSummary(raw),
    wikiGet<ActionQuery>(`https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(raw)}&prop=pageprops|langlinks&ppprop=wikibase_item|disambiguation&lllimit=500&format=json&origin=*`).catch(() => null),
    fetchPageEditor(raw),
  ])
  if (!summary?.title && !summary?.pageid) throw new Error('That Wikipedia page could not be opened.')
  const page = Object.values(propsData?.query?.pages || {})[0]
  const canonical = summary?.titles?.normalized || summary?.title || raw
  const qid = page?.pageprops?.wikibase_item || null
  const type: KnowledgePage['type'] = summary?.type === 'disambiguation' || page?.pageprops?.disambiguation !== undefined
    ? 'disambiguation'
    : summary?.type === 'standard'
      ? 'standard'
      : 'other'
  let launchBlock: string | null = null
  if (type === 'disambiguation') launchBlock = 'This is a disambiguation page. Choose a specific article before pairing.'
  else if (summary?.namespace?.id != null && summary.namespace.id !== 0) launchBlock = 'Only main-namespace Wikipedia articles can be paired.'
  else if (!summary?.pageid && page?.pageid == null) launchBlock = 'This title is not a Wikipedia article.'
  else if (!qid) launchBlock = 'No Wikidata entity is attached to this page, so it cannot be verified for launch.'
  const pageid = summary?.pageid || page?.pageid || 0
  return {
    title: canonical,
    displayTitle: stripHtml(summary?.displaytitle || canonical),
    pageid,
    qid,
    extract: summary?.extract || '',
    description: summary?.description || '',
    thumbnail: absUrl(summary?.thumbnail?.source),
    originalImage: absUrl(summary?.originalimage?.source),
    wikipediaUrl: summary?.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(articleKey(canonical))}`,
    wikidataUrl: qid ? `https://www.wikidata.org/wiki/${qid}` : null,
    type,
    launchable: launchBlock == null && pageid > 0,
    launchBlock,
    index: {
      views24h: null,
      views7d: null,
      viewsPrev7d: null,
      growthPct: null,
      edits: null,
      languages: 1 + (page?.langlinks?.length || 0),
      rank: null,
    },
    editor,
  }
}

export async function searchWiki(q: string): Promise<SearchHit[]> {
  try {
    const data = await getJson<{ results: SearchHit[] }>(`/api/wiki/search?q=${encodeURIComponent(q)}`)
    if (data.results?.length) return data.results
  } catch { /* Wikimedia in the browser */ }
  return searchRemote(q)
}

export async function fetchPage(title: string): Promise<KnowledgePage> {
  try {
    const page = await getJson<KnowledgePage>(`/api/wiki/page?title=${encodeURIComponent(title)}`)
    if (page?.title) return page
  } catch { /* Wikimedia in the browser */ }
  return loadPageRemote(title)
}

export async function fetchTrending(): Promise<TrendingItem[]> {
  try {
    const data = await getJson<{ results: TrendingItem[] }>('/api/wiki/trending')
    if (data.results?.length) return data.results
  } catch { /* Wikimedia in the browser */ }
  return hydrateTop(10)
}

export async function fetchMostViewed(): Promise<TrendingItem[]> {
  try {
    const data = await getJson<{ results: TrendingItem[] }>('/api/wiki/top')
    if (data.results?.length) return data.results
  } catch { /* Wikimedia in the browser */ }
  return hydrateTop(16)
}
