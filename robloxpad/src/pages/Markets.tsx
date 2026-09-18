import { useEffect, useState } from 'react'
import { BoardList } from '../components/BoardList.tsx'
import { EmptyState, ErrorState } from '../components/ErrorState.tsx'
import { fetchCatalogue, fetchMarkets, type MarketRow } from '../lib/api.ts'
import { fmtUsd } from '../lib/format.ts'
import { formatPlayers, type GameListing } from '../lib/games.ts'
import { navigate, onNavClick, tokenPath } from '../lib/router.ts'

export function Markets({ q }: { q: string }) {
  const [rows, setRows] = useState<MarketRow[] | null>(null)
  const [board, setBoard] = useState<GameListing[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [query, setQuery] = useState(q)
  const [filter, setFilter] = useState<'all' | 'curve' | 'graduated'>('all')

  useEffect(() => { setQuery(q) }, [q])

  useEffect(() => {
    setRows(null)
    void fetchMarkets(q).then((r) => setRows(r.rows)).catch((e: Error) => setErr(e.message))
  }, [q])

  useEffect(() => {
    void fetchCatalogue().then((r) => setBoard(r.items)).catch(() => {})
  }, [])

  const shown = (rows || []).filter((r) => {
    if (filter === 'curve') return !r.graduated
    if (filter === 'graduated') return r.graduated
    return true
  })

  return (
    <main className="page">
      <p className="kicker">Live markets</p>
      <h1>Tokens on games people play.</h1>
      <div className="toolbar">
        <form onSubmit={(e) => { e.preventDefault(); navigate(query ? `/markets?q=${encodeURIComponent(query)}` : '/markets') }}>
          <input className="field" value={query} placeholder="Search tokens or games" onChange={(e) => setQuery(e.target.value)} />
        </form>
        <div className="chips">
          <button type="button" className={filter === 'all' ? 'chip chip--on' : 'chip'} onClick={() => setFilter('all')}>All</button>
          <button type="button" className={filter === 'curve' ? 'chip chip--on' : 'chip'} onClick={() => setFilter('curve')}>On curve</button>
          <button type="button" className={filter === 'graduated' ? 'chip chip--on' : 'chip'} onClick={() => setFilter('graduated')}>Graduated</button>
        </div>
      </div>
      <ErrorState error={err} />
      {rows && rows.length === 0 && (
        <div className="empty-board">
          <EmptyState
            title="No launches yet"
            body="Pick a game people are playing. Launch on it."
          >
            <a className="btn btn--fire" href="/launch" onClick={onNavClick('/launch')}>Launch</a>
            <a className="btn btn--ghost" href="/games" onClick={onNavClick('/games')}>Browse games</a>
          </EmptyState>
          {board.length > 0 && (
            <div className="empty-board__heat">
              <p className="kicker">On the board</p>
              <BoardList items={[...board].sort((a, b) => b.playing - a.playing).slice(0, 8)} />
            </div>
          )}
        </div>
      )}
      {shown.length > 0 && (
        <div className="table-wrap">
          <table className="board">
            <thead>
              <tr>
                <th>Game</th>
                <th>Token</th>
                <th>Price</th>
                <th>Playing</th>
                <th>Phase</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.token}>
                  <td>
                    <a className="row-skin" href={tokenPath(r.token)} onClick={onNavClick(tokenPath(r.token))}>
                      {r.image && <img src={r.image} alt="" />}
                      <span>
                        <strong>{r.gameName || r.name}</strong>
                        <em>{r.gameId}</em>
                      </span>
                    </a>
                  </td>
                  <td className="mono">{r.symbol || '—'}</td>
                  <td>{fmtUsd(r.tokenUsd)}</td>
                  <td>{formatPlayers(r.playing)}</td>
                  <td>{r.graduated ? 'Graduated' : r.readyToGraduate ? 'Ready' : 'On the curve'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
