import { useEffect, useState } from 'react'
import { SearchBox } from '../components/SearchBox.tsx'
import { TopicCard } from '../components/TopicCard.tsx'
import { COPY } from '../lib/copy.ts'
import { fetchMostViewed, type TrendingItem } from '../lib/wiki.ts'

export function Knowledge() {
  const [rows, setRows] = useState<TrendingItem[] | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    void fetchMostViewed().then(setRows).catch(() => setErr('Wikimedia did not return a list just now.'))
  }, [])

  return (
    <main className="article">
      <h1 className="firstHeading">Knowledge</h1>
      <p className="subtitle">Most viewed English Wikipedia articles. {COPY.editorFees}</p>
      <p>Knowledge becomes markets. These ranks come from the Wikimedia pageviews API, not invented volume.</p>
      <SearchBox />
      {err && <p className="err">{err}</p>}
      {!rows && <p className="muted">Loading most-viewed pages…</p>}
      <div className="card-list">
        {rows?.map((item) => <TopicCard key={item.title} item={item} />)}
      </div>
    </main>
  )
}
