import { useEffect, useState } from 'react'
import { ADMIN_ADDRESSES } from '../config/official.ts'
import { ErrorState } from '../components/ErrorState.tsx'
import { fetchAdmin } from '../lib/api.ts'
import { onNavClick } from '../lib/router.ts'
import { useWallet } from '../lib/wallet.tsx'

export function Admin() {
  const w = useWallet()
  const allowed = Boolean(w.address && ADMIN_ADDRESSES.includes(w.address.toLowerCase()))
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchAdmin>> | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!allowed || !w.address) return
    void fetchAdmin(w.address).then(setData).catch((e: Error) => setErr(e.message))
  }, [allowed, w.address])

  return (
    <main className="paper paper--page">
      <p className="kicker">Operations</p>
      <h1>Admin</h1>
      <p>Inspect only. No owner keys, no pause switches, no withdrawals.</p>
      {!allowed && <p className="err">This wallet is not in VITE_GITPAD_ADMINS.</p>}
      <ErrorState error={err} />
      {data && (
        <>
          <h2>API health</h2>
          <dl className="kv">
            <div><dt>GitHub remaining</dt><dd>{data.health.githubRemaining ?? '—'}</dd></div>
            <div><dt>GitHub reset</dt><dd>{data.health.githubReset ? new Date(data.health.githubReset).toLocaleString() : '—'}</dd></div>
            <div><dt>Last IPFS error</dt><dd>{data.health.lastIpfsError || 'none'}</dd></div>
            <div><dt>Last Pons error</dt><dd>{data.health.lastPonsError || 'none'}</dd></div>
          </dl>
          <p className="muted">{data.ponsNote}</p>
          <h2>Integrations</h2>
          <ul className="stats">
            {Object.entries(data.integrations).map(([k, v]) => (
              <li key={k}><span>{k}</span><b>{v ? 'on' : 'off'}</b></li>
            ))}
          </ul>
          <h2>Repository mappings</h2>
          {data.mappings.length ? data.mappings.map((t) => (
            <p key={t.address}>
              <span className="kicker">{t.kind}</span>{' '}
              {t.owner}/{t.name} → <a href={`/token/${t.address}`} onClick={onNavClick(`/token/${t.address}`)} className="mono">{t.address}</a>
            </p>
          )) : <p className="muted">No token/repository mappings yet.</p>}
          <h2>Failed / reverted</h2>
          {data.failed.length ? data.failed.map((d) => (
            <p key={d.txHash} className="mono">{d.status} · {d.txHash} · {d.error || ''}</p>
          )) : <p className="muted">No failed transactions indexed.</p>}
          <h2>Recent deployments</h2>
          {data.deployments.length ? data.deployments.slice(0, 12).map((d) => (
            <p key={d.txHash} className="mono">{d.status} · {d.token} · {new Date(d.at).toLocaleString()}</p>
          )) : <p className="muted">No deployments indexed.</p>}
        </>
      )}
    </main>
  )
}
