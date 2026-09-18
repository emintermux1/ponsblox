import { useEffect, useState } from 'react'
import { ErrorState, EmptyState } from '../components/ErrorState.tsx'
import { fetchActivity, type ActivityEvent } from '../lib/api.ts'
import { timeAgo } from '../lib/format.ts'
import { onNavClick } from '../lib/router.ts'

export function Activity() {
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(true)

  useEffect(() => {
    let live = true
    void fetchActivity()
      .then((row) => { if (live) setEvents(row.events) })
      .catch((e: Error) => { if (live) setErr(e.message) })
      .finally(() => { if (live) setBusy(false) })
    return () => { live = false }
  }, [])

  return (
    <main className="ink paper--page" style={{ padding: '72px 48px' }}>
      <p className="kicker">Tape</p>
      <h1>Activity</h1>
      <p className="muted">Launches, claims, and repository momentum.</p>
      <ErrorState error={err} />
      {busy && <p className="muted">Loading…</p>}
      {!busy && !events.length && <EmptyState title="Quiet tape" body="Launch a token or claim a repository and it will print here." />}
      <ol className="tape">
        {events.map((e) => (
          <li key={e.id}>
            <span className="mono">{timeAgo(new Date(e.at).toISOString())}</span>
            {e.href
              ? <a href={e.href} onClick={onNavClick(e.href)}><strong>{e.title}</strong></a>
              : <strong>{e.title}</strong>}
            <em>{e.body}</em>
          </li>
        ))}
      </ol>
    </main>
  )
}
