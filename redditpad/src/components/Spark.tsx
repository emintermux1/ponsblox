import { pathFrom } from '../lib/chart.ts'

export function Spark({ values, up }: { values: number[]; up: boolean }) {
  const d = pathFrom(values)
  const last = values[values.length - 1] ?? 0
  const first = values[0] ?? last
  const rising = up || last >= first
  return (
    <svg className={`spark ${rising ? 'spark--up' : 'spark--dn'}`} viewBox="0 0 120 36" aria-hidden>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}
