export function timeAgoMs(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms <= 0) return '—'
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000))
  if (s < 45) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 48) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(ms).toISOString().slice(0, 10)
}

export function compact(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  const abs = Math.abs(n)
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`
  return String(Math.round(n))
}

export function pct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(1)}%`
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#039;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
}

export function absUrl(url?: string | null): string {
  const v = (url || '').trim()
  if (!v) return ''
  if (v.startsWith('//')) return `https:${v}`
  if (v.startsWith('http://')) return `https://${v.slice(7)}`
  return v
}

export function cleanLogoUrl(url?: string | null): string {
  const v = absUrl(url)
  if (!v) return ''
  try {
    const u = new URL(v)
    u.search = ''
    u.hash = ''
    return u.toString()
  } catch {
    return v
  }
}
