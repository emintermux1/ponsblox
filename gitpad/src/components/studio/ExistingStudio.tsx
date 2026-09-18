import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { isAddress, type Address } from 'viem'
import { ErrorState } from '../ErrorState.tsx'
import { RepoDossier } from '../RepoDossier.tsx'
import { FeeRouteStatus } from './FeeRouteStatus.tsx'
import { StudioBrief } from './StudioBrief.tsx'
import { StudioDock } from './StudioDock.tsx'
import { StudioFees } from './StudioFees.tsx'
import { StudioPreview } from './StudioPreview.tsx'
import { StudioProgress } from './StudioProgress.tsx'
import { fetchRepo, fetchRepos, type RepoCard, type RepoDetail } from '../../lib/api.ts'
import { failMessage, quoteLabel, X_URL } from '../../lib/format.ts'
import {
  GITPAD_FEE_ROUTER, feeRouterLive, gitpadContractsLive, linkOnchain,
  readFeeRoute, setFeeRoute, type FeeSplit, validateSplits,
} from '../../lib/gitpad.ts'
import { trackLaunch } from '../../lib/launchEvents.ts'
import { parseGithubInput } from '../../lib/naming.ts'
import { feeBrief, feePermissionFor, hasFeeStep, readToken, transferCreatorFeeRecipient, type FeePermission, type TokenRecord } from '../../lib/pons.ts'
import { rememberLocal } from '../../lib/tokens.ts'
import { navigate } from '../../lib/router.ts'
import { useWallet } from '../../lib/wallet.tsx'

type Phase = 'token' | 'repo' | 'fees' | 'review' | 'activate'

const PHASES: { id: Phase; label: string }[] = [
  { id: 'token', label: '01 Token' },
  { id: 'repo', label: '02 Repository' },
  { id: 'fees', label: '03 Fees' },
  { id: 'review', label: '04 Review' },
  { id: 'activate', label: '05 Activate' },
]

function nextPhase(phase: Phase, supported: boolean): Phase {
  switch (phase) {
    case 'token': return 'repo'
    case 'repo': return supported ? 'fees' : 'review'
    case 'fees': return 'review'
    case 'review': return 'activate'
    case 'activate': return 'activate'
    default: {
      const _e: never = phase
      return _e
    }
  }
}

function prevPhase(phase: Phase, supported: boolean): Phase {
  switch (phase) {
    case 'token': return 'token'
    case 'repo': return 'token'
    case 'fees': return 'repo'
    case 'review': return supported ? 'fees' : 'repo'
    case 'activate': return 'review'
    default: {
      const _e: never = phase
      return _e
    }
  }
}

