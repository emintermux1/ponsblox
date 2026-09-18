import { useEffect, useState } from 'react'
import { EmptyState, ErrorState } from '../components/ErrorState.tsx'
import { fetchMap, type MapCategory, type RepoCard, type TokenRow } from '../lib/api.ts'
import { MAP_CATEGORIES } from '../lib/growthTypes.ts'
import { compact } from '../lib/format.ts'
import { launchPath, onNavClick, repoPath } from '../lib/router.ts'

export function TokenizedMap() {
  const [cat, setCat] = useState<MapCategory>('ai')
  const [rows, setRows] = useState<{ repo: RepoCard; token: TokenRow | null }[]>([])
  const [open, setOpen] = useState<number | null>(null)
  const [busy, setBusy] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    setBusy(true)
    setOpen(null)
    void fetchMap(cat)
      .then((r) => { if (live) setRows(r.rows) })
      .catch((e: Error) => { if (live) setErr(e.message) })
      .finally(() => { if (live) setBusy(false) })
    return () => { live = false }
  }, [cat])

  const selected = rows.find((r) => r.repo.id === open) || null

  return (
    <main className="paper paper--page">
      <p className="kicker">Tokenized map</p>
      <h1>Category → repository → token.</h1>
      <p>One GitHub window per category.</p>
      <div className="tabs">
        {MAP_CATEGORIES.map((c) => (
          <button key={c.id} type="button" className={cat === c.id ? 'is-on' : ''} onClick={() => setCat(c.id)}>
            {c.label}
          </button>
        ))}
      </div>
      <ErrorState error={err} />
      {busy && <p className="muted">Loading {cat}…</p>}
      {!busy && !rows.length && <EmptyState title="Empty category" body="No repositories in this GitHub window." />}
      <div className="mapgrid">
        <ol className="maplist">
          {rows.map((row) => (
            <li key={row.repo.id}>
              <button type="button" className={open === row.repo.id ? 'is-on' : ''} onClick={() => setOpen(row.repo.id)}>
                <strong>{row.repo.fullName}</strong>
                <span>{compact(row.repo.stars)} ★ · {row.token ? `$${row.token.symbol}` : 'AVAILABLE'}</span>
              </button>
            </li>
          ))}
        </ol>
        <aside className="mapdetail">
          {selected ? (
            <>
              <p className="kicker">{selected.token ? 'TOKENIZED' : 'AVAILABLE'}</p>
              <h2>{selected.repo.fullName}</h2>
              <p>{selected.repo.description || 'No description on GitHub.'}</p>
              <p className="mono">Trend {selected.repo.trendScore} · {selected.repo.language || '—'}</p>
              <div className="hero__cta">
                <a className="btn btn--paper" href={repoPath(selected.repo.owner, selected.repo.name)} onClick={onNavClick(repoPath(selected.repo.owner, selected.repo.name))}>
                  Open repository
                </a>
                {selected.token
                  ? <a className="btn btn--lime" href={`/token/${selected.token.address}`} onClick={onNavClick(`/token/${selected.token.address}`)}>Open token</a>
                  : <a className="btn btn--lime" href={launchPath(selected.repo.owner, selected.repo.name)} onClick={onNavClick(launchPath(selected.repo.owner, selected.repo.name))}>Launch</a>}
              </div>
            </>
          ) : <p className="muted">Pick a repository. Stay on GitPad.</p>}
        </aside>
      </div>
    </main>
  )
}
