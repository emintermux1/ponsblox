import { useEffect, useState } from 'react'
import { formatUnits, isAddress, type Address } from 'viem'
import { LiveOnPons } from '../components/LiveOnPons.tsx'
import { PAIR_TOKEN, short, txUrl } from '../lib/chain.ts'
import { fmtRblx, quoteLabel } from '../lib/format.ts'
import {
  feeRouterLive, readDistributed, readFeeHistory, readFeeRoute, readRouterRblx,
  type DistEvent, type FeeSplit,
} from '../lib/gitpad.ts'
import { readToken } from '../lib/pons.ts'
import { onNavClick } from '../lib/router.ts'

export function Fees({ address }: { address: string }) {
  const [splits, setSplits] = useState<FeeSplit[]>([])
  const [dist, setDist] = useState('0')
  const [pending, setPending] = useState('0')
  const [hist, setHist] = useState<DistEvent[]>([])
  const [recipient, setRecipient] = useState<string>('')
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!isAddress(address)) { setErr('Not an address'); return }
    let live = true
    void (async () => {
      const token = await readToken(address as Address).catch(() => null)
      if (!live) return
      if (token) setRecipient(token.creatorFeeRecipient)
      if (!feeRouterLive()) return
      const [route, total, events, unswept] = await Promise.all([
        readFeeRoute(address as Address),
        readDistributed(address as Address),
        readFeeHistory(address as Address),
        readRouterRblx(),
      ])
      if (!live) return
      setSplits(route)
      setDist(formatUnits(total, 18))
      setPending(formatUnits(unswept, 18))
      setHist(events)
    })().catch((e: Error) => { if (live) setErr(e.message) })
    return () => { live = false }
  }, [address])

  return (
    <main className="paper paper--page">
      <LiveOnPons />
      <p className="kicker">Fee dashboard</p>
      <h1>Where fees go</h1>
      {!feeRouterLive() && (
        <p className="err">GitPadFeeRouter is not deployed. Set VITE_GITPAD_FEE_ROUTER after you publish the contracts.</p>
      )}
      {err && <p className="err">{err}</p>}
      <p className="muted">
        Pons does not emit a separate “fees generated” event. Generated here is what GitPadFeeRouter
        has swept for this token. Pending is the router’s current quote balance (shared across tokens until sweep).
      </p>
      <dl className="kv">
        <div><dt>Token</dt><dd className="mono">{short(address, 6)}</dd></div>
        <div><dt>Current Pons recipient</dt><dd className="mono">{recipient ? short(recipient, 6) : '…'}</dd></div>
        <div><dt>Asset</dt><dd>{quoteLabel(PAIR_TOKEN)}</dd></div>
        <div><dt>Generated / distributed</dt><dd>{fmtRblx(dist, 4)} {quoteLabel(PAIR_TOKEN)}</dd></div>
        <div><dt>Pending on router</dt><dd>{fmtRblx(pending, 4)} {quoteLabel(PAIR_TOKEN)}</dd></div>
      </dl>
      <h2>Destinations</h2>
      {splits.length ? (
        <table className="feesplit">
          <thead><tr><th>Role</th><th>Wallet</th><th>%</th></tr></thead>
          <tbody>
            {splits.map((s) => (
              <tr key={`${s.role}-${s.to}`}>
                <td>{s.role}</td>
                <td className="mono">{s.to}</td>
                <td>{s.bps / 100}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="muted">No router split on this token yet.</p>
      )}
      <h2>History</h2>
      {hist.length ? (
        <ul className="pick">
          {hist.map((h) => (
            <li key={h.tx}>
              <a href={txUrl(h.tx)} target="_blank" rel="noreferrer">{h.role} · {fmtRblx(formatUnits(BigInt(h.amount), 18))} · {short(h.to)}</a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">No Distributed events in the recent window.</p>
      )}
      <p>
        <a href={`/token/${address}`} onClick={onNavClick(`/token/${address}`)}>Back to token</a>
        {' · '}
        <a href="/connect" onClick={onNavClick('/connect')}>Connect existing</a>
      </p>
    </main>
  )
}
