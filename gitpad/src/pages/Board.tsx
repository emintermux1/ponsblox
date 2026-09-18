import { useEffect, useState } from 'react'
import { BoardTable } from '../components/BoardTable.tsx'
import { ErrorState } from '../components/ErrorState.tsx'
import { fetchBoard, type BoardRange, type BoardRow } from '../lib/api.ts'

const RANGES: { id: BoardRange; label: string }[] = [
  { id: 'now', label: 'Trending Now' },
  { id: '24H', label: '24H' },
  { id: '7D', label: '7D' },
  { id: '30D', label: '30D' },
]

export function Board() {
  const [range, setRange] = useState<BoardRange>('now')
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<BoardRow[]>([])
  const [busy, setBusy] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    setBusy(true)
    setErr(null)
    void fetchBoard(range, page)
      .then((r) => { if (live) setRows(r.rows) })
      .catch((e: Error) => { if (live) setErr(e.message) })
      .finally(() => { if (live) setBusy(false) })
    return () => { live = false }
  }, [range, page])

  return (
    <main className="paper paper--page">
      <p className="kicker">GitPad trending board</p>
      <h1>Repository momentum, ranked.</h1>
      <p>Trend score, star velocity, and activity stay on the repository. Cap and volume stay on the token — and stay Unavailable until a real market snapshot exists.</p>
      <div className="tabs">
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            className={range === r.id ? 'is-on' : ''}
            onClick={() => { setRange(r.id); setPage(1) }}
          >
            {r.label}
          </button>
        ))}
      </div>
      <ErrorState error={err} />
      {busy && <p className="muted">Ranking the window…</p>}
      <BoardTable rows={rows} empty="GitHub did not return a window. Set GITHUB_TOKEN if you are rate-limited." />
      <div className="pager">
        <button type="button" className="btn btn--ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
        <span className="mono">Page {page}</span>
        <button type="button" className="btn btn--ghost" disabled={rows.length < 12} onClick={() => setPage((p) => p + 1)}>Next</button>
      </div>
    </main>
  )
}
