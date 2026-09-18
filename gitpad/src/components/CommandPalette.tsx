import { useEffect, useState } from 'react'
import { CopyButton } from './CopyButton.tsx'
import { saveWatch, searchGitPad, type SearchHit } from '../lib/api.ts'
import { copyText } from '../lib/copy.ts'
import { launchPath, navigate } from '../lib/router.ts'
import { useWallet } from '../lib/wallet.tsx'

function hitKey(h: SearchHit, i: number): string {
  switch (h.kind) {
    case 'repo': return `r-${h.repo.id}-${i}`
    case 'token': return `t-${h.token.address}-${i}`
    case 'owner': return `o-${h.login}-${i}`
    case 'contract': return `c-${h.address}-${i}`
    default: {
      const _e: never = h
      return _e
    }
  }
}

export function CommandPalette() {
  const w = useWallet()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [busy, setBusy] = useState(false)
  const [sel, setSel] = useState(0)
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [])

  useEffect(() => {
    if (!open || !q.trim()) { setHits([]); setSel(0); return }
    const t = window.setTimeout(() => {
      setBusy(true)
      void searchGitPad(q.trim())
        .then((row) => { setHits(row.hits); setSel(0) })
        .catch(() => setHits([]))
        .finally(() => setBusy(false))
    }, 200)
    return () => window.clearTimeout(t)
  }, [q, open])

  if (!open) return null

  function go(href: string) {
    setOpen(false)
    setQ('')
    navigate(href)
  }

  function primary(h: SearchHit) {
    switch (h.kind) {
      case 'repo':
        go(location.pathname === '/launch' || location.pathname === '/connect'
          ? launchPath(h.repo.owner, h.repo.name)
          : `/repo/${h.repo.owner}/${h.repo.name}`)
        return
      case 'token':
        go(`/token/${h.token.address}`)
        return
      case 'owner':
        go(`/explore?q=${encodeURIComponent(h.login)}`)
        return
      case 'contract':
        if (h.token) go(`/token/${h.token.address}`)
        return
      default: {
        const _e: never = h
        return _e
      }
    }
  }

  async function watchHit(h: SearchHit) {
    if (!w.address) { setNote('Connect a wallet to watch.'); return }
    if (h.kind === 'repo') {
      await saveWatch({ wallet: w.address, kind: 'repo', owner: h.repo.owner, name: h.repo.name, githubId: h.repo.id, alerts: { trending: true, launch: true } })
      setNote(`Watching ${h.repo.fullName}`)
      return
    }
    if (h.kind === 'token' || (h.kind === 'contract' && h.token)) {
      const token = h.kind === 'token' ? h.token.address : h.token!.address
      await saveWatch({ wallet: w.address, kind: 'token', token, alerts: { trending: false, launch: true } })
      setNote('Watching token')
      return
    }
    setNote('Nothing to watch on this hit.')
  }

  return (
    <div className="cmd" role="dialog" aria-label="Search GitPad">
      <button type="button" className="cmd__scrim" onClick={() => setOpen(false)} aria-label="Close search" />
      <div className="cmd__box">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="react  $REACT  0x…  openai/codex"
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setSel((i) => Math.min(hits.length - 1, i + 1)) }
            if (e.key === 'ArrowUp') { e.preventDefault(); setSel((i) => Math.max(0, i - 1)) }
            if (e.key === 'Enter' && hits[sel]) { e.preventDefault(); primary(hits[sel]) }
          }}
        />
        {busy && <p className="muted">Searching…</p>}
        {note && <p className="ok">{note}</p>}
        <ul>
          {hits.map((h, i) => {
            const on = i === sel
            if (h.kind === 'repo') {
              return (
                <li key={hitKey(h, i)} className={on ? 'is-on' : ''}>
                  <button type="button" onClick={() => primary(h)}>
                    <strong>{h.repo.fullName}</strong>
                    <span>
                      {h.repo.tokenStatus === 'live' ? 'Token live' : 'Launch available'}
                      {h.maintainer ? ' · ✓ maintainer verified' : ''}
                      {' · score '}{h.repo.trendScore}
                    </span>
                  </button>
                  <div className="cmd__act">
                    <button type="button" className="linkish" onClick={() => go(`/repo/${h.repo.owner}/${h.repo.name}`)}>Open Repository</button>
                    {h.repo.tokenStatus === 'live'
                      ? <button type="button" className="linkish" onClick={() => go(`/t/${h.repo.owner}/${h.repo.name}`)}>Open Token</button>
                      : <button type="button" className="linkish" onClick={() => go(launchPath(h.repo.owner, h.repo.name))}>Launch</button>}
                    <button type="button" className="linkish" onClick={() => void watchHit(h)}>Watch</button>
                  </div>
                </li>
              )
            }
            if (h.kind === 'token') {
              return (
                <li key={hitKey(h, i)} className={on ? 'is-on' : ''}>
                  <button type="button" onClick={() => primary(h)}>
                    <strong>{h.token.displayName} ${h.token.symbol}</strong>
                    <span>{h.token.kind} · {h.token.owner}/{h.token.name}{h.maintainer ? ' · ✓ maintainer' : ''}</span>
                  </button>
                  <div className="cmd__act">
                    <button type="button" className="linkish" onClick={() => go(`/token/${h.token.address}`)}>Open Token</button>
                    <button type="button" className="linkish" onClick={() => go(`/repo/${h.token.owner}/${h.token.name}`)}>Open Repository</button>
                    <button type="button" className="linkish" onClick={() => void copyText(h.token.address).then(() => setNote('CA copied'))}>Copy CA</button>
                    <button type="button" className="linkish" onClick={() => void watchHit(h)}>Watch</button>
                  </div>
                </li>
              )
            }
            if (h.kind === 'contract') {
              return (
                <li key={hitKey(h, i)} className={on ? 'is-on' : ''}>
                  <button type="button" onClick={() => primary(h)}>
                    <strong className="mono">{h.address}</strong>
                    <span>{h.token ? `${h.token.displayName} $${h.token.symbol}` : 'Contract not in the GitPad index'}</span>
                  </button>
                  <div className="cmd__act">
                    <CopyButton value={h.address} label="Copy CA" />
                    {h.token && <button type="button" className="linkish" onClick={() => go(`/token/${h.token!.address}`)}>Open Token</button>}
                  </div>
                </li>
              )
            }
            return (
              <li key={hitKey(h, i)} className={on ? 'is-on' : ''}>
                <button type="button" onClick={() => primary(h)}>
                  <strong>{h.login}</strong>
                  <span>{h.repos} indexed repos</span>
                </button>
              </li>
            )
          })}
        </ul>
        {!busy && q && !hits.length && <p className="muted">No matches.</p>}
      </div>
    </div>
  )
}
