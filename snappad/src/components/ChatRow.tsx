import { Link } from 'react-router-dom'
import { ageLabel, compact, pct } from '../lib/format.ts'
import type { SnapPair } from '../lib/markets.ts'
import { snapClock } from '../lib/countdown.ts'
import { isViewed } from '../lib/viewed.ts'

function statusOf(pair: SnapPair): 'snap' | 'chat' | 'opened' | 'gone' {
  const clock = snapClock(pair.createdAt)
  if (clock.expired) return 'gone'
  if (!isViewed(pair.id)) return 'snap'
  if (pair.kind === 'screenshot' || pair.kind === 'link') return 'opened'
  return 'chat'
}

export function ChatRow({ pair }: { pair: SnapPair }) {
  const status = statusOf(pair)
  const clock = snapClock(pair.createdAt)

  return (
    <Link className="chat" to={`/s/${pair.id}`}>
      <span className="chat__ava">
        <img src={pair.avatar || pair.image} alt="" loading="lazy" decoding="async" onError={(e) => { e.currentTarget.src = pair.image || '/brand/ghost.png' }} />
      </span>
      <span className="chat__mid">
        <strong>{pair.account}</strong>
        <em>
          {status === 'gone' && 'Snap disappeared · coin still live'}
          {status === 'snap' && `New Snap · $${pair.ticker}`}
          {status === 'chat' && `${pair.caption || 'Story Snap'} · $${pair.ticker}`}
          {status === 'opened' && `Opened · $${pair.ticker} / $SNAP`}
        </em>
      </span>
      <span className="chat__end">
        <span className={`sq sq--${status}`} aria-hidden="true" />
        <small>{clock.expired ? 'coin' : ageLabel(pair.createdAt)}</small>
        {pair.streak > 0 && <small className="fire">🔥 {pair.streak}</small>}
        {pair.mcap > 0 && (
          <small className={pair.change24h >= 0 ? 'up' : 'down'}>{pct(pair.change24h)} · {compact(pair.mcap)}</small>
        )}
      </span>
    </Link>
  )
}
