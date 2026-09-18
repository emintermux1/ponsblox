import { useEffect, useRef, useState, type FormEvent } from 'react'
import { COPY } from '../lib/copy.ts'
import { hrefFor, navigate } from '../lib/router.ts'
import { searchWiki, type SearchHit } from '../lib/wiki.ts'

export function SearchBox({
  autoFocus = false,
  large = false,
  onPick,
}: {
  autoFocus?: boolean
  large?: boolean
  onPick?: (hit: SearchHit) => void
}) {
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const t = useRef<number>(0)

  useEffect(() => {
    window.clearTimeout(t.current)
    const query = q.trim()
    if (query.length < 2) {
      setHits([])
      setBusy(false)
      return
    }
    setBusy(true)
    t.current = window.setTimeout(() => {
      void searchWiki(query)
        .then((rows) => { setHits(rows); setErr(null) })
        .catch(() => setErr('Search is unavailable.'))
        .finally(() => setBusy(false))
    }, 280)
    return () => window.clearTimeout(t.current)
  }, [q])

  function go(hit: SearchHit) {
    if (onPick) onPick(hit)
    else navigate(hrefFor({ name: 'topic', title: hit.title }))
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (hits[0]) go(hits[0])
  }

  return (
    <div className={large ? 'search search--large' : 'search'}>
      <form onSubmit={submit}>
        <input
          type="search"
          value={q}
          autoFocus={autoFocus}
          placeholder={COPY.searchPlaceholder}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search Wikipedia"
        />
        <button type="submit">Search</button>
      </form>
      {busy && <p className="muted search__status">Searching…</p>}
      {err && <p className="err">{err}</p>}
      {hits.length > 0 && (
        <ul className="search-hits">
          {hits.map((hit) => (
            <li key={hit.pageid || hit.key}>
              <button type="button" className="search-hit" onClick={() => go(hit)}>
                {hit.thumbnail ? <img src={hit.thumbnail} alt="" width={48} height={48} /> : <span className="search-hit__ph" />}
                <span>
                  <strong>{hit.title}</strong>
                  <em>{hit.description || hit.snippet}</em>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
