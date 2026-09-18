import type { MomentumSignal } from '../lib/signal.ts'
import { momentumSignal } from '../lib/signal.ts'
import type { RepoCard } from '../lib/api.ts'

export function signalFromRepo(repo: Pick<RepoCard, 'stars' | 'stars24h' | 'stars7d' | 'forks' | 'pushedAt' | 'createdAt' | 'trendScore'>): MomentumSignal {
  return momentumSignal({
    stars: repo.stars,
    stars24h: repo.stars24h,
    stars7d: repo.stars7d,
    forks: repo.forks,
    pushedAt: repo.pushedAt,
    createdAt: repo.createdAt,
    trendScore: repo.trendScore,
  })
}

export function MomentumBadge({
  signal,
  explain = false,
}: {
  signal: MomentumSignal
  explain?: boolean
}) {
  return (
    <div className={`msig msig--${signal.level}`}>
      <strong title={signal.why.join(' · ')}>{signal.label}</strong>
      {explain && (
        <ul>
          {signal.why.map((w) => <li key={w}>{w}</li>)}
        </ul>
      )}
    </div>
  )
}
