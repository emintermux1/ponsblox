import { clockLabel, snapClock } from '../lib/countdown.ts'
import { useSharedNow } from '../lib/now.ts'

export function Countdown({ createdAt, tone = 'light', compact = false }: { createdAt: number; tone?: 'light' | 'dark'; compact?: boolean }) {
  const now = useSharedNow()
  const clock = snapClock(createdAt, now)
  const label = clock.expired ? 'The Snap disappeared. The coin doesn’t.' : clockLabel(clock)

  return (
    <div className={`clock clock--${tone} ${compact ? 'clock--compact' : ''} ${clock.expired ? 'clock--gone' : ''}`} aria-live="polite">
      <span className="clock__bar" style={{ transform: `scaleX(${clock.ratio})` }} />
      {!compact && <span className="clock__label">{clock.expired ? '24h up' : 'Snap lives'}</span>}
      <strong>{label}</strong>
    </div>
  )
}
