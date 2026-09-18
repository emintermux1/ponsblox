import type { BoardRow } from '../lib/growthTypes.ts'
import { compact } from '../lib/format.ts'
import { launchPath, onNavClick, repoPath } from '../lib/router.ts'
import { MomentumBadge, signalFromRepo } from './MomentumBadge.tsx'
import { EmptyState } from './ErrorState.tsx'

export function BoardTable({ rows, empty }: { rows: BoardRow[]; empty: string }) {
  if (!rows.length) return <EmptyState title="No rows" body={empty} />
  return (
    <div className="board">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Repository</th>
            <th>Repo momentum</th>
            <th>Token</th>
            <th>Token market</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const r = row.repo
            const tokenized = r.tokenStatus === 'live'
            return (
              <tr key={`${r.id}-${row.rank}`}>
                <td className="mono">{String(row.rank).padStart(2, '0')}</td>
                <td>
                  <a href={repoPath(r.owner, r.name)} onClick={onNavClick(repoPath(r.owner, r.name))}>
                    <strong>{r.owner}/{r.name}</strong>
                  </a>
                  <span className="muted">
                    {r.stars7d != null ? `+${compact(r.stars7d)} stars` : `${compact(r.stars)} stars`}
                    {row.weeklyGrowth != null ? ` · +${row.weeklyGrowth.toFixed(1)}% weekly growth` : ''}
                  </span>
                </td>
                <td>
                  <MomentumBadge signal={signalFromRepo(r)} />
                  <span className="mono">Trend {r.trendScore}</span>
                </td>
                <td>
                  <strong>{tokenized ? 'TOKENIZED' : 'AVAILABLE'}</strong>
                  <span className="mono">{row.token ? `$${row.token.symbol}` : '—'}</span>
                </td>
                <td>
                  <span>Cap {row.capRblx ?? 'Unavailable'}</span>
                  <span>Vol Unavailable</span>
                  <span className="muted">{row.tokenMomentum}</span>
                </td>
                <td className="board__act">
                  <a className="btn btn--ghost btn--sm" href={repoPath(r.owner, r.name)} onClick={onNavClick(repoPath(r.owner, r.name))}>View</a>
                  <a className="btn btn--lime btn--sm" href={launchPath(r.owner, r.name)} onClick={onNavClick(launchPath(r.owner, r.name))}>
                    {tokenized ? 'Launch another' : 'Launch'}
                  </a>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
