import { ON_PEG_BAND } from '../config/official.ts'

export type DriftStatus = 'on_peg' | 'rich' | 'cheap' | 'unavailable'

export type Drift = {
  value: number | null
  pct: string
  status: DriftStatus
  label: string
}

export function computeDrift(tokenUsd: number | null, skinUsd: number | null): Drift {
  if (tokenUsd == null || skinUsd == null || !(skinUsd > 0) || !Number.isFinite(tokenUsd)) {
    return { value: null, pct: '—', status: 'unavailable', label: 'Unavailable' }
  }
  const value = tokenUsd / skinUsd - 1
  const pct = `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}%`
  const abs = Math.abs(value)
  if (abs <= ON_PEG_BAND + 1e-9) return { value, pct, status: 'on_peg', label: 'On peg' }
  if (value > 0) return { value, pct, status: 'rich', label: 'Richer than skin' }
  return { value, pct, status: 'cheap', label: 'Cheaper than skin' }
}

export function tokenUsdFromEth(priceEth: string | null | undefined, ethUsd: number | null): number | null {
  if (ethUsd == null || !Number.isFinite(ethUsd) || ethUsd <= 0) return null
  if (priceEth == null || priceEth === '') return null
  const n = Number(priceEth)
  if (!Number.isFinite(n) || n < 0) return null
  return n * ethUsd
}
