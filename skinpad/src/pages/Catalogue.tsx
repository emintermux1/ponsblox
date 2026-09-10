import { useEffect, useState } from 'react'
import { EmptyState, ErrorState, SkeletonGrid } from '../components/ErrorState.tsx'
import { SkinCard } from '../components/SkinCard.tsx'
import { fetchCatalogue } from '../lib/api.ts'
import { cataloguePath, navigate } from '../lib/router.ts'
import { CATEGORIES, WEAR_SHORT, type SkinListing } from '../lib/skins.ts'

export function Catalogue({ q, category, wear }: { q: string; category: string; wear: string }) {
  const [items, setItems] = useState<SkinListing[] | null>(null)
  const [note, setNote] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [query, setQuery] = useState(q)

  useEffect(() => { setQuery(q) }, [q])

  useEffect(() => {
    setItems(null)
    setErr(null)
    void fetchCatalogue({ q, category, wear })
      .then((r) => { setItems(r.items); setNote(r.note) })
      .catch((e: Error) => setErr(e.message))
  }, [q, category, wear])

  function commit(next: { q?: string; category?: string; wear?: string }) {
    navigate(cataloguePath({
      q: next.q ?? query,
      category: next.category ?? category,
      wear: next.wear ?? wear,
    }))
  }

  return (
    <main className="market">
      <aside className="filters">
        <h1>Catalogue</h1>
        <p className="muted">300 most valuable CS2 weapon listings. Steam names and images only.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            commit({ q: query })
          }}
        >
          <input
            className="field"
            value={query}
            placeholder="Search inventory…"
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>
        <p className="filter-label">Category</p>
        <div className="chips">
          <button type="button" className={category === 'all' ? 'chip chip--on' : 'chip'} onClick={() => commit({ category: 'all' })}>All</button>
          {CATEGORIES.map((c) => (
            <button key={c} type="button" className={category === c ? 'chip chip--on' : 'chip'} onClick={() => commit({ category: c })}>{c}</button>
          ))}
        </div>
        <p className="filter-label">Exterior</p>
        <div className="chips">
          <button type="button" className={wear === 'all' ? 'chip chip--on' : 'chip'} onClick={() => commit({ wear: 'all' })}>All</button>
          {Object.entries(WEAR_SHORT).map(([name, short]) => (
            <button key={short} type="button" className={wear === short ? 'chip chip--on' : 'chip'} onClick={() => commit({ wear: short })} title={name}>{short}</button>
          ))}
        </div>
        {note && <p className="muted tiny">{note}</p>}
      </aside>
      <section>
        <ErrorState error={err} />
        {items == null && !err && <SkeletonGrid n={12} />}
        {items && items.length === 0 && <EmptyState title="No listings match" body="Clear filters or wait for Steam to refresh." />}
        {items && items.length > 0 && (
          <div className="skin-grid">
            {items.map((s, i) => <SkinCard key={s.id} skin={s} delay={Math.min(i, 12) * 0.03} />)}
          </div>
        )}
      </section>
    </main>
  )
}
