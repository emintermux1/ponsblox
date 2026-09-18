import type { SnapKind } from '../lib/snap.ts'

export type ResolvedSnap = {
  kind: SnapKind
  url: string
  account: string
  name: string
  caption: string
  image: string
  videoUrl?: string
  snapUrl?: string
}

function decode(value: string): string {
  return value
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
}

function meta(html: string, prop: string): string {
  const re = new RegExp(`property="${prop}" content="([^"]+)"`, 'i')
  const m = html.match(re)
  return m?.[1] ? decode(m[1]) : ''
}

function jsonLd(html: string): Record<string, unknown>[] {
  const blocks = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)]
  const out: Record<string, unknown>[] = []
  for (const block of blocks) {
    try {
      const parsed = JSON.parse(block[1]) as Record<string, unknown>
      out.push(parsed)
    } catch {
      /* skip */
    }
  }
  return out
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' ? v as Record<string, unknown> : null
}

function targetUrl(raw: string): string | null {
  const text = raw.trim()
  if (!text) return null
  if (/^https?:\/\//i.test(text)) {
    try {
      const url = new URL(text)
      const host = url.hostname.replace(/^www\./, '')
      if (host !== 'snapchat.com' && host !== 't.snapchat.com' && !host.endsWith('.snapchat.com')) {
        return null
      }
      return url.toString()
    } catch {
      return null
    }
  }
  const handle = text.replace(/^@/, '').replace(/[^A-Za-z0-9._-]/g, '')
  if (!handle) return null
  return `https://www.snapchat.com/@${handle}`
}

export function parseSnapchatHtml(html: string, pageUrl: string): ResolvedSnap | null {
  const ld = jsonLd(html)
  const page = ld.find((x) => x['@type'] === 'ProfilePage')
  const entity = asRecord(page?.mainEntity) || ld.find((x) => x['@type'] === 'Organization' || x['@type'] === 'Person') || null
  const video = asRecord(ld.find((x) => x['@type'] === 'VideoObject'))
  const name = String(entity?.name || meta(html, 'og:title').replace(/\s+Snapchat.*$/, '') || '').trim()
  const handle = String(entity?.alternateName || '')
  const caption = String(video?.name || entity?.description || meta(html, 'og:description') || '').trim()
  const image = String(video?.thumbnailUrl || entity?.image || meta(html, 'og:image') || '').trim()
  const videoUrl = String(
    video?.contentUrl || video?.contentURL || video?.embedUrl
    || meta(html, 'og:video:secure_url') || meta(html, 'og:video:url') || meta(html, 'og:video') || '',
  ).trim()
  const snapUrl = String(video?.url || asRecord(video?.mainEntityOfPage)?.['@id'] || '').trim()
  const url = new URL(pageUrl)
  const fromPath = url.pathname.match(/@([^/]+)/)?.[1] || url.pathname.match(/\/add\/([^/]+)/)?.[1] || handle
  if (!fromPath && !name) return null
  const account = `@${(fromPath || handle || 'snap').toLowerCase()}`
  const kind: SnapKind = video ? 'spotlight' : url.pathname.includes('spotlight') ? 'spotlight' : 'story'
  return {
    kind,
    url: snapUrl || `https://www.snapchat.com/@${account.slice(1)}`,
    account,
    name: name || account.slice(1),
    caption: caption.slice(0, 120),
    image,
    videoUrl: videoUrl || undefined,
    snapUrl: snapUrl || undefined,
  }
}

export async function resolveSnapchatPage(raw: string): Promise<ResolvedSnap | null> {
  const url = targetUrl(raw)
  if (!url) return null
  const res = await fetch(url, {
    headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Snappad' },
  })
  if (!res.ok) return null
  return parseSnapchatHtml(await res.text(), res.url || url)
}
