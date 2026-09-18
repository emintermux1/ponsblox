import type { PulseStats } from '../lib/growthTypes.ts'
import { timeAgoMs } from '../lib/format.ts'

export function PulseStrip({ pulse }: { pulse: PulseStats | null }) {
  if (!pulse) {
    return (
      <div className="pulse">
        <p className="muted">Loading…</p>
      </div>
    )
  }
  const cells = [
    ['Repositories tracked', pulse.repositoriesTracked],
    ['Trending today', pulse.trendingToday],
    ['Tokenized repositories', pulse.tokenizedRepositories],
    ['Launches today', pulse.launchesToday],
  ] as const
  return (
    <div className="pulse">
      <dl>
        {cells.map(([label, n]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{n.toLocaleString('en-US')}</dd>
          </div>
        ))}
      </dl>
      <p className="muted">Updated {timeAgoMs(pulse.generatedAt)}</p>
    </div>
  )
}
