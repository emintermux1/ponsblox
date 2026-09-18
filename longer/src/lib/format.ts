export function compact(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}m`
  if (abs >= 10_000) return `${Math.round(n / 1000)}k`
  if (abs >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
  if (abs >= 100) return n.toFixed(0)
  if (abs >= 1) return n.toFixed(2)
  if (abs > 0) return n.toFixed(4)
  return '0'
}

export function usd(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  if (n >= 1000) return `$${compact(n)}`
  if (n >= 1) return `$${n.toFixed(2)}`
  if (n > 0) return `$${n.toFixed(4)}`
  return '$0'
}

export function timeAgoMs(at: number): string {
  if (!Number.isFinite(at)) return '—'
  const s = Math.max(0, Math.round((Date.now() - at) / 1000))
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d`
  return new Date(at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function failMessage(m: string): string {
  if (/User rejected|denied|4001/i.test(m)) return 'You cancelled. Nothing was sent.'
  if (/PairTokenNotApproved/i.test(m)) return 'Launch reverted. Try again.'
  if (/insufficient funds/i.test(m)) return 'That wallet does not hold enough ETH for the launch fee and gas.'
  if (/insufficient allowance|transfer amount exceeds/i.test(m)) return 'Approve the 3X asset first, and hold enough for the first buy.'
  if (/timeout|timed out|RPC/i.test(m)) return 'RPC timed out. The transaction may still confirm — check the explorer before sending again.'
  return m || 'The transaction did not go through.'
}

export function isTicker(v: string): boolean {
  return /^[A-Za-z0-9]{2,11}$/.test(v.trim())
}
