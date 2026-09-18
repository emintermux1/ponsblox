import { useMemo } from 'react'
import { Connect } from '../components/Connect.tsx'
import { EmptyState } from '../components/ErrorState.tsx'
import { timeAgoMs } from '../lib/format.ts'
import { readLaunchHistory } from '../lib/launchHistory.ts'
import { launchPath, onNavClick } from '../lib/router.ts'
import { short, txUrl } from '../lib/chain.ts'
import { useWallet } from '../lib/wallet.tsx'

export function Launches() {
  const w = useWallet()
  const rows = useMemo(() => (w.address ? readLaunchHistory(w.address) : []), [w.address])

  return (
    <main className="paper paper--page">
      <p className="kicker">/dashboard/launches</p>
      <h1>Your launches</h1>
      {!w.address && (
        <div className="launch-empty">
          <p className="muted">Connect a wallet to reopen launches from this browser.</p>
          <Connect />
        </div>
      )}
      {w.address && !rows.length && (
        <EmptyState title="No launches in this browser" body="Successful, pending, and failed deploys from Launch Studio stay here so you can continue safely." />
      )}
      {!!rows.length && (
        <table className="table">
          <thead>
            <tr>
              <th>Token</th>
              <th>Repository</th>
              <th>Contract</th>
              <th>Status</th>
              <th>Date</th>
              <th>Transaction</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.name} ${r.symbol}</td>
                <td>
                  <a href={launchPath(r.owner, r.repo)} onClick={onNavClick(launchPath(r.owner, r.repo))}>{r.owner}/{r.repo}</a>
                </td>
                <td className="mono">{r.token ? <a href={`/token/${r.token}`} onClick={onNavClick(`/token/${r.token}`)}>{short(r.token, 4)}</a> : '—'}</td>
                <td>{r.status}</td>
                <td>{timeAgoMs(r.at)}</td>
                <td>
                  {r.hash ? <a href={txUrl(r.hash)} target="_blank" rel="noreferrer">{short(r.hash, 4)}</a> : '—'}
                  {r.status === 'FAILED' && r.error && <p className="muted">{r.error}</p>}
                  {r.status !== 'LIVE' && (
                    <p>
                      <a href={launchPath(r.owner, r.repo)} onClick={onNavClick(launchPath(r.owner, r.repo))}>Continue safely</a>
                    </p>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="muted">Pending rows resume the saved hash. GitPad never sends another launch write by itself.</p>
    </main>
  )
}
