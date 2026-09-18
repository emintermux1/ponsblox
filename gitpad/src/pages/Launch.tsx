import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { formatUnits, isAddress, type Address, type Hash } from 'viem'
import { DeployTerminal, type DeployLine } from '../components/DeployTerminal.tsx'
import { ErrorState } from '../components/ErrorState.tsx'
import { ExistingStudio } from '../components/studio/ExistingStudio.tsx'
import { ImageDrop } from '../components/studio/ImageDrop.tsx'
import { RepoConfirm } from '../components/studio/RepoConfirm.tsx'
import { ReviewSheet, feeSheetLine } from '../components/studio/ReviewSheet.tsx'
import { StudioAdvanced } from '../components/studio/StudioAdvanced.tsx'
import { StudioBrief } from '../components/studio/StudioBrief.tsx'
import { StudioChrome } from '../components/studio/StudioChrome.tsx'
import { StudioDock } from '../components/studio/StudioDock.tsx'
import { StudioProgress } from '../components/studio/StudioProgress.tsx'
import { StudioFail } from '../components/studio/StudioFail.tsx'
import { StudioFees } from '../components/studio/StudioFees.tsx'
import { StudioPreview } from '../components/studio/StudioPreview.tsx'
import { StudioSuccess } from '../components/studio/StudioSuccess.tsx'
import { fetchIpfsStatus, uploadFile, uploadMetadata, type IpfsPin, type IpfsStatus } from '../lib/ipfs.ts'
import { fetchRepoBundle, fetchRepos, fetchWatch, type RepoCard, type RepoDetail, type TokenRow, type WatchItem } from '../lib/api.ts'
import { short } from '../lib/chain.ts'
import { classifyLaunchFail, type LaunchFail } from '../lib/errors.ts'
import { compact, bpsToPct, clampCreatorTaxBps, MAX_CREATOR_TAX_BPS, pctToBps, X_URL } from '../lib/format.ts'
import { type DeployPhase, phaseFromStatus, submittedHash } from '../lib/deployPhase.ts'
import { launchId, upsertLaunchHistory } from '../lib/launchHistory.ts'
import { trackLaunch } from '../lib/launchEvents.ts'
import {
  GITPAD_FEE_ROUTER, feeRouterLive, gitpadContractsLive,
  linkOnchain, setFeeRoute, type FeeSplit, validateSplits,
} from '../lib/gitpad.ts'
import { validateMetadata } from '../lib/metadata.ts'
import { byGitlabName, parseGithubInput, stripGitlabSuffix } from '../lib/naming.ts'
import { clearPendingLaunch, readPendingLaunch, writePendingLaunch } from '../lib/pending.ts'
import {
  buildLaunchCall, checkLogo, publicClient, readCanLaunch, readFactoryStatus, sendLaunch,
  tokenFromLaunchReceipt, type FactoryStatus,
} from '../lib/pons.ts'
import { readRecentRepos, rememberRecentRepo } from '../lib/recent.ts'
import { rememberLocal } from '../lib/tokens.ts'
import { navigate } from '../lib/router.ts'
import { useWallet } from '../lib/wallet.tsx'

type Step = 'repo' | 'token' | 'fees' | 'review' | 'deploy'

const STEPS: { id: Step; label: string }[] = [
  { id: 'repo', label: '01 Repository' },
  { id: 'token', label: '02 Token' },
  { id: 'fees', label: '03 Fees' },
  { id: 'review', label: '04 Review' },
  { id: 'deploy', label: '05 Deploy' },
]

function nextStep(step: Step): Step {
  switch (step) {
    case 'repo': return 'token'
    case 'token': return 'fees'
    case 'fees': return 'review'
    case 'review': return 'deploy'
    case 'deploy': return 'deploy'
    default: {
      const _e: never = step
      return _e
    }
  }
}

function prevStep(step: Step): Step {
  switch (step) {
    case 'repo': return 'repo'
    case 'token': return 'repo'
    case 'fees': return 'token'
    case 'review': return 'fees'
    case 'deploy': return 'review'
    default: {
      const _e: never = step
      return _e
    }
  }
}

