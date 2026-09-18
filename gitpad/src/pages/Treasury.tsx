import { useEffect, useState } from 'react'
import { isAddress } from 'viem'
import { ErrorState } from '../components/ErrorState.tsx'
import { fetchRepoBundle, setTreasury } from '../lib/api.ts'
import { addressUrl, short, tokenUrl, txUrl } from '../lib/chain.ts'
import { fmtRblx } from '../lib/format.ts'
import { useFeeRouter } from '../hooks/useFeeRouter.ts'
import { useWallet } from '../lib/wallet.tsx'

export function Treasury({ owner, repo }: { owner: string | null; repo: string | null }) {
  const w = useWallet()
  const [treasury, setAddr] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [token, setToken] = useState<string>('')
  const fees = useFeeRouter(token || undefined)

  useEffect(() => {
    if (!owner || !repo) return
    void fetchRepoBundle(owner, repo).then((row) => {
      setToken(row.tokens.find((t) => t.kind === 'canonical')?.address || row.tokens[0]?.address || '')
      if (row.verified?.treasury) setAddr(row.verified.treasury)
    }).catch((e: Error) => setErr(e.message))
  }, [owner, repo])

  async function save() {
    if (!owner || !repo || !w.address) return
    if (!isAddress(treasury)) { setErr('Treasury must be a 0x address'); return }
    setErr(null)
    try {
      await setTreasury({ owner, name: repo, wallet: w.address, treasury })
      setOk('Treasury saved. Fee routing still follows Pons permissions.')
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  return (
    <main className="paper paper--page">
      <p className="kicker">Repository treasury</p>
      <h1>{owner && repo ? `${owner}/${repo}` : 'Select a claimed repository'}</h1>
      <ErrorState error={err} />
      {ok && <p className="ok">{ok}</p>}
      <label>
        Treasury address
        <input className="field" value={treasury} onChange={(e) => setAddr(e.target.value)} placeholder="0x…" />
      </label>
      <button type="button" className="btn btn--lime" onClick={() => void save()}>Register treasury</button>
      <dl className="kv">
        <div><dt>Total earned</dt><dd>{fmtRblx(fees.distributed, 4)} ETH</dd></div>
        <div><dt>24h fees</dt><dd>—</dd></div>
        <div><dt>7d fees</dt><dd>—</dd></div>
        <div><dt>Lifetime fees</dt><dd>{fmtRblx(fees.distributed, 4)} ETH</dd></div>
        <div><dt>Connected token</dt><dd className="mono">{token ? <a href={tokenUrl(token)} target="_blank" rel="noreferrer">{short(token, 6)}</a> : 'none'}</dd></div>
        <div><dt>Treasury address</dt><dd className="mono">{isAddress(treasury) ? <a href={addressUrl(treasury)} target="_blank" rel="noreferrer">{treasury}</a> : 'not set'}</dd></div>
      </dl>
      <p className="muted">24h / 7d stay blank until GitPadFeeRouter is live and distributions are timestamped. Lifetime is the on-chain sweep total.</p>
      <h2>Recent</h2>
      {fees.history.length ? fees.history.map((h) => (
        <p key={h.tx}><a href={txUrl(h.tx)} target="_blank" rel="noreferrer">{h.role} · {h.tx.slice(0, 10)}</a></p>
      )) : <p className="muted">No distributions indexed.</p>}
    </main>
  )
}
