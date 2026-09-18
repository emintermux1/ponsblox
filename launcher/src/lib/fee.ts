/** On-chain fees stay in bps. The studio UI shows percent. */
export function bpsToPct(bps: number): number {
  if (!Number.isFinite(bps)) return 0
  return Math.round(bps) / 100
}

export function pctToBps(pct: number): number {
  if (!Number.isFinite(pct)) return 0
  return Math.round(Math.min(10, Math.max(0, pct)) * 100)
}
