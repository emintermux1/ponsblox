import { useEffect, useMemo, useState } from 'react'
import type { Address } from 'viem'
import { RpcNotice } from '../components/RpcNotice.tsx'
import { SearchBox } from '../components/SearchBox.tsx'
import { addressUrl, gmgnUrl, ponsTokenUrl, short, tokenUrl, txUrl } from '../lib/chain.ts'
import { COPY } from '../lib/copy.ts'
import { feePctLabel, feeRouteLabel, formatEditorTime, resolveEditorFeeTo } from '../lib/editorFees.ts'
import { cleanLogoUrl } from '../lib/format.ts'
import { wikiDescription, wikiWebsite, suggestTicker, buildMetadata } from '../lib/metadata.ts'
import { rememberLaunch } from '../lib/markets.ts'
import {
  buildLaunchCall,
  checkLogo,
  readCanLaunch,
  readFactoryStatus,
  sendLaunch,
  type FactoryStatus,
} from '../lib/pons/index.ts'
import { hrefFor, navigate, onNav } from '../lib/router.ts'
import { isRpcBusyMessage, isRpcDump, sanitizeUserError } from '../lib/safeError.ts'
import { useWallet } from '../lib/wallet.tsx'
import { fetchPage, type KnowledgePage, type SearchHit } from '../lib/wiki.ts'

type Step = 'topic' | 'verify' | 'ticker' | 'name' | 'pair' | 'preview' | 'launch'

const STEPS: { id: Step; label: string }[] = [
  { id: 'topic', label: '1 Search topic' },
  { id: 'verify', label: '2 Verify entity' },
  { id: 'ticker', label: '3 Ticker' },
  { id: 'name', label: '4 Token name' },
  { id: 'pair', label: '5 Pair' },
  { id: 'preview', label: '6 Preview' },
  { id: 'launch', label: '7 Launch' },
]

function nextStep(step: Step): Step {
  switch (step) {
    case 'topic': return 'verify'
    case 'verify': return 'ticker'
    case 'ticker': return 'name'
    case 'name': return 'pair'
    case 'pair': return 'preview'
    case 'preview': return 'launch'
    case 'launch': return 'launch'
    default: {
      const _e: never = step
      return _e
    }
  }
}

function prevStep(step: Step): Step {
  switch (step) {
    case 'topic': return 'topic'
    case 'verify': return 'topic'
    case 'ticker': return 'verify'
    case 'name': return 'ticker'
    case 'pair': return 'name'
    case 'preview': return 'pair'
    case 'launch': return 'preview'
    default: {
      const _e: never = step
      return _e
    }
  }
}

