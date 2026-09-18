import { Link, useSearchParams } from 'react-router-dom'
import { SnapTile } from '../components/SnapTile.tsx'
import { liveStories, spotlightFeed } from '../lib/markets.ts'
import { usePageTitle } from '../lib/title.ts'

export function Stories({ mode }: { mode: 'stories' | 'spotlight' }) {
  usePageTitle(mode === 'spotlight' ? 'Spotlight — SnapPad' : 'Stories — SnapPad')
  const [params] = useSearchParams()
  const q = (params.get('q') || '').trim().toLowerCase()
  const rows = (mode === 'spotlight' ? spotlightFeed() : liveStories()).filter((p) => {
    if (!q) return true
    return `${p.name} ${p.ticker} ${p.account} ${p.caption}`.toLowerCase().includes(q)
  })

  return (
    <main className="spot">
      <header className="spot__head">
        <h1>{mode === 'spotlight' ? 'Spotlight' : 'Stories'}</h1>
        <p>{mode === 'spotlight' ? 'Public Snapchat Spotlights, each with a ticker.' : 'Live snaps. 24 hours. Then only the coin remains.'}</p>
      </header>
      {rows.length === 0 ? (
        <div className="empty">
          <p>No live snaps yet. Drop a screenshot and coin it.</p>
          <Link className="btn btn--yellow" to="/launch">Snap it. Coin it.</Link>
        </div>
      ) : (
        <div className="spot__grid">
          {rows.map((p, i) => <SnapTile key={p.id} pair={p} index={i} />)}
        </div>
      )}
    </main>
  )
}
