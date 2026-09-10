import { useEffect, useState } from 'react'
import { DriftBadge } from '../components/DriftBadge.tsx'
import { EmptyState, ErrorState } from '../components/ErrorState.tsx'
import { computeDrift } from '../lib/drift.ts'
import { fetchMarkets, type MarketRow } from '../lib/api.ts'
import { fmtUsd } from '../lib/format.ts'
import { navigate, onNavClick, tokenPath } from '../lib/router.ts'

export function Markets({ q }: { q: string }) {
  const [rows, setRows] = useState<MarketRow[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [query, setQuery] = useState(q)
  const [filter, setFilter] = useState<'all' | 'curve' | 'graduated'>('all')

  useEffect(() => { setQuery(q) }, [q])

  useEffect(() => {
    setRows(null)
    void fetchMarkets(q).then((r) => setRows(r.rows)).catch((e: Error) => setErr(e.message))
  }, [q])

  const shown = (rows || []).filter((r) => {
    if (filter === 'curve') return !r.graduated
    if (filter === 'graduated') return r.graduated
    return true
  })

  return (
    <main className="page">
      <p className="kicker">Live markets</p>
      <h1>Every token against the skin it tracks.</h1>
      <div className="toolbar">
        <form onSubmit={(e) => { e.preventDefault(); navigate(query ? `/markets?q=${encodeURIComponent(query)}` : '/markets') }}>
          <input className="field" value={query} placeholder="Search tokens or skins" onChange={(e) => setQuery(e.target.value)} />
        </form>
        <div className="chips">
          <button type="button" className={filter === 'all' ? 'chip chip--on' : 'chip'} onClick={() => setFilter('all')}>All</button>
          <button type="button" className={filter === 'curve' ? 'chip chip--on' : 'chip'} onClick={() => setFilter('curve')}>On curve</button>
          <button type="button" className={filter === 'graduated' ? 'chip chip--on' : 'chip'} onClick={() => setFilter('graduated')}>Graduated</button>
        </div>
      </div>
      <ErrorState error={err} />
      {rows && rows.length === 0 && <EmptyState title="No launches yet" body="Peg a skin from the catalogue. Two tokens may track the same listing." />}
      {shown.length > 0 && (
        <div className="table-wrap">
          <table className="board">
            <thead>
              <tr>
                <th>Skin</th>
                <th>Token</th>
                <th>Token</th>
                <th>Skin</th>
                <th>Drift</th>
                <th>Phase</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const drift = computeDrift(r.tokenUsd, r.skinUsd)
                return (
                  <tr key={r.token}>
                    <td>
                      <a className="row-skin" href={tokenPath(r.token)} onClick={onNavClick(tokenPath(r.token))}>
                        {r.image && <img src={r.image} alt="" />}
                        <span>
                          <strong>{r.marketHashName}</strong>
                          <em>{r.wearShort}</em>
                        </span>
                      </a>
                    </td>
                    <td className="mono">{r.symbol || '—'}</td>
                    <td>{fmtUsd(r.tokenUsd)}</td>
                    <td>{fmtUsd(r.skinUsd)}</td>
                    <td><DriftBadge drift={drift} /></td>
                    <td>{r.graduated ? 'Graduated' : r.readyToGraduate ? 'Ready' : 'On the curve'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
