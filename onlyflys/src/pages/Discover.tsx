import { useMemo, useState } from 'react'
import { CREATORS, SCENES, sceneLabel, type SceneKind } from '../creators.ts'
import { CreatorCard } from '../components/CreatorCard.tsx'

export function Discover() {
  const [kind, setKind] = useState<SceneKind | 'all'>('all')
  const rows = useMemo(
    () => (kind === 'all' ? CREATORS : CREATORS.filter((row) => row.scene === kind)),
    [kind],
  )

  return (
    <div className="col">
      <header className="page-head">
        <p className="kicker">Discover</p>
        <h1>House fly creators</h1>
        <p className="muted">Personas from the bin. Not stolen models. Subscribe if the pile looks right.</p>
      </header>
      <div className="chip-row">
        <button type="button" className={kind === 'all' ? 'chip chip-blue' : 'chip'} onClick={() => setKind('all')}>
          All
        </button>
        {SCENES.map((id) => (
          <button
            key={id}
            type="button"
            className={kind === id ? 'chip chip-blue' : 'chip'}
            onClick={() => setKind(id)}
          >
            {sceneLabel(id)}
          </button>
        ))}
      </div>
      <div className="creator-grid">
        {rows.map((who) => (
          <CreatorCard key={who.handle} who={who} />
        ))}
      </div>
    </div>
  )
}
