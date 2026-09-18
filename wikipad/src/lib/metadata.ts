export type WikiBinding = {
  title: string
  pageid: number | null
  qid: string | null
  url: string
  editorName?: string | null
  editorFeeTo?: string | null
}

export type WikiPadMetadata = {
  name: string
  symbol: string
  description: string
  image: string
  external_url: string
  wikipedia_page_id: number
  wikipedia_title: string
  wikidata_qid: string
  wikipediaTitle: string
  wikidataId: string
  editorName: string
  editorFeeTo: string
  thumbnail: string
  ticker: string
  wikipad: {
    factory: 'Pons V2'
    chainId: number
    product: 'WikiPad'
  }
}

const WIKI_RE = /(?:https?:\/\/)?(?:[a-z]{2,3}\.)?wikipedia\.org\/wiki\/([^?\s#]+)/i
const QID_RE = /\bQ\d+\b/
const PAGEID_RE = /pageid[:\s]*(\d+)/i

export function normalizeTitle(title: string): string {
  return decodeURIComponent(title.replace(/_/g, ' ')).trim().toLowerCase()
}

export function wikiPathTitle(title: string): string {
  return title.trim().replace(/ /g, '_')
}

export function wikiWebsite(title: string): string {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(wikiPathTitle(title)).replace(/%2F/gi, '/')}`
}

export function wikiDescription(page: {
  title: string
  pageid: number
  qid: string | null
  extract: string
  editorName?: string
  editorFeeTo?: string
  held?: boolean
}): string {
  const q = page.qid || 'no-qid'
  const extract = page.extract.replace(/\s+/g, ' ').trim().slice(0, 220)
  const editor = page.editorName
    ? ` Editor: ${page.editorName}.${page.editorFeeTo ? ` editorFeeTo:${page.editorFeeTo}.` : ''}${page.held ? ' Fees reserved for this writer.' : ''}`
    : ''
  return `Paired with Wikipedia “${page.title}” (${q}, pageid:${page.pageid}) on WikiPad.${editor} ${extract}`
}

export function parseWikiBinding(website: string, description: string, extra = ''): WikiBinding | null {
  const blob = `${website}\n${description}\n${extra}`
  const urlHit = blob.match(WIKI_RE)
  const qid = blob.match(QID_RE)?.[0] || null
  const pageidRaw = blob.match(PAGEID_RE)?.[1]
  const pageid = pageidRaw ? Number(pageidRaw) : null
  const wikipad = /WikiPad/i.test(blob)
  if (!urlHit && !qid && pageid == null && !wikipad) return null
  const titled = description.match(/Wikipedia [“"]([^”"]+)[”"]/i)?.[1] || ''
  const titleFromUrl = urlHit ? decodeURIComponent(urlHit[1].replace(/_/g, ' ')) : ''
  const title = titleFromUrl || titled
  if (!title && !qid && pageid == null) return null
  const editorName = blob.match(/Editor:\s*([^\n.]+)/i)?.[1]?.trim() || null
  const editorFeeTo = blob.match(/editorFeeTo:\s*(0x[a-fA-F0-9]{40})/i)?.[1] || null
  return {
    title: title || qid || 'Unknown',
    pageid: Number.isFinite(pageid) ? pageid : null,
    qid,
    url: urlHit ? `https://en.wikipedia.org/wiki/${urlHit[1]}` : (title ? wikiWebsite(title) : website || ''),
    editorName,
    editorFeeTo,
  }
}

export function sameTopic(
  binding: WikiBinding,
  title: string,
  qid: string | null,
  pageid: number | null,
): boolean {
  if (qid && binding.qid && qid === binding.qid) return true
  if (pageid && binding.pageid && pageid === binding.pageid) return true
  return normalizeTitle(binding.title) === normalizeTitle(title)
}

export function buildMetadata(input: {
  name: string
  symbol: string
  description: string
  image: string
  title: string
  pageid: number
  qid: string
  thumbnail: string
  editorName?: string
  editorFeeTo?: string
}): WikiPadMetadata {
  const wikipediaTitle = input.title
  const wikidataId = input.qid
  const editorName = (input.editorName || '').trim()
  const editorFeeTo = (input.editorFeeTo || '').trim()
  return {
    name: input.name.trim(),
    symbol: input.symbol.trim().toUpperCase(),
    description: input.description.trim(),
    image: input.image.trim(),
    external_url: wikiWebsite(input.title),
    wikipedia_page_id: input.pageid,
    wikipedia_title: wikipediaTitle,
    wikidata_qid: wikidataId,
    wikipediaTitle,
    wikidataId,
    editorName,
    editorFeeTo,
    thumbnail: input.thumbnail,
    ticker: input.symbol.trim().toUpperCase(),
    wikipad: { factory: 'Pons V2', chainId: 4663, product: 'WikiPad' },
  }
}

export function suggestTicker(title: string): string {
  const compact = title.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  if (compact.length >= 2 && compact.length <= 11) return compact
  if (compact.length > 11) return compact.slice(0, 11)
  const words = title.split(/[^A-Za-z0-9]+/).filter(Boolean)
  const initials = words.map((w) => w[0] || '').join('').toUpperCase()
  if (initials.length >= 2) return initials.slice(0, 11)
  return (compact || 'WIKI').padEnd(2, 'X').slice(0, 11)
}
