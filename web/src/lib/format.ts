export function fmtRblx(v: string | null | undefined, max = 4): string {
  if (v == null || v === '') return '—'
  const n = Number(v)
  if (!Number.isFinite(n)) return '—'
  if (n === 0) return '0'
  if (n > 0 && n < 0.0001) return '<0.0001'
  return n.toLocaleString('en-US', { maximumFractionDigits: max })
}

export function resolveImage(uri: string | undefined | null): string | null {
  const v = (uri ?? '').trim()
  if (!v) return null
  if (v.startsWith('ipfs://')) return `https://ipfs.io/ipfs/${v.slice('ipfs://'.length)}`
  if (/^https?:\/\//i.test(v)) return v
  return null
}

export function failMessage(m: string): string {
  if (/User rejected|denied/i.test(m)) return 'You cancelled the signature. Nothing was signed.'
  if (/EconomicsMoved/.test(m)) return 'The curve terms moved. Ask for a new quote and try again.'
  if (/PairTokenNotApproved/.test(m)) return 'Pons is not accepting RBLX pairs right now.'
  if (/insufficient funds/i.test(m)) return 'That wallet does not hold enough ETH for the launch fee and gas.'
  if (/insufficient allowance|transfer amount exceeds/i.test(m)) return 'Approve RBLX first, and hold enough RBLX for the buy.'
  return m || 'The transaction did not go through.'
}
