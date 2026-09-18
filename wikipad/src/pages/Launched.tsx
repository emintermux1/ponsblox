import { useEffect, useState } from 'react'
import { MarketTable } from '../components/MarketRow.tsx'
import { RpcNotice } from '../components/RpcNotice.tsx'
import { COPY } from '../lib/copy.ts'
import { loadWikiMarkets, seedMarkets } from '../lib/markets.ts'
import type { TokenRecord } from '../lib/pons/index.ts'
import { hrefFor, onNav } from '../lib/router.ts'

export function Launched() {
  const [rows, setRows] = useState<TokenRecord[]>(() => seedMarkets())
  const [busy, setBusy] = useState(true)
  const [stale, setStale] = useState(false)
  const launch = hrefFor({ name: 'launch', title: null })

  function reload() {
    setBusy(true)
    setStale(false)
    let updates = 0
    void loadWikiMarkets((next) => {
      updates += 1
      setRows(next)
      setStale(false)
      if (updates >= 2) setBusy(false)
    })
      .then((next) => { setRows(next); setStale(false) })
      .catch(() => { setRows(seedMarkets()); setStale(true) })
      .finally(() => setBusy(false))
  }

  useEffect(() => { reload() }, [])

  return (
    <main className="article">
      <h1 className="firstHeading">Markets</h1>
      <p className="subtitle">Official $WIKIPAD and WikiPad launches on Pons V2. {COPY.editorFees}</p>
      <p>
        Every row is a real Pons V2 token paired to a Wikipedia page, or the official $WIKIPAD coin.
        Unrelated factory launches stay off this board.
      </p>
      <p className="muted">{COPY.editorFees}</p>
      {busy && <p className="muted">Reading the factory…</p>}
      {stale && !busy && <RpcNotice onRetry={reload} />}
      <MarketTable
        rows={rows}
        empty="No WikiPad markets yet. Pair a page to launch the first."
      />
      <p>
        <a className="btn" href={launch} onClick={(e) => onNav(e, launch)}>Launch a Page</a>
      </p>
    </main>
  )
}