export function Launch({
  owner,
  repo,
  mode = 'new',
}: {
  owner: string | null
  repo: string | null
  mode?: 'new' | 'existing'
}) {
  const w = useWallet()
  const [studioMode, setStudioMode] = useState<'new' | 'existing'>(mode)
  const [step, setStep] = useState<Step>('repo')
  const [picked, setPicked] = useState<{ owner: string; name: string } | null>(
    owner && repo ? { owner, name: repo } : null,
  )
  const [hint, setHint] = useState<RepoCard | null>(null)
  const [resolving, setResolving] = useState(false)
  const [detail, setDetail] = useState<RepoDetail | null>(null)
  const [choices, setChoices] = useState<RepoCard[]>([])
  const [recent, setRecent] = useState(() => readRecentRepos())
  const [watched, setWatched] = useState<WatchItem[]>([])
  const [draft, setDraft] = useState(owner && repo ? `github.com/${owner}/${repo}` : '')
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [logo, setLogo] = useState('')
  const [description, setDescription] = useState('')
  const [telegram, setTelegram] = useState('')
  const [extraSite, setExtraSite] = useState('')
  const [quoteIn, setQuoteIn] = useState('')
  const [minOut, setMinOut] = useState('')
  const [manualMeta, setManualMeta] = useState('')
  const [advanced, setAdvanced] = useState(false)
  const [customTreasury, setCustomTreasury] = useState('')
  const [costNote, setCostNote] = useState('Launch fee unread. Gas is estimated in the wallet.')
  const [phase, setPhase] = useState<DeployPhase>('IDLE')
  const [fail, setFail] = useState<LaunchFail | null>(null)
  const [tax, setTax] = useState(100)
  const [buyback, setBuyback] = useState(false)
  const historyRef = useRef<string | null>(null)
  const startedRef = useRef(false)
  const [showPreview, setShowPreview] = useState(false)
  const [existHead, setExistHead] = useState<HTMLDivElement | null>(null)
  const [registryBusy, setRegistryBusy] = useState(false)
  const [registryDone, setRegistryDone] = useState(false)
  const [routeFees, setRouteFees] = useState(false)
  const [splits, setSplits] = useState<FeeSplit[]>([])
  const [ipfs, setIpfs] = useState<IpfsStatus | null>(null)
  const [imagePin, setImagePin] = useState<IpfsPin | null>(null)
  const [metaPin, setMetaPin] = useState<IpfsPin | null>(null)
  const [uploading, setUploading] = useState<string | null>(null)
  const [status, setStatus] = useState<FactoryStatus | null>(null)
  const [can, setCan] = useState<boolean | null>(null)
  const [lines, setLines] = useState<DeployLine[]>([])
  const [locked, setLocked] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState<{ hash: string; token: string | null; linkHash?: string } | null>(null)
  const [existing, setExisting] = useState<TokenRow[]>([])
  const [verifiedTreasury, setVerifiedTreasury] = useState<string>('')
  const [ack, setAck] = useState(false)
  const [feeAck, setFeeAck] = useState(false)
  const [communityAck, setCommunityAck] = useState(false)

  const displayName = byGitlabName(name)
  const website = picked ? `https://github.com/${picked.owner}/${picked.name}` : extraSite
  const gitpadTreasury = ((import.meta.env.VITE_GITPAD_TREASURY as string | undefined)?.trim() || '') as Address | ''
  const parsed = parseGithubInput(draft)
  const canonical = existing.find((t) => t.kind === 'canonical') || null
  const activeSplits = splits.filter((s) => s.bps > 0)
  const splitErr = routeFees ? validateSplits(activeSplits) : null

  useEffect(() => { setStudioMode(mode) }, [mode])

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    trackLaunch('launch_started')
  }, [])

  useEffect(() => {
    if (detail) trackLaunch('repository_selected')
  }, [detail?.id])

  useEffect(() => {
    if (!owner || !repo) return
    setPicked((cur) => (cur?.owner === owner && cur.name === repo ? cur : { owner, name: repo }))
    setDraft(`github.com/${owner}/${repo}`)
  }, [owner, repo])

  useEffect(() => {
    if (!picked) { setDetail(null); setResolving(false); return }
    let live = true
    setResolving(true)
    setDetail(null)
    setErr(null)
    void fetchRepoBundle(picked.owner, picked.name)
      .then((b) => {
        if (!live) return
        const row = b.repo
        setDetail(row)
        setHint(null)
        setExisting(b.tokens)
        setVerifiedTreasury(b.verified?.treasury || '')
        rememberRecentRepo(row.owner, row.name)
        setRecent(readRecentRepos())
        if (row.owner !== picked.owner || row.name !== picked.name) {
          setPicked({ owner: row.owner, name: row.name })
          setDraft(`github.com/${row.owner}/${row.name}`)
        }
        setName(row.name)
        setSymbol(row.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase() || 'REPO')
        setLogo(`https://github.com/${row.owner}.png`)
        setDescription(row.description || '')
        setExtraSite(row.homepage || '')
      })
      .catch((e: Error) => {
        if (!live) return
        setErr(e.message)
        setExisting([])
        setVerifiedTreasury('')
      })
      .finally(() => { if (live) setResolving(false) })
    return () => { live = false }
  }, [picked])

  useEffect(() => {
    void readFactoryStatus().then(setStatus).catch((e: Error) => setErr(e.message))
    void fetchIpfsStatus().then(setIpfs).catch(() => setIpfs({ configured: false, provider: 'none', note: 'IPFS status unavailable' }))
    void fetchRepos('trending').then((rows) => setChoices(rows.slice(0, 8))).catch(() => {})
  }, [])

  const maxTaxBps = status?.maxCreatorTaxBps ?? MAX_CREATOR_TAX_BPS
  const maxTaxPct = bpsToPct(maxTaxBps)

  useEffect(() => {
    setTax((n) => clampCreatorTaxBps(n, maxTaxBps))
  }, [maxTaxBps])

  useEffect(() => {
    if (!w.address) return
    void fetchWatch(w.address).then((r) => setWatched(r.items.filter((i) => i.kind === 'repo'))).catch(() => {})
  }, [w.address])

  useEffect(() => {
    const pending = readPendingLaunch()
    if (!pending) return
    setPicked({ owner: pending.owner, name: pending.repo })
    setName(pending.name.replace(/\s+By GitLab$/i, ''))
    setSymbol(pending.symbol)
    void resumeHash(pending.hash, pending)
  }, [])

  useEffect(() => {
    if (!customTreasury || !isAddress(customTreasury)) return
    setSplits((cur) => cur.map((s) => (s.role === 'TREASURY' ? { ...s, to: customTreasury as Address } : s)))
  }, [customTreasury])

  useEffect(() => {
    if (!w.address) { setCan(null); return }
    void readCanLaunch(w.address).then(setCan).catch(() => setCan(null))
    const treasury = (verifiedTreasury || gitpadTreasury || w.address) as Address
    setSplits((cur) => cur.length ? cur : [
      { to: w.address as Address, bps: 7000, role: 'CREATOR' },
      { to: treasury, bps: 2500, role: 'TREASURY' },
      { to: (gitpadTreasury || w.address) as Address, bps: 500, role: 'GITPAD' },
    ])
  }, [w.address, gitpadTreasury, verifiedTreasury])

  const pairedDescription = useMemo(() => {
    if (!picked) return description
    const line = `${displayName || 'Token By GitLab'}. Paired with github.com/${picked.owner}/${picked.name} on GitPad.`
    return description.trim() ? `${line} ${description.trim()}` : line
  }, [description, picked, displayName])

  const logoForPons = imagePin?.gateway || logo
  const logoErr = checkLogo(logoForPons)

  const blocked = useMemo(() => {
    if (!w.address) return 'Connect a wallet to launch.'
    if (!w.onRightChain) return 'Switch to Robinhood Chain (4663).'
    if (status && !status.launchEnabled) return 'Pons launches are disabled right now.'
    if (status && !status.approved) return 'Pons is not accepting this quote pair right now.'
    if (can === false) return 'This wallet is not allowed to launch on Pons right now.'
    if (!displayName) return 'Token name is required.'
    if (logoErr) return logoErr
    if (canonical && !communityAck) return 'A canonical GitPad token already exists. View it, or explicitly launch a community token.'
    if (!ack) return 'Confirm the repository disclaimer before deploy.'
    if (routeFees && splitErr) return splitErr
    if (routeFees && !feeAck) return 'Confirm fee destinations before deploy.'
    return null
  }, [w.address, w.onRightChain, status, can, displayName, logoErr, canonical, communityAck, ack, routeFees, splitErr, feeAck])

  function chooseRepo(ownerName: string, repoName: string, card?: RepoCard) {
    setErr(null)
    setCommunityAck(false)
    setResolving(true)
    setHint(card || null)
    setPicked({ owner: ownerName, name: repoName })
    setDraft(`github.com/${ownerName}/${repoName}`)
    if (card) {
      setName(card.name)
      setSymbol(card.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase() || 'REPO')
      setLogo(`https://github.com/${card.owner}.png`)
      setDescription(card.description || '')
    }
  }

  function jumpTo(target: Step) {
    const order = STEPS.map((s) => s.id)
    if (order.indexOf(target) > order.indexOf(step)) return
    if (target !== 'repo' && !picked) return
    setStep(target)
  }

  function continueFromDraft() {
    if (!parsed) { setErr('Paste github.com/owner/repository'); return }
    setErr(null)
    chooseRepo(parsed.owner, parsed.name)
  }

  const pinImage = useCallback(async (file: File) => {
    setUploading('image')
    setErr(null)
    try {
      const pin = await uploadFile(file)
      if (!pin.cid) throw new Error('IPFS returned no image CID')
      setImagePin(pin)
      setLogo(pin.gateway)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setUploading(null)
    }
  }, [])

  async function pinMeta(): Promise<IpfsPin | null> {
    if (!picked || !detail) return null
    setUploading('meta')
    setErr(null)
    try {
      const checked = validateMetadata({
        name: displayName,
        symbol: symbol.toUpperCase(),
        description: pairedDescription,
        image: imagePin?.uri || logo,
        external_url: website,
        github_id: detail.id,
        repository: `${picked.owner}/${picked.name}`,
      })
      if (!checked.ok) throw new Error(checked.error)
      const pin = await uploadMetadata(checked.value)
      if (!pin.cid) throw new Error('IPFS returned no CID')
      setMetaPin(pin)
      return pin
    } catch (e) {
      setErr((e as Error).message)
      throw e
    } finally {
      setUploading(null)
    }
  }

  function persistRow(
    patch: Partial<{ status: 'LIVE' | 'PENDING' | 'FAILED'; hash?: string; token?: string; error?: string }>,
    snap?: { wallet?: string; owner?: string; repo?: string; name?: string; symbol?: string; githubId?: number },
  ) {
    const wallet = snap?.wallet || w.address
    const ownerName = snap?.owner || picked?.owner
    const repoName = snap?.repo || picked?.name
    if (!wallet || !ownerName || !repoName) return
    const id = historyRef.current || launchId({ wallet, owner: ownerName, repo: repoName })
    historyRef.current = id
    upsertLaunchHistory({
      id,
      wallet,
      owner: ownerName,
      repo: repoName,
      githubId: snap?.githubId ?? detail?.id,
      name: snap?.name || displayName,
      symbol: (snap?.symbol || symbol).toUpperCase(),
      status: patch.status || 'PENDING',
      hash: patch.hash,
      token: patch.token,
      error: patch.error,
      retry: patch.error ? classifyLaunchFail(patch.error).retry : undefined,
      at: Date.now(),
      metaUri: metaPin?.uri || manualMeta || undefined,
    })
  }

  function pushLine(text: string, extra: Partial<DeployLine> = {}) {
    const next = phaseFromStatus(text)
    if (next) setPhase(next)
    const hash = submittedHash(text)
    if (hash && picked) {
      writePendingLaunch({
        hash,
        name: displayName,
        symbol: symbol.toUpperCase(),
        owner: picked.owner,
        repo: picked.name,
        githubId: detail?.id,
        startedAt: Date.now(),
      })
      persistRow({ status: 'PENDING', hash })
    }
    setLines((cur) => [...cur, { text, ok: extra.err ? false : true, ...extra }])
    setBusy(text)
  }

  async function resumeHash(hash: Hash, pending = readPendingLaunch()) {
    setStep('deploy')
    setPhase('CONFIRMING')
    setFail(null)
    setLines([
      { text: `resuming ${hash}`, ok: true },
      { text: 'waiting for Pons V2' },
    ])
    try {
      const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 180_000 })
      if (receipt.status === 'reverted') {
        const failRow = classifyLaunchFail('Pons V2 transaction reverted.')
        setPhase('FAILED')
        setFail(failRow)
        persistRow({ status: 'FAILED', hash, error: failRow.title }, pending || undefined)
        clearPendingLaunch()
        return
      }
      const extracted = tokenFromLaunchReceipt(receipt.logs)
      if (!extracted) {
        const failRow = classifyLaunchFail('Indexer has not detected the deployment yet.')
        setPhase('FAILED')
        setFail(failRow)
        persistRow({ status: 'FAILED', hash, error: failRow.title }, pending || undefined)
        return
      }
      rememberLocal({
        token: extracted.token,
        owner: pending?.owner || picked?.owner || '',
        name: pending?.repo || picked?.name || '',
        symbol: pending?.symbol || symbol,
        at: Date.now(),
        githubId: pending?.githubId || detail?.id,
        txHash: hash,
      })
      setDone({ hash, token: extracted.token })
      setPhase('SUCCESS')
      setLines((cur) => [...cur, { text: 'factory event detected', ok: true }, { text: `token address ${extracted.token}`, ok: true }, { text: '✓ LIVE', ok: true }])
      persistRow({ status: 'LIVE', hash, token: extracted.token }, pending || undefined)
      clearPendingLaunch()
    } catch (e) {
      const failRow = classifyLaunchFail((e as Error).message)
      setPhase('FAILED')
      setFail(failRow)
      persistRow({ status: 'FAILED', hash, error: failRow.title }, pending || undefined)
    }
  }

  function retrySafe(row: LaunchFail) {
    setFail(null)
    setErr(null)
    setLocked(false)
    switch (row.retry) {
      case 'repo':
        setStep('repo')
        setPhase('IDLE')
        return
      case 'token':
        setStep('token')
        setPhase('IDLE')
        return
      case 'fees':
        setStep('fees')
        setPhase('IDLE')
        return
      case 'review':
        setStep('review')
        setPhase('IDLE')
        return
      case 'resume': {
        const pending = readPendingLaunch()
        if (pending) void resumeHash(pending.hash, pending)
        else setStep('review')
        return
      }
      case 'deploy':
        setStep('deploy')
        setPhase('IDLE')
        return
      default: {
        const _e: never = row.retry
        return _e
      }
    }
  }

  async function submit() {
    if (!w.address || !w.walletClient || !picked || locked) return
    if (readPendingLaunch()) {
      const pending = readPendingLaunch()
      if (pending) void resumeHash(pending.hash, pending)
      return
    }
    setErr(null)
    setFail(null)
    setLocked(true)
    setStep('deploy')
    setPhase('PREPARING')
    setLines([])
    historyRef.current = launchId({ wallet: w.address, owner: picked.owner, repo: picked.name })
    try {
      if (!w.onRightChain) {
        pushLine('switching to Robinhood Chain 4663')
        await w.switchChain()
      }
      if (!detail) throw new Error('Repository could not be verified.')
      pushLine(`verifying repository ✓ ${detail.owner}/${detail.name}`)
      let meta = metaPin
      const pasted = manualMeta.trim()
      if (pasted.startsWith('ipfs://') || pasted.startsWith('https://')) {
        pushLine('preparing metadata ✓ complete')
      } else if (ipfs?.configured && !meta) {
        setPhase('UPLOADING')
        pushLine('uploading to ipfs')
        try {
          meta = await pinMeta()
        } catch (e) {
          if (checkLogo(logoForPons)) throw e
          pushLine((e as Error).message, { err: true })
          pushLine('using image URL')
        }
      } else {
        pushLine('preparing metadata ✓ complete')
      }
      if (meta?.cid) pushLine(`uploading to ipfs ✓ ${meta.cid}`)
      const recipient = routeFees && feeRouterLive()
        ? GITPAD_FEE_ROUTER as Address
        : w.address
      if (routeFees && feeRouterLive()) {
        const bad = validateSplits(activeSplits)
        if (bad) throw new Error(bad)
      }
      const call = await buildLaunchCall({
        name: displayName,
        symbol,
        logo: logoForPons,
        description: pairedDescription,
        website,
        twitter: X_URL,
        telegram,
        creatorTaxBps: tax,
        buybackEnabled: buyback,
        quoteIn,
        minOut,
        recipient,
      })
      trackLaunch('wallet_requested')
      const out = await sendLaunch(
        w.walletClient,
        w.address,
        call,
        (s) => {
          if (/requesting wallet signature/i.test(s)) setPhase('AWAITING_SIGNATURE')
          pushLine(s)
        },
        (hash) => {
          writePendingLaunch({
            hash,
            name: displayName,
            symbol: symbol.toUpperCase(),
            owner: picked.owner,
            repo: picked.name,
            githubId: detail.id,
            startedAt: Date.now(),
          })
          persistRow({ status: 'PENDING', hash })
          trackLaunch('transaction_submitted')
        },
      )
      pushLine(`confirmation 1/1`)
      rememberLocal({
        token: out.token,
        owner: picked.owner,
        name: picked.name,
        symbol: symbol.toUpperCase(),
        at: Date.now(),
        githubId: detail.id,
        txHash: out.hash,
        deployer: w.address,
      })
      setPhase('INDEXING')
      if (!gitpadContractsLive()) {
        pushLine('repository indexed locally — GitPadFactory not deployed')
      }
      pushLine('✓ LIVE')
      setPhase('SUCCESS')
      persistRow({ status: 'LIVE', hash: out.hash, token: out.token })
      clearPendingLaunch()
      setDone({ hash: out.hash, token: out.token })
      trackLaunch('deployment_confirmed')
    } catch (e) {
      const failRow = classifyLaunchFail((e as Error).message)
      setPhase('FAILED')
      setFail(failRow)
      persistRow({ status: 'FAILED', error: failRow.title })
      pushLine(failRow.title, { err: true, ok: false })
      setErr(failRow.message)
      trackLaunch('deployment_failed')
    } finally {
      setBusy(null)
      setLocked(false)
    }
  }

  function continueStep() {
    switch (step) {
      case 'repo':
        if (detail) {
          if (canonical && !communityAck) return
          setStep('token')
        } else continueFromDraft()
        return
      case 'token':
        if (displayName) {
          trackLaunch('token_configured')
          setStep('fees')
        }
        return
      case 'fees':
        if (!routeFees || (!splitErr && feeAck)) {
          trackLaunch('fee_configured')
          setStep('review')
        }
        return
      case 'review':
      case 'deploy':
        return
      default: {
        const _e: never = step
        return _e
      }
    }
  }

  async function writeRegistry() {
    if (!w.address || !w.walletClient || !picked || !detail || !done?.token) return
    setRegistryBusy(true)
    setErr(null)
    try {
      trackLaunch('wallet_requested')
      await linkOnchain(
        w.walletClient,
        w.address,
        done.token as Address,
        picked.owner,
        picked.name,
        metaPin?.uri || manualMeta,
        detail.id,
      )
      if (routeFees && feeRouterLive()) {
        await setFeeRoute(w.walletClient, w.address, done.token as Address, activeSplits)
      }
      setRegistryDone(true)
    } catch (e) {
      setErr(classifyLaunchFail((e as Error).message).message)
    } finally {
      setRegistryBusy(false)
    }
  }

  function dockLabel(): string {
    switch (step) {
      case 'repo': return detail ? 'Use this repository' : 'Continue'
      case 'token':
      case 'fees': return 'Continue'
      case 'review':
      case 'deploy': return launchCta().label
      default: {
        const _e: never = step
        return _e
      }
    }
  }

  function dockDisabled(): boolean {
    switch (step) {
      case 'repo': return (!parsed && !detail) || Boolean(canonical && !communityAck)
      case 'token': return !displayName
      case 'fees': return Boolean(routeFees && (splitErr || !feeAck))
      case 'review':
      case 'deploy': return launchCta().disabled
      default: {
        const _e: never = step
        return _e
      }
    }
  }

  function launchCta(): { label: string; disabled: boolean; run: () => void } {
    if (!w.address) {
      return {
        label: w.connecting ? 'Connecting…' : 'Connect Wallet',
        disabled: w.connecting,
        run: () => void w.connectMetaMask(),
      }
    }
    if (!w.onRightChain) {
      return { label: 'Switch chain', disabled: false, run: () => void w.switchChain() }
    }
    const ready = Boolean(ack && !blocked && w.walletClient && !busy && !locked && (step !== 'deploy' || phase === 'IDLE'))
    return { label: 'DEPLOY TOKEN', disabled: !ready, run: () => void submit() }
  }

  function switchMode(next: 'new' | 'existing') {
    setStudioMode(next)
    navigate(next === 'existing' ? '/launch?mode=existing' : '/launch')
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Enter' || e.metaKey || e.ctrlKey || e.altKey) return
      if (document.querySelector('.cmd')) return
      const el = e.target as HTMLElement | null
      if (!el) return
      if (el.tagName === 'TEXTAREA' || el.tagName === 'BUTTON' || el.tagName === 'A' || el.tagName === 'SUMMARY') return
      if (el.closest('form')) return
      e.preventDefault()
      continueStep()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step, detail, displayName, ack, routeFees, splitErr, feeAck, locked, done, phase])

  useEffect(() => {
    if (step !== 'review' || !status) {
      setCostNote(status ? `${status.launchFeeEth} ETH launch fee. Gas is estimated in the wallet.` : 'Launch fee unread. Gas is estimated in the wallet.')
      return
    }
    setCostNote(`${status.launchFeeEth} ETH launch fee · gas estimated at signature`)
  }, [step, status])

  const feesLine = feeSheetLine({ routeFees, splits: activeSplits })
  const launchAction = launchCta()
  const dockWait = phase === 'AWAITING_SIGNATURE'
    ? 'Approve in your wallet. GitPad is not signing this for you.'
    : phase === 'CONFIRMING' || phase === 'SUBMITTED'
      ? 'Waiting on Pons V2. No second launch will be sent.'
      : null

  return (
    <div className="studio">
      <div className="studio__top">
        <StudioChrome
          mode={studioMode}
          onMode={switchMode}
          previewOpen={showPreview}
          onPreview={() => setShowPreview((v) => !v)}
        />
        {studioMode === 'new' && (
          <>
            <StudioProgress steps={STEPS} current={step} onJump={jumpTo} />
            <StudioBrief
              owner={picked?.owner || ''}
              repo={picked?.name || ''}
              displayName={displayName}
              symbol={symbol.toUpperCase()}
              fees={feesLine}
            />
          </>
        )}
        {studioMode === 'existing' && <div ref={setExistHead} />}
      </div>
      {studioMode === 'existing' ? <ExistingStudio previewOpen={showPreview} head={existHead} /> : (
        <div className={`studio__grid${showPreview ? ' is-preview' : ''}`}>
          <section className="studio__form">
            <ErrorState error={err} />
            <ErrorState error={w.error} />

            {step === 'repo' && (
              <>
                <h1>PAIR A REPOSITORY.</h1>
                <form onSubmit={(e) => { e.preventDefault(); continueFromDraft() }}>
                  <label>
                    github.com/owner/repository
                    <input
                      className="field field--xl"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onPaste={(e) => {
                        const text = e.clipboardData.getData('text')
                        const hit = parseGithubInput(text)
                        if (hit) {
                          e.preventDefault()
                          setDraft(`github.com/${hit.owner}/${hit.name}`)
                          chooseRepo(hit.owner, hit.name)
                        }
                      }}
                      placeholder="github.com/owner/repository"
                      autoFocus
                    />
                  </label>
                  <p className={parsed ? 'ok' : 'muted'}>
                    {draft && !parsed ? 'Not a GitHub repository URL yet.' : parsed ? `Looks like ${parsed.owner}/${parsed.name}` : 'Paste a GitHub URL.'}
                  </p>
                  <button type="submit" className="btn btn--lime btn--lg">Continue</button>
                </form>

                {picked && (
                  <RepoConfirm
                    owner={picked.owner}
                    name={picked.name}
                    detail={detail}
                    hint={hint}
                    resolving={resolving}
                    failed={Boolean(err)}
                    canonical={canonical}
                    onUse={() => setStep('token')}
                    onCommunity={() => { setCommunityAck(true); setStep('token') }}
                  />
                )}

                <div className="studio__lists">
                  <div>
                    <p className="kicker">Trending repositories</p>
                    <ul className="pick">
                      {choices.map((c) => (
                        <li key={c.id}>
                          <button type="button" onClick={() => chooseRepo(c.owner, c.name, c)}>
                            <strong>{c.owner}/{c.name}</strong>
                            <span>{compact(c.stars)} stars · {c.tokenStatus === 'live' ? 'TOKENIZED' : 'AVAILABLE'}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="kicker">Recently viewed</p>
                    <ul className="pick">
                      {recent.map((r) => (
                        <li key={`${r.owner}/${r.name}`}>
                          <button type="button" onClick={() => chooseRepo(r.owner, r.name)}>
                            <strong>{r.owner}/{r.name}</strong>
                          </button>
                        </li>
                      ))}
                      {!recent.length && <li className="muted">Nothing viewed in this browser yet.</li>}
                    </ul>
                    <p className="kicker">Watchlist</p>
                    <ul className="pick">
                      {watched.map((i) => (
                        <li key={`${i.owner}/${i.name}`}>
                          <button type="button" onClick={() => i.owner && i.name && chooseRepo(i.owner, i.name)}>
                            <strong>{i.owner}/{i.name}</strong>
                          </button>
                        </li>
                      ))}
                      {!watched.length && <li className="muted">{w.address ? 'No watched repositories.' : 'Connect a wallet to load watches.'}</li>}
                    </ul>
                  </div>
                </div>
              </>
            )}

            {step === 'token' && picked && (
              <>
                <h2>Token</h2>
                <p className="mono">{picked.owner}/{picked.name}</p>
                <label>
                  Token Name
                  <input className="field" value={name} onChange={(e) => setName(stripGitlabSuffix(e.target.value))} />
                </label>
                <p className="ok">DISPLAY NAME <strong>{displayName || '— By GitLab'}</strong></p>
                <p className="muted">The “ By GitLab” suffix is locked.</p>
                <label>Ticker<input className="field" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} maxLength={11} /></label>
                <p className="mono">TICKER ${symbol || 'TICKER'} · PAIR {picked.owner}/{picked.name}</p>
                <label>Description<textarea className="field" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
                <label>Website<input className="field" value={extraSite} onChange={(e) => setExtraSite(e.target.value)} placeholder="optional" /></label>
                <p className="ok">X <a href={X_URL} target="_blank" rel="noreferrer">@LaunchGitLab</a></p>
                <label>Telegram<input className="field" value={telegram} onChange={(e) => setTelegram(e.target.value)} /></label>
                <p className="kicker">Image / metadata</p>
                {ipfs?.configured ? (
                  <ImageDrop onFile={pinImage} busy={!!uploading} current={logo} />
                ) : (
                  <p className="err">PINATA_JWT is not set. Paste an https image URL.</p>
                )}
                <label>Image URL<input className="field" value={logo} onChange={(e) => { setLogo(e.target.value); setImagePin(null); setMetaPin(null) }} /></label>
                {uploading && <p className="ok">Uploading {uploading}…</p>}
                {imagePin && <p className="mono">Image CID {imagePin.cid}</p>}
                {ipfs?.configured && (
                  <button type="button" className="btn btn--ghost" disabled={!!uploading || !displayName} onClick={() => { void pinMeta().catch(() => {}) }}>
                    Generate metadata JSON
                  </button>
                )}
                {metaPin?.cid && imagePin?.cid && <p className="ok">Metadata READY</p>}
                {metaPin && <p className="mono">Metadata CID {metaPin.cid}</p>}
                {logoErr && <p className="err">{logoErr}</p>}
                <div className="hero__cta">
                  <button type="button" className="btn btn--paper" onClick={() => setStep(prevStep(step))}>Back</button>
                  <button type="button" className="btn btn--lime" disabled={!displayName} onClick={() => { trackLaunch('token_configured'); setStep(nextStep(step)) }}>Continue</button>
                </div>
              </>
            )}

            {step === 'fees' && picked && (
              <>
                <label className="check">
                  <input type="checkbox" checked={routeFees} onChange={(e) => setRouteFees(e.target.checked)} disabled={!feeRouterLive()} />
                  Route creator tax through GitPadFeeRouter {feeRouterLive() ? '' : '(not deployed)'}
                </label>
                {routeFees && feeRouterLive() ? (
                  <StudioFees
                    rows={splits}
                    onChange={setSplits}
                    treasuryConfigured={Boolean(verifiedTreasury)}
                    treasury={verifiedTreasury}
                    gitpadTreasury={gitpadTreasury}
                    confirm={feeAck}
                    onConfirm={setFeeAck}
                  />
                ) : (
                  <p className="muted">Without the router, Pons pays creator tax to the launching wallet. No unsupported destinations are shown.</p>
                )}
                <label>
                  Creator tax (%)
                  <input
                    className="field"
                    type="number"
                    min={0}
                    max={maxTaxPct}
                    step={1}
                    value={bpsToPct(tax)}
                    onChange={(e) => setTax(clampCreatorTaxBps(pctToBps(Number(e.target.value)), maxTaxBps))}
                  />
                </label>
                <p className="muted">Max {maxTaxPct}%. Locked after launch.</p>
                <StudioAdvanced
                  open={advanced}
                  onOpen={setAdvanced}
                  metaUri={manualMeta}
                  onMetaUri={setManualMeta}
                  quoteIn={quoteIn}
                  onQuoteIn={setQuoteIn}
                  minOut={minOut}
                  onMinOut={setMinOut}
                  buyback={buyback}
                  onBuyback={setBuyback}
                  treasury={customTreasury}
                  onTreasury={setCustomTreasury}
                  gasNote={costNote}
                />
                <div className="hero__cta">
                  <button type="button" className="btn btn--paper" onClick={() => setStep(prevStep(step))}>Back</button>
                  <button
                    type="button"
                    className="btn btn--lime"
                    disabled={routeFees && (!!splitErr || !feeAck)}
                    onClick={() => { trackLaunch('fee_configured'); setStep(nextStep(step)) }}
                  >
                    Continue
                  </button>
                </div>
              </>
            )}

            {step === 'review' && picked && (
              <>
                <ReviewSheet
                  owner={picked.owner}
                  repo={picked.name}
                  githubId={detail?.id ?? null}
                  displayName={displayName}
                  symbol={symbol.toUpperCase()}
                  metadata={metaPin?.uri || (manualMeta.startsWith('ipfs://') ? manualMeta : 'none until Pinata confirms')}
                  fees={feeSheetLine({ routeFees, splits: activeSplits })}
                  creatorTax={`${bpsToPct(tax)}%`}
                  wallet={w.address ? short(w.address, 4) : 'Connect a wallet'}
                  networkCost={costNote}
                  ack={ack}
                  onAck={(v) => { setAck(v); if (v) trackLaunch('launch_reviewed') }}
                />
                {canonical && (
                  <p className="err">
                    Canonical token exists. This deploy will be a community token if you continue.
                  </p>
                )}
                {blocked && blocked !== 'Confirm the repository disclaimer before deploy.' && (
                  <p className="err">{blocked}</p>
                )}
                <div className="hero__cta">
                  <button type="button" className="btn btn--paper" onClick={() => setStep(prevStep(step))}>Back</button>
                  <button
                    type="button"
                    className="btn btn--lime btn--lg"
                    disabled={launchAction.disabled}
                    onClick={() => launchAction.run()}
                  >
                    {launchAction.label}
                  </button>
                </div>
              </>
            )}

            {step === 'deploy' && picked && (
              <>
                {done?.token ? (
                  <StudioSuccess
                    name={displayName}
                    symbol={symbol.toUpperCase()}
                    owner={picked.owner}
                    repo={picked.name}
                    token={done.token}
                    hash={done.hash}
                    stars={detail?.stars}
                    registryAvailable={gitpadContractsLive()}
                    registryBusy={registryBusy}
                    registryDone={registryDone}
                    onWriteRegistry={() => void writeRegistry()}
                  />
                ) : (
                  <>
                    <DeployTerminal lines={lines} phase={phase} live />
                    {fail && <StudioFail fail={fail} onRetry={() => retrySafe(fail)} />}
                    {blocked && !fail && phase === 'IDLE' && <p className="err">{blocked}</p>}
                    {status && <p className="mono">Fee {formatUnits(BigInt(status.launchFee), 18)} ETH · max tax {bpsToPct(status.maxCreatorTaxBps)}%</p>}
                    {phase === 'IDLE' && !fail && (
                      <div className="hero__cta">
                        <button type="button" className="btn btn--paper" onClick={() => setStep(prevStep(step))} disabled={locked}>Back</button>
                        <button
                          type="button"
                          className="btn btn--lime btn--lg"
                          disabled={launchAction.disabled}
                          onClick={() => launchAction.run()}
                        >
                          {launchAction.label}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </section>

          <StudioPreview
            name={name}
            symbol={symbol}
            image={logo}
            description={pairedDescription}
            owner={picked?.owner || ''}
            repo={picked?.name || ''}
            detail={detail}
            splits={activeSplits}
            routeFees={routeFees}
            routerLive={feeRouterLive()}
          />
        </div>
      )}
      {studioMode === 'new' && !done?.token && (
        <StudioDock
          label={dockLabel()}
          disabled={dockDisabled()}
          onContinue={() => {
            if (step === 'review' || (step === 'deploy' && phase === 'IDLE')) launchAction.run()
            else continueStep()
          }}
          onBack={step === 'repo' ? undefined : () => setStep(prevStep(step))}
          waiting={dockWait}
        />
      )}
    </div>
  )
}
