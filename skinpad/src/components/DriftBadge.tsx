import type { Drift } from '../lib/drift.ts'

export function DriftBadge({ drift }: { drift: Drift }) {
  return (
    <span className={`drift drift--${drift.status}`}>
      {drift.pct}
      <em>{drift.label}</em>
    </span>
  )
}
