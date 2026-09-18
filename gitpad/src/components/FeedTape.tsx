import type { FeedFilter, FeedItem } from '../lib/growthTypes.ts'
import { timeAgoMs } from '../lib/format.ts'
import { onNavClick } from '../lib/router.ts'
import { EmptyState } from './ErrorState.tsx'

const FILTERS: { id: FeedFilter; label: string }[] = [
  { id: 'all', label: 'ALL' },
  { id: 'trending', label: 'TRENDING' },
  { id: 'launches', label: 'NEW LAUNCHES' },
  { id: 'github', label: 'GITHUB' },
  { id: 'markets', label: 'MARKETS' },
]

function mark(item: FeedItem) {
  switch (item.channel) {
    case 'github': return '▲'
    case 'launch': return '●'
    case 'market': return '↗'
    case 'claim': return '◆'
    default: {
      const _e: never = item.channel
      return _e
    }
  }
}

export function FeedTape({
  events,
  filter,
  onFilter,
  empty = 'No indexed events for this filter yet.',
}: {
  events: FeedItem[]
  filter: FeedFilter
  onFilter: (f: FeedFilter) => void
  empty?: string
}) {
  return (
    <div className="feed">
      <div className="tabs" role="tablist" aria-label="Live feed filters">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            className={filter === f.id ? 'is-on' : ''}
            onClick={() => onFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>
      {!events.length && <EmptyState title="Quiet tape" body={empty} />}
      <ol className="tape feed__list">
        {events.map((e) => (
          <li key={e.id}>
            <span className="mono">{mark(e)} {timeAgoMs(e.at)}</span>
            {e.href
              ? <a href={e.href} onClick={onNavClick(e.href)}><strong>{e.title}</strong></a>
              : <strong>{e.title}</strong>}
            <em>{e.body}</em>
          </li>
        ))}
      </ol>
    </div>
  )
}
