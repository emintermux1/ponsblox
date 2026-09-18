import { useEffect, useState } from 'react'
import { BoardList } from '../components/BoardList.tsx'
import { EmptyState, ErrorState, SkeletonGrid } from '../components/ErrorState.tsx'
import { fetchCatalogue } from '../lib/api.ts'
import { SORTS, type GameListing } from '../lib/games.ts'
import { gamesPath, navigate } from '../lib/router.ts'

export function Games({ q, sort, genre }: { q: string; sort: string; genre: string }) {
  const [items, setItems] = useState<GameListing[] | null>(null)
  const [genres, setGenres] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [query, setQuery] = useState(q)

  useEffect(() => { setQuery(q) }, [q])

  useEffect(() => {
    setItems(null)
    setErr(null)
    void fetchCatalogue({ q, sort, genre })
      .then((r) => { setItems(r.items); setNote(r.note); setGenres(r.genres) })
      .catch((e: Error) => setErr(e.message))
  }, [q, sort, genre])

  function commit(next: { q?: string; sort?: string; genre?: string }) {
    navigate(gamesPath({
      q: next.q ?? query,
      sort: next.sort ?? sort,
      genre: next.genre ?? genre,
    }))
  }

  return (
    <main className="market">
      <aside className="filters">
        <h1>Games</h1>
        <p className="muted">Live titles people are in. Launch on one. Earn while they play.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            commit({ q: query })
          }}
        >
          <input
            className="field"
            value={query}
            placeholder="Search a title or paste a Roblox URL"
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>
        <p className="filter-label">Board</p>
        <div className="chips">
          <button type="button" className={sort === 'all' ? 'chip chip--on' : 'chip'} onClick={() => commit({ sort: 'all' })}>All</button>
          {SORTS.map((s) => (
            <button key={s.id} type="button" className={sort === s.id ? 'chip chip--on' : 'chip'} onClick={() => commit({ sort: s.id })}>{s.label}</button>
          ))}
        </div>
        {genres.length > 0 && (
          <>
            <p className="filter-label">Genre</p>
            <div className="chips">
              <button type="button" className={genre === 'all' ? 'chip chip--on' : 'chip'} onClick={() => commit({ genre: 'all' })}>All</button>
              {genres.map((g) => (
                <button key={g} type="button" className={genre === g ? 'chip chip--on' : 'chip'} onClick={() => commit({ genre: g })}>{g}</button>
              ))}
            </div>
          </>
        )}
        {note && <p className="muted tiny">{note}</p>}
        {items && <p className="muted tiny">{items.length} on this list</p>}
      </aside>
      <section>
        <ErrorState error={err} />
        {items == null && !err && <SkeletonGrid n={12} />}
        {items && items.length === 0 && <EmptyState title="No games match" body="Clear filters or search a different title." />}
        {items && items.length > 0 && <BoardList items={items} />}
      </section>
    </main>
  )
}
