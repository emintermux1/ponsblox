import { useMemo, useState } from 'react'
import { CATEGORIES, clipsFor, railLabel, type Clip, type ClipKind, type Rail } from './clips.ts'
import { HubGrid } from './HubGrid.tsx'
import { BUY, CA, CHAIN, TICKER, TOKEN_IMAGE, TOKEN_NAME, X_HANDLE, X_URL } from './lore.ts'
import { Player } from './Player.tsx'
import { useClock } from './sim.ts'

export default function App() {
  const tMs = useClock()
  const [rail, setRail] = useState<Rail | 'all'>('all')
  const [cat, setCat] = useState<ClipKind | 'all'>('all')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<Clip | null>(null)

  const grid = useMemo(
    () => clipsFor(cat, rail === 'all' ? undefined : rail, q),
    [cat, rail, q],
  )

  return (
    <div className="page" id="top">
      <header className="top">
        <a className="wordmark" href="#top" aria-label="FlyHub">
          <img src="/logo.png" alt="FlyHub" />
        </a>
        <form
          className="search"
          onSubmit={(e) => {
            e.preventDefault()
          }}
        >
          <input
            type="search"
            placeholder="Search fly clips"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search"
          />
        </form>
        <nav>
          {(['all', 'hot', 'trending', 'new'] as const).map((row) => (
            <button
              key={row}
              type="button"
              className={rail === row ? 'on' : ''}
              onClick={() => setRail(row)}
            >
              {row === 'all' ? 'HOME' : railLabel(row)}
            </button>
          ))}
          <a href="#token">{TICKER}</a>
          <a href={X_URL} target="_blank" rel="noreferrer">
            {X_HANDLE}
          </a>
        </nav>
      </header>

      <nav className="cats" aria-label="Categories">
        <button type="button" className={cat === 'all' ? 'on' : ''} onClick={() => setCat('all')}>
          All
        </button>
        {CATEGORIES.map((row) => (
          <button
            key={row.id}
            type="button"
            className={cat === row.id ? 'on' : ''}
            onClick={() => setCat(row.id)}
          >
            {row.label}
          </button>
        ))}
      </nav>

      <section className="hub" id="hub">
        <header className="sec">
          <p className="kicker">HOT ON FLYHUB</p>
          <h2>House flies fucking</h2>
        </header>
        {grid.length === 0 ? (
          <p className="empty">No clips match that search.</p>
        ) : (
          <HubGrid clips={grid} tMs={tMs} onOpen={setOpen} />
        )}
      </section>

      <footer className="token" id="token">
        <img className="coin-art" src={TOKEN_IMAGE} alt={TOKEN_NAME} width={72} height={72} />
        <div>
          <p className="kicker">{TICKER}</p>
          <p>
            {CHAIN}. CA {CA ? CA : 'pending'}.{' '}
            <a href={BUY} target="_blank" rel="noreferrer">
              Open launchpad
            </a>
          </p>
        </div>
      </footer>

      {open ? <Player clip={open} tMs={tMs} onClose={() => setOpen(null)} onOpen={setOpen} /> : null}
    </div>
  )
}
