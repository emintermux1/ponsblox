export function compact(n: number): string {
  if (!Number.isFinite(n)) return '—'
  const abs = Math.abs(n)
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  if (abs >= 1) return n.toFixed(abs >= 100 ? 0 : 2)
  return n.toFixed(4)
}

export function usd(n: number): string {
  if (!Number.isFinite(n)) return '—'
  if (n >= 1_000) return `$${compact(n)}`
  return `$${n.toFixed(n >= 1 ? 2 : 4)}`
}

export function pct(n: number): string {
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(1)}%`
}

export function ageLabel(createdAt: number, now = Date.now()): string {
  const s = Math.max(0, now - createdAt)
  if (s < 60_000) return 'just now'
  if (s < 3_600_000) return `${Math.max(1, Math.round(s / 60_000))}m`
  if (s < 86_400_000) return `${Math.max(1, Math.round(s / 3_600_000))}h`
  return `${Math.max(1, Math.round(s / 86_400_000))}d`
}

export function tickerClean(raw: string): string {
  return raw.replace(/[^A-Za-z0-9]/g, '').slice(0, 11).toUpperCase()
}
