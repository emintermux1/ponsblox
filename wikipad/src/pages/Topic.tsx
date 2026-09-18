import { useEffect, useState } from 'react'
import { KnowledgeIndex } from '../components/KnowledgeIndex.tsx'
import { MarketTable } from '../components/MarketRow.tsx'
import { PageEditorCard } from '../components/PageEditor.tsx'
import { COPY } from '../lib/copy.ts'
import { loadWikiMarkets, marketsForTopic } from '../lib/markets.ts'
import type { TokenRecord } from '../lib/pons/index.ts'
import { hrefFor, onNav } from '../lib/router.ts'
import { fetchPage, type KnowledgePage } from '../lib/wiki.ts'

export function Topic({ title }: { title: string }) {
  const [page, setPage] = useState<KnowledgePage | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [markets, setMarkets] = useState<TokenRecord[]>([])

  useEffect(() => {
    let live = true
    setPage(null)
    setErr(null)
    void fetchPage(title)
      .then((p) => { if (live) setPage(p) })
      .catch(() => { if (live) setErr('That Wikipedia page could not be opened.') })
    return () => { live = false }
  }, [title])

  useEffect(() => {
    if (!page) return
    void loadWikiMarkets((rows) => setMarkets(marketsForTopic(rows, page.title, page.qid, page.pageid)))
      .then((rows) => setMarkets(marketsForTopic(rows, page.title, page.qid, page.pageid)))
      .catch(() => setMarkets([]))
  }, [page])

  const launchHref = hrefFor({ name: 'launch', title: page?.title || title })

  return (
    <main className="article article--topic">
      {err && <p className="err">{err}</p>}
      {!page && !err && <p className="muted">Opening article…</p>}
      {page && (
        <>
          <h1 className="firstHeading">{page.displayTitle}</h1>
          <p className="subtitle">
            From WikiPad, the knowledge markets
            {' · '}
            <a href={page.wikipediaUrl} target="_blank" rel="noreferrer">Wikipedia</a>
            {page.qid && (
              <>
                {' · '}
                <a href={page.wikidataUrl || '#'} target="_blank" rel="noreferrer">Wikidata {page.qid}</a>
              </>
            )}
          </p>
          <p>
            <a className="btn" href={launchHref} onClick={(e) => onNav(e, launchHref)}>Pair &amp; Launch</a>
          </p>
          <KnowledgeIndex page={page} />
          <p className="extract">{page.extract || page.description || 'No summary is available for this page.'}</p>
          {page.launchBlock && <p className="err">{page.launchBlock}</p>}
          <PageEditorCard editor={page.editor} />

          <h2>Existing tokens on this topic</h2>
          <MarketTable
            rows={markets}
            empty="No WikiPad token is paired to this page yet. Pair & Launch creates the first market."
          />

          <h2>Pair &amp; Launch</h2>
          <p>
            Verify this Wikipedia article, choose a ticker, and launch a memecoin on Pons V2 indexed to the page.
            Trading fees route to this page’s last Wikipedia writer, not the launcher.
          </p>
          <p className="muted">{COPY.editorFees}</p>
          <p>
            <a className="btn btn--large" href={launchHref} onClick={(e) => onNav(e, launchHref)}>Pair &amp; Launch</a>
          </p>
        </>
      )}
    </main>
  )
}