export function ExistingStudio({
  previewOpen = false,
  head,
}: {
  previewOpen?: boolean
  head?: HTMLDivElement | null
}) {
  const w = useWallet()
  const [phase, setPhase] = useState<Phase>('token')
  const [addr, setAddr] = useState('')
  const [row, setRow] = useState<TokenRecord | null>(null)
  const [draft, setDraft] = useState('')
  const [picked, setPicked] = useState<{ owner: string; name: string } | null>(null)
  const [detail, setDetail] = useState<RepoDetail | null>(null)
  const [choices, setChoices] = useState<RepoCard[]>([])
  const [splits, setSplits] = useState<FeeSplit[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [perm, setPerm] = useState<FeePermission | null>(null)
  const [locked, setLocked] = useState(false)
  const [feeAck, setFeeAck] = useState(false)
  const treasury = ((import.meta.env.VITE_GITPAD_TREASURY as string | undefined)?.trim() || '')

  useEffect(() => {
    if (phase !== 'repo') return
    let live = true
    void fetchRepos('trending').then((rows) => { if (live) setChoices(rows.slice(0, 8)) }).catch(() => {})
    return () => { live = false }
  }, [phase])

  useEffect(() => {
    if (detail) trackLaunch('repository_selected')
  }, [detail?.id])

  useEffect(() => {
    if (!picked) return
    void fetchRepo(picked.owner, picked.name)
      .then((repo) => {
        setDetail(repo)
        if (repo.owner !== picked.owner || repo.name !== picked.name) {
          setPicked({ owner: repo.owner, name: repo.name })
          setDraft(`${repo.owner}/${repo.name}`)
        }
      })
      .catch((e: Error) => setErr(e.message))
  }, [picked])

  useEffect(() => {
    if (!row) return
    setPerm(feePermissionFor({ token: row, wallet: w.address || undefined, feeRouter: GITPAD_FEE_ROUTER }))
  }, [row, w.address])

  useEffect(() => {
    if (!w.address || !row) return
    setSplits((cur) => cur.length ? cur : [
      { to: w.address as Address, bps: 7000, role: 'CREATOR' },
      { to: (treasury || w.address) as Address, bps: 2000, role: 'TREASURY' },
      { to: (treasury || w.address) as Address, bps: 1000, role: 'GITPAD' },
    ])
  }, [w.address, row, treasury])

  async function verify() {
    setErr(null)
    if (!isAddress(addr)) { setErr('Paste a token contract address'); return }
    setBusy('Reading Pons V2…')
    try {
      const rec = await readToken(addr as Address)
      if (!rec) throw new Error('Not a Pons V2 launch')
      setRow(rec)
      if (rec.repo) {
        setPicked(rec.repo)
        setDraft(`${rec.repo.owner}/${rec.repo.name}`)
      }
      const existing = await readFeeRoute(rec.token).catch(() => [])
      if (existing.length) setSplits(existing)
      setPerm(feePermissionFor({ token: rec, wallet: w.address || undefined, feeRouter: GITPAD_FEE_ROUTER }))
      setPhase('repo')
    } catch (e) {
      setErr(failMessage((e as Error).message))
    } finally {
      setBusy(null)
    }
  }

  async function activate() {
    if (!w.address || !w.walletClient || !row || !picked || locked) return
    if (perm?.supported) {
      const splitErr = validateSplits(splits.filter((s) => s.bps > 0))
      if (splitErr) { setErr(splitErr); return }
      if (!feeAck) { setErr('Confirm fee destinations'); return }
    }
    setErr(null)
    setLocked(true)
    try {
      if (gitpadContractsLive()) trackLaunch('wallet_requested')
      if (!w.onRightChain) await w.switchChain()
      const nextPerm = feePermissionFor({ token: row, wallet: w.address, feeRouter: GITPAD_FEE_ROUTER })
      setPerm(nextPerm)
      if (nextPerm.kind === 'need_creator') {
        setErr('Connect the creator wallet.')
        return
      }
      if (gitpadContractsLive()) {
        setBusy('Link repository…')
        await linkOnchain(w.walletClient, w.address, row.token, picked.owner, picked.name, '', detail?.id || 0)
      }
      if (nextPerm.kind === 'transfer_recipient' && feeRouterLive()) {
        setBusy('transferCreatorFeeRecipient → GitPadFeeRouter')
        await transferCreatorFeeRecipient(w.walletClient, w.address, row.token, GITPAD_FEE_ROUTER as Address)
      }
      if ((nextPerm.kind === 'router_set' || nextPerm.kind === 'transfer_recipient') && feeRouterLive()) {
        setBusy('Writing fee route…')
        await setFeeRoute(w.walletClient, w.address, row.token, splits.filter((s) => s.bps > 0))
      }
      rememberLocal({ token: row.token, owner: picked.owner, name: picked.name, symbol: row.symbol, at: Date.now(), githubId: detail?.id })
      navigate(`/token/${row.token}`)
    } catch (e) {
      setErr(failMessage((e as Error).message))
    } finally {
      setBusy(null)
      setLocked(false)
    }
  }

  const active = splits.filter((s) => s.bps > 0)
  const supported = Boolean(perm?.supported)
  const feeStep = hasFeeStep(perm)
  const draftHit = parseGithubInput(draft)

  function jumpTo(target: Phase) {
    const order = PHASES.map((s) => s.id)
    if (order.indexOf(target) > order.indexOf(phase)) return
    if (target !== 'token' && !row) return
    setPhase(target)
  }

  function dockLabel(): string {
    switch (phase) {
      case 'token': return 'Validate contract'
      case 'repo': return detail ? 'Use this repository' : 'Continue'
      case 'fees':
      case 'review': return 'Continue'
      case 'activate':
        if (perm?.kind === 'need_creator') return 'Connect creator wallet'
        return gitpadContractsLive() || feeRouterLive() ? 'Activate' : 'Activate locally'
      default: {
        const _e: never = phase
        return _e
      }
    }
  }

  function dockDisabled(): boolean {
    switch (phase) {
      case 'token': return !addr.trim()
      case 'repo': return !detail && !draftHit
      case 'fees': return Boolean(supported && (validateSplits(active) || !feeAck))
      case 'review': return !row || !picked
      case 'activate': return !w.walletClient || Boolean(busy) || locked || perm?.kind === 'need_creator'
      default: {
        const _e: never = phase
        return _e
      }
    }
  }

  function continueNow() {
    switch (phase) {
      case 'token':
        void verify()
        return
      case 'repo':
        if (detail) {
          setPhase(nextPhase(phase, feeStep))
          return
        }
        if (!draftHit) { setErr('Paste owner/name or a GitHub URL'); return }
        setErr(null)
        setPicked(draftHit)
        return
      case 'fees':
        if (supported && (validateSplits(active) || !feeAck)) return
        trackLaunch('fee_configured')
        setPhase('review')
        return
      case 'review':
        trackLaunch('launch_reviewed')
        setPhase('activate')
        return
      case 'activate':
        void activate()
        return
      default: {
        const _e: never = phase
        return _e
      }
    }
  }

  const header = (
    <>
      <StudioProgress steps={PHASES} current={phase} onJump={jumpTo} />
      <StudioBrief
        owner={picked?.owner || ''}
        repo={picked?.name || ''}
        displayName={row?.name || ''}
        symbol={row?.symbol || ''}
        fees={feeBrief(perm)}
        liveWhen="Already on Pons. Activate only links the repository — it does not mint."
      />
    </>
  )

  return (
    <>
      {head ? createPortal(header, head) : <div className="studio__existhead">{header}</div>}
    <div className={`studio__grid${previewOpen ? ' is-preview' : ''}`}>
      <section className="studio__form">
        <ErrorState error={err} />
        {busy && <p className="ok">{busy}</p>}

        {phase === 'token' && (
          <>
            <h1>EXISTING TOKEN</h1>
            <p className="lede">Paste a Pons V2 contract.</p>
            <label>
              Contract address
              <input className="field" value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="0x…" />
            </label>
            <button type="button" className="btn btn--lime btn--lg" onClick={() => void verify()}>Validate contract</button>
          </>
        )}

        {row && phase !== 'token' && (
          <div className="status">
            <p className="kicker">TOKEN FOUND</p>
            <p><strong>{row.name}</strong> ${row.symbol}</p>
            <p className="mono break">{row.token}</p>
            <p>X <a href={X_URL} target="_blank" rel="noreferrer">@LaunchGitLab</a></p>
            <p>Robinhood Chain 4663 · pair {quoteLabel(row.pairToken, row.pairSymbol)}</p>
            <FeeRouteStatus perm={perm} />
          </div>
        )}

        {phase === 'repo' && (
          <>
            <h2>Choose GitHub repository</h2>
            <form onSubmit={(e) => {
              e.preventDefault()
              const hit = parseGithubInput(draft)
              if (!hit) { setErr('Paste owner/name or a GitHub URL'); return }
              setErr(null)
              setPicked(hit)
            }}
            >
              <input className="field" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="github.com/owner/repository" />
              <button type="submit" className="btn btn--lime">Fetch repository</button>
            </form>
            <ul className="pick">
              {choices.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => { setPicked({ owner: c.owner, name: c.name }); setDraft(`${c.owner}/${c.name}`) }}>
                    <strong>{c.owner}/{c.name}</strong>
                    <span>{c.description || 'No description'}</span>
                  </button>
                </li>
              ))}
            </ul>
            {detail && picked && (
              <>
                <RepoDossier detail={detail} />
                <button type="button" className="btn btn--lime" onClick={() => setPhase(nextPhase('repo', feeStep))}>
                  Use this repository
                </button>
              </>
            )}
          </>
        )}

        {phase === 'fees' && row && (
          <>
            {perm?.supported && feeRouterLive() ? (
              <StudioFees
                rows={splits}
                onChange={setSplits}
                treasuryConfigured={false}
                treasury=""
                gitpadTreasury={treasury}
                confirm={feeAck}
                onConfirm={setFeeAck}
              />
            ) : (
              <FeeRouteStatus perm={perm} />
            )}
            <div className="hero__cta">
              <button type="button" className="btn btn--paper" onClick={() => setPhase('repo')}>Back</button>
              <button type="button" className="btn btn--lime" disabled={perm?.supported && (!!validateSplits(active) || !feeAck)} onClick={() => { trackLaunch('fee_configured'); setPhase('review') }}>
                Continue
              </button>
            </div>
          </>
        )}

        {phase === 'review' && row && picked && (
          <>
            <h2>Review activation</h2>
            <dl className="kv">
              <div><dt>Token</dt><dd>{row.name} ${row.symbol}</dd></div>
              <div><dt>Repository</dt><dd>{picked.owner}/{picked.name}</dd></div>
              <div><dt>X</dt><dd><a href={X_URL} target="_blank" rel="noreferrer">{X_URL}</a></dd></div>
              <div><dt>Fees</dt><dd>{feeBrief(perm)}</dd></div>
            </dl>
            <div className="hero__cta">
              <button type="button" className="btn btn--paper" onClick={() => setPhase(prevPhase('review', feeStep))}>Back</button>
              <button type="button" className="btn btn--lime" onClick={() => { trackLaunch('launch_reviewed'); setPhase('activate') }}>Continue</button>
            </div>
          </>
        )}

        {phase === 'activate' && row && picked && (
          <>
            <h2>Approve and activate</h2>
            <p>This does not redeploy. Connect the creator wallet; GitPad sends the fee writes. You only sign.</p>
            <FeeRouteStatus perm={perm} />
            <div className="hero__cta">
              <button type="button" className="btn btn--paper" onClick={() => setPhase('review')} disabled={locked}>Back</button>
              <button type="button" className="btn btn--lime" disabled={!w.walletClient || !!busy || locked || perm?.kind === 'need_creator'} onClick={() => void activate()}>
                {perm?.kind === 'need_creator' ? 'Connect creator wallet' : gitpadContractsLive() || feeRouterLive() ? 'Activate' : 'Activate locally'}
              </button>
            </div>
          </>
        )}
      </section>
      <StudioPreview
        name={row?.name || ''}
        symbol={row?.symbol || ''}
        image={row?.logo || ''}
        description={row?.description || ''}
        owner={picked?.owner || ''}
        repo={picked?.name || ''}
        detail={detail}
        splits={active}
        routeFees={Boolean(perm?.supported)}
        routerLive={feeRouterLive()}
        feeHint={feeBrief(perm)}
      />
    </div>
      <StudioDock
        label={dockLabel()}
        disabled={dockDisabled()}
        onContinue={continueNow}
        onBack={phase === 'token' ? undefined : () => setPhase(prevPhase(phase, feeStep))}
        waiting={busy}
      />
    </>
  )
}
