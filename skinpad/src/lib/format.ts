export const NATIVE_PAIR = '0x0000000000000000000000000000000000000000'

export function isNativePair(addr?: string | null): boolean {
  return (addr || '').toLowerCase() === NATIVE_PAIR
}

export function quoteLabel(pair?: string | null, symbol?: string | null): string {
  if (isNativePair(pair) || !pair) return 'ETH'
  const s = (symbol || '').trim()
  return s || 'quote'
}

const IPFS_GATEWAYS = [
  'https://gateway.pinata.cloud/ipfs/',
  'https://ipfs.io/ipfs/',
] as const

export function ipfsPath(raw?: string | null): string {
  const v = (raw || '').trim()
  if (!v) return ''
  if (/^ipfs:\/\//i.test(v)) return v.replace(/^ipfs:\/\//i, '').replace(/^ipfs\//i, '')
  if (/^(Qm[1-9A-HJ-NP-Za-km-z]{44}|bafy[a-z0-9]{50,})$/i.test(v)) return v
  return ''
}

export function logoSrc(raw?: string | null, gateway = 0): string {
  const v = (raw || '').trim()
  if (/^https:\/\//i.test(v)) return v
  const path = ipfsPath(v)
  if (!path) return ''
  const i = Math.min(Math.max(gateway, 0), IPFS_GATEWAYS.length - 1)
  return `${IPFS_GATEWAYS[i]}${path}`
}

export function compact(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}m`
  if (abs >= 10_000) return `${Math.round(n / 1000)}k`
  if (abs >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return n.toLocaleString('en-US')
}

export function fmtUsd(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  if (n >= 1000) return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  if (n >= 1) return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`
}

export function fmtRblx(v: string | null | undefined, max = 4): string {
  if (v == null || v === '') return '—'
  const n = Number(v)
  if (!Number.isFinite(n)) return '—'
  if (n === 0) return '0'
  if (n > 0 && n < 0.0001) return '<0.0001'
  return n.toLocaleString('en-US', { maximumFractionDigits: max })
}

export function timeAgoMs(at: number): string {
  if (!Number.isFinite(at)) return '—'
  const s = Math.max(0, Math.round((Date.now() - at) / 1000))
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`
  return new Date(at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function failMessage(m: string): string {
  if (/User rejected|denied/i.test(m)) return 'You cancelled. Nothing was sent.'
  if (/EconomicsMoved/.test(m)) return 'The curve terms moved. Refresh and try again.'
  if (/PairTokenNotApproved/.test(m)) return 'Pons is not accepting this quote pair right now.'
  if (/insufficient funds/i.test(m)) return 'That wallet does not hold enough ETH for the launch fee and gas.'
  if (/canLaunch|not allowed/i.test(m)) return 'This wallet is not allowed to launch on Pons right now.'
  return m || 'The transaction did not go through.'
}

export const MAX_CREATOR_TAX_BPS = 1000

export function bpsToPct(bps: number): number {
  return Number((bps / 100).toFixed(2))
}

export function pctToBps(pct: number): number {
  return Math.round(pct * 100)
}

export function clampCreatorTaxBps(bps: number, maxBps = MAX_CREATOR_TAX_BPS): number {
  const cap = Number.isFinite(maxBps) && maxBps > 0 ? maxBps : MAX_CREATOR_TAX_BPS
  if (!Number.isFinite(bps)) return 0
  return Math.min(cap, Math.max(0, Math.round(bps)))
}

export function pctLabel(bps: number): string {
  return `${bpsToPct(bps)}%`
}

export { SKINPAD_X_URL as X_URL } from '../config/official.ts'