export function Launch({ title }: { title: string | null }) {
  const w = useWallet()
  const [step, setStep] = useState<Step>(title ? 'verify' : 'topic')
  const [page, setPage] = useState<KnowledgePage | null>(null)
  const [loading, setLoading] = useState(Boolean(title))
  const [err, setErr] = useState<string | null>(null)
  const [symbol, setSymbol] = useState('')
  const [name, setName] = useState('')
  const [quoteIn, setQuoteIn] = useState('')
  const [tax, setTax] = useState(100)
  const [ack, setAck] = useState(false)
  const [status, setStatus] = useState<FactoryStatus | null>(null)
  const [can, setCan] = useState<boolean | null>(null)
  const [lines, setLines] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<{ hash: string; token: string } | null>(null)
  const [rpcBusy, setRpcBusy] = useState(false)

  function loadFactory() {
    setRpcBusy(false)
    void readFactoryStatus()
      .then((s) => { setStatus(s); setRpcBusy(false) })
      .catch(() => { setStatus(null); setRpcBusy(true) })
  }

  useEffect(() => {
    loadFactory()
  }, [])

  useEffect(() => {
    if (!w.address) { setCan(null); return }
    void readCanLaunch(w.address).then(setCan).catch(() => setCan(null))
  }, [w.address])

  useEffect(() => {
    if (!title) return
    let live = true
    setLoading(true)
    setErr(null)
    void fetchPage(title)
      .then((p) => {
        if (!live) return
        setPage(p)
        setName(p.displayTitle)
        setSymbol(suggestTicker(p.displayTitle))
        setStep('verify')
      })
      .catch(() => { if (live) setErr('That Wikipedia page could not be opened.') })
      .finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [title])

  function pickHit(hit: SearchHit) {
    navigate(hrefFor({ name: 'launch', title: hit.title }))
  }

  const feeRoute = resolveEditorFeeTo(page?.editor?.wallet)
  const editorFeeTo = (page?.editor?.feeTo || feeRoute.feeTo) as Address
  const editorHeld = page?.editor?.held ?? feeRoute.kind === 'held'
  const editorName = page?.editor?.name || ''
  const website = page ? wikiWebsite(page.title) : ''
  const description = page
    ? wikiDescription({
      title: page.title,
      pageid: page.pageid,
      qid: page.qid,
      extract: page.extract,
      editorName,
      editorFeeTo,
      held: editorHeld,
    })
    : ''
  const logo = cleanLogoUrl(page?.thumbnail)
  const logoErr = checkLogo(logo)
  const meta = page
    ? buildMetadata({
      name: name.trim(),
      symbol: symbol.trim().toUpperCase(),
      description,
      image: logo,
      title: page.title,
      pageid: page.pageid,
      qid: page.qid || '',
      thumbnail: logo,
      editorName,
      editorFeeTo,
    })
    : null

  const blocked = useMemo(() => {
    if (!page) return 'Select a Wikipedia article.'
    if (!page.launchable) return page.launchBlock || 'This page cannot be paired.'
    if (logoErr) return logoErr
    if (!/^[A-Za-z0-9]{2,11}$/.test(symbol.trim())) return 'Ticker must be 2–11 letters or digits.'
    if (!name.trim()) return 'Token name is required.'
    if (!ack) return 'Confirm the pairing disclaimer.'
    if (!w.address) return 'Connect a wallet to launch.'
    if (!w.onRightChain) return 'Switch to Robinhood Chain (4663).'
    if (status && !status.launchEnabled) return 'Pons launches are disabled right now.'
    if (status && !status.approved) return 'Pons is not accepting this quote pair right now.'
    if (can === false) return 'This wallet is not allowed to launch on Pons right now.'
    return null
  }, [page, logoErr, symbol, name, ack, w.address, w.onRightChain, status, can])

  const formReady = Boolean(page?.launchable && /^[A-Za-z0-9]{2,11}$/.test(symbol.trim()) && name.trim())

  function continueStep() {
    if (step === 'topic' && !page) return
    if (step === 'verify' && !page?.launchable) return
    if (step === 'ticker' && !/^[A-Za-z0-9]{2,11}$/.test(symbol.trim())) return
    if (step === 'name' && !name.trim()) return
    setStep(nextStep(step))
  }

  async function submit() {
    if (!w.address || !w.walletClient || !page || busy) return
    setBusy(true)
    setErr(null)
    setDone(null)
    setLines([])
    setStep('launch')
    try {
      if (!w.onRightChain) {
        setLines((c) => [...c, 'Switching to Robinhood Chain 4663'])
        await w.switchChain()
      }
      if (!page.launchable) throw new Error(page.launchBlock || 'Page is not verified.')
      setLines((c) => [...c, `Verified ${page.title} · ${page.qid || 'no QID'} · pageid:${page.pageid}`])
      const call = await buildLaunchCall({
        name: name.trim(),
        symbol: symbol.trim().toUpperCase(),
        logo,
        description,
        website,
        telegram: '',
        creatorTaxBps: Math.min(tax, status?.maxCreatorTaxBps ?? 1000),
        buybackEnabled: false,
        quoteIn,
        recipient: editorFeeTo,
        buyRecipient: w.address,
      })
      setLines((c) => [...c, `Launch fee ${status?.launchFeeEth || '?'} ETH · pairing ETH`])
      const out = await sendLaunch(
        w.walletClient,
        w.address,
        call,
        (s) => setLines((c) => [...c, isRpcDump(s) ? sanitizeUserError(s) : s]),
      )
      rememberLaunch({
        token: out.token,
        title: page.title,
        pageid: page.pageid,
        qid: page.qid,
        symbol: symbol.trim().toUpperCase(),
        hash: out.hash,
        at: Date.now(),
      })
      setLines((c) => [...c, 'Live on Pons V2'])
      setDone({ hash: out.hash, token: out.token })
    } catch (e) {
      const quiet = sanitizeUserError(e)
      setErr(quiet)
      setLines((c) => [...c, quiet])
    } finally {
      setBusy(false)
    }
  }

  const topicHref = page ? hrefFor({ name: 'topic', title: page.title }) : null

  return (
    <main className="article">
      <h1 className="firstHeading">Launch a Page</h1>
      <p className="subtitle">Search anything humanity knows. Pair it. Launch it. {COPY.editorFees}</p>
      {rpcBusy && <RpcNotice onRetry={loadFactory} />}
      <ol className="toc">
        {STEPS.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              className={s.id === step ? 'is-on' : undefined}
              disabled={STEPS.findIndex((x) => x.id === s.id) > STEPS.findIndex((x) => x.id === step) && !(s.id === 'verify' && page)}
              onClick={() => setStep(s.id)}
            >
              {s.label}
            </button>
          </li>
        ))}
      </ol>

      {step === 'topic' && (
        <section>
          <h2>Search topic</h2>
          <p>Find a real Wikipedia article. Disambiguation pages cannot be paired.</p>
          <SearchBox onPick={pickHit} />
        </section>
      )}

      {step === 'verify' && (
        <section>
          <h2>Verify Wikipedia / Wikidata</h2>
          {loading && <p className="muted">Resolving the article and Wikidata entity…</p>}
          {page && (
            <div className="verify">
              {page.thumbnail && <img src={page.thumbnail} alt="" width={96} />}
              <div>
                <p>
                  <strong>{page.displayTitle}</strong>
                  {topicHref && <> · <a href={topicHref} onClick={(e) => onNav(e, topicHref)}>Open topic</a></>}
                </p>
                <p>{page.extract || page.description}</p>
                <ul className="plain">
                  <li>Page id: {page.pageid}</li>
                  <li>Wikidata: {page.qid || 'missing'}</li>
                  <li>Type: {page.type}</li>
                  <li>Article: <a href={page.wikipediaUrl} target="_blank" rel="noreferrer">{page.wikipediaUrl}</a></li>
                  <li>
                    Page writer:{' '}
                    {page.editor
                      ? <a href={page.editor.userUrl} target="_blank" rel="noreferrer">{page.editor.name}</a>
                      : 'unresolved'}
                    {page.editor && <> · last edit {formatEditorTime(page.editor.timestamp)}</>}
                    {page.editor?.held && <> · {COPY.reservedFees}</>}
                  </li>
                </ul>
                {page.launchBlock && <p className="err">{page.launchBlock}</p>}
                {page.launchable && <p className="ok">Verified article. This page can be paired.</p>}
              </div>
            </div>
          )}
        </section>
      )}

      {step === 'ticker' && (
        <section>
          <h2>Choose a ticker</h2>
          <label>
            Ticker
            <input
              value={symbol}
              maxLength={11}
              onChange={(e) => setSymbol(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            />
          </label>
          <p className="muted">2–11 letters or digits. Suggested from the article title.</p>
        </section>
      )}

      {step === 'name' && (
        <section>
          <h2>Token name</h2>
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
        </section>
      )}

      {step === 'pair' && (
        <section>
          <h2>Pair</h2>
          <p>WikiPad launches against ETH on Pons V2, the same quote GitPad uses.</p>
          <p><strong>Pair token:</strong> ETH (native)</p>
          <label>
            Optional first buy (ETH)
            <input
              value={quoteIn}
              placeholder="leave empty to launch only"
              onChange={(e) => setQuoteIn(e.target.value)}
            />
          </label>
          <label>
            Editor fee (bps)
            <input
              type="number"
              min={0}
              max={status?.maxCreatorTaxBps ?? 1000}
              value={tax}
              onChange={(e) => setTax(Number(e.target.value) || 0)}
            />
          </label>
          <p className="muted">{COPY.editorFees} {feePctLabel(tax)} of each trade.</p>
          <p className="muted">Launch fee: {status ? `${status.launchFeeEth} ETH` : rpcBusy ? 'factory unread' : 'reading factory…'}</p>
        </section>
      )}

      {(step === 'preview' || step === 'launch') && (
        <section>
          <h2>Preview</h2>
          {page && meta && (
            <table className="wikitable">
              <tbody>
                <tr><th>Page</th><td>{page.displayTitle}</td></tr>
                <tr><th>Wikidata</th><td>{page.qid || '—'}</td></tr>
                <tr><th>Page id</th><td>{page.pageid}</td></tr>
                <tr><th>Ticker</th><td>{symbol.toUpperCase()}</td></tr>
                <tr><th>Name</th><td>{name}</td></tr>
                <tr><th>Pair</th><td>ETH</td></tr>
                <tr><th>First buy</th><td>{quoteIn || 'none'}</td></tr>
                <tr><th>Page writer</th><td>{
                  page.editor
                    ? <a href={page.editor.userUrl} target="_blank" rel="noreferrer">{editorName}</a>
                    : (editorName || '—')
                }</td></tr>
                <tr>
                  <th>Writer wallet</th>
                  <td>{editorHeld || !page.editor?.wallet ? COPY.reservedFees : page.editor.wallet}</td>
                </tr>
                <tr>
                  <th>Fee destination</th>
                  <td>
                    {feeRouteLabel(editorHeld ? 'held' : 'wallet', editorName)}
                    {' · '}
                    <a className="mono" href={addressUrl(editorFeeTo)} target="_blank" rel="noreferrer">{short(editorFeeTo)}</a>
                  </td>
                </tr>
                <tr><th>Editor fee</th><td>{feePctLabel(tax)} ({tax} bps)</td></tr>
                <tr><th>Website</th><td><a href={website} target="_blank" rel="noreferrer">{website}</a></td></tr>
                <tr><th>Metadata</th><td className="mono">{JSON.stringify({
                  wikipediaTitle: meta.wikipediaTitle,
                  wikidataId: meta.wikidataId,
                  editorName: meta.editorName,
                  editorFeeTo: meta.editorFeeTo,
                })}</td></tr>
              </tbody>
            </table>
          )}
          <label className="ack">
            <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
            I understand this pairs a memecoin to a public Wikipedia article. Nothing is invented: the token exists only after Pons V2 emits TokenLaunched.
          </label>
        </section>
      )}

      {step === 'launch' && (
        <section>
          <h2>Launch</h2>
          {lines.length > 0 && (
            <pre className="log">{lines.join('\n')}</pre>
          )}
          {done && (
            <div className="ok-box">
              <p><strong>Live.</strong> Token {short(done.token)}</p>
              <p>
                <a href={ponsTokenUrl(done.token)} target="_blank" rel="noreferrer">Open on Pons</a>
                {' · '}
                <a href={tokenUrl(done.token)} target="_blank" rel="noreferrer">Explorer</a>
                {' · '}
                <a href={gmgnUrl(done.token)} target="_blank" rel="noreferrer">GMGN</a>
                {' · '}
                <a href={txUrl(done.hash)} target="_blank" rel="noreferrer">Transaction</a>
              </p>
            </div>
          )}
        </section>
      )}

      {err && (isRpcBusyMessage(err)
        ? <RpcNotice onRetry={() => { setErr(null); if (formReady) void submit() }} />
        : <p className="err">{err}</p>)}

      <p className="toolbar">
        {step !== 'topic' && (
          <button type="button" className="btn btn--ghost" onClick={() => setStep(prevStep(step))} disabled={busy}>
            Back
          </button>
        )}
        {step !== 'preview' && step !== 'launch' && (
          <button type="button" className="btn" onClick={continueStep} disabled={step === 'verify' && !page?.launchable}>
            Continue
          </button>
        )}
        {(step === 'preview' || step === 'launch') && !done && (
          <button
            type="button"
            className="btn"
            disabled={busy || !formReady}
            onClick={() => {
              if (!w.address) { void w.connectMetaMask(); return }
              if (!w.onRightChain) { void w.switchChain(); return }
              void submit()
            }}
          >
            {busy ? 'Launching…' : !w.address ? 'Connect wallet to launch' : !w.onRightChain ? 'Switch chain' : 'Launch on Pons V2'}
          </button>
        )}
      </p>
      {blocked && step === 'preview' && <p className="muted">{blocked}</p>}
    </main>
  )
}
