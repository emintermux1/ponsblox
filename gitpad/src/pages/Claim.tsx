import { useEffect, useState } from 'react'
import { ErrorState } from '../components/ErrorState.tsx'
import { exchangeGithubOAuth, startGithubOAuth } from '../lib/api.ts'
import { parseGithubInput } from '../lib/naming.ts'
import { navigate } from '../lib/router.ts'
import { useWallet } from '../lib/wallet.tsx'

function readOauthState(): { owner?: string; name?: string } | null {
  const raw = new URLSearchParams(location.search).get('state')
  if (!raw) return null
  try {
    const pad = raw.replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(pad)) as { owner?: string; name?: string }
  } catch {
    return null
  }
}

type Step = 'repo' | 'github' | 'permissions' | 'ownership' | 'wallet' | 'confirm'

export function Claim({ owner, repo, code }: { owner: string | null; repo: string | null; code: string | null }) {
  const w = useWallet()
  const st = readOauthState()
  const [draft, setDraft] = useState(owner && repo ? `${owner}/${repo}` : (st?.owner && st?.name ? `${st.owner}/${st.name}` : ''))
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [verified, setVerified] = useState<string | null>(null)

  const picked = parseGithubInput(draft) || (owner && repo ? { owner, name: repo } : null)
  const step: Step = verified
    ? 'confirm'
    : code
      ? (w.address ? 'ownership' : 'wallet')
      : !picked
        ? 'repo'
        : !w.address
          ? 'wallet'
          : 'github'

  useEffect(() => {
    if (!code || !w.address) return
    const hit = parseGithubInput(draft) || (owner && repo ? { owner, name: repo } : null) || (st?.owner && st.name ? { owner: st.owner, name: st.name } : null)
    if (!hit) return
    setBusy('Verifying permissions and maintainer status…')
    void exchangeGithubOAuth({ code, owner: hit.owner, name: hit.name, wallet: w.address })
      .then((row) => {
        if (row) {
          setVerified(`${row.login} · ${row.owner}/${row.name}`)
          window.setTimeout(() => navigate(`/repo/${row.owner}/${row.name}`), 1200)
        }
      })
      .catch((e: Error) => setErr(e.message))
      .finally(() => setBusy(null))
  }, [code, w.address, draft, owner, repo])

  async function start() {
    const hit = parseGithubInput(draft)
    if (!hit) { setErr('Paste owner/name or a GitHub URL'); return }
    if (!w.address) { setErr('Connect the maintainer wallet first'); return }
    setErr(null)
    setBusy('Opening GitHub OAuth…')
    try {
      const row = await startGithubOAuth(hit.owner, hit.name, w.address)
      if (!row.configured || !row.url) throw new Error(row.error || 'OAuth is not configured')
      location.href = row.url
    } catch (e) {
      setErr((e as Error).message)
      setBusy(null)
    }
  }

  const steps: { id: Step; label: string; hint: string }[] = [
    { id: 'repo', label: 'Select repository', hint: 'owner/name' },
    { id: 'github', label: 'Connect GitHub', hint: 'OAuth' },
    { id: 'permissions', label: 'Verify permissions', hint: 'GitHub token scope' },
    { id: 'ownership', label: 'Verify ownership', hint: 'Maintainer or admin' },
    { id: 'wallet', label: 'Connect wallet', hint: 'Stored as verifier' },
    { id: 'confirm', label: 'Confirm claim', hint: 'Badge only' },
  ]

  return (
    <main className="paper paper--page">
      <p className="kicker">Claim repository</p>
      <h1>CLAIM THIS REPOSITORY</h1>
      <p>A verified maintainer badge is not an endorsement of any token, and it does not move token ownership.</p>
      <ol className="claimsteps">
        {steps.map((s) => (
          <li key={s.id} className={s.id === step ? 'is-on' : ''}>
            <strong>{s.label}</strong>
            <span>{s.hint}</span>
          </li>
        ))}
      </ol>
      <ErrorState error={err} />
      {busy && <p className="ok">{busy}</p>}
      {verified && <p className="ok">✓ VERIFIED MAINTAINER · {verified}</p>}
      <label>
        Repository
        <input className="field" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="owner/name" />
      </label>
      <p className="muted">Wallet {w.address || 'not connected'} will be stored as the verified maintainer address.</p>
      <button type="button" className="btn btn--lime" disabled={!!busy || !!verified} onClick={() => void start()}>
        {w.address ? 'Connect GitHub' : 'Connect wallet first, then GitHub'}
      </button>
      <p className="muted">If GITHUB_OAUTH_CLIENT_ID is unset, this button returns a configuration error instead of a fake claim.</p>
    </main>
  )
}
