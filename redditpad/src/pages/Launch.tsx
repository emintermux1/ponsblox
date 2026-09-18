import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChainAlert } from '../components/ChainAlert.tsx'
import { Connect } from '../components/Connect.tsx'
import { OfficialCa } from '../components/OfficialCa.tsx'
import { PairBadge } from '../components/PairBadge.tsx'
import { Rail } from '../components/Rail.tsx'
import { ShareX } from '../components/ShareX.tsx'
import { XLink } from '../components/XLink.tsx'
import { txUrl, WRONG_CHAIN_MSG } from '../lib/chain.ts'
import { tickerClean } from '../lib/format.ts'
import { validateImageFile } from '../lib/imageFile.ts'
import { saveLocalLaunch } from '../lib/localLaunches.ts'
import {
  buildLaunchCall,
  checkLogo,
  readCanLaunch,
  readFactoryStatus,
  sendLaunch,
  type FactoryStatus,
} from '../lib/pons/index.ts'
import { kindLabel, parseRedditSource, type RedditSource } from '../lib/reddit.ts'
import { X_AT } from '../lib/social.ts'
import { usePageTitle } from '../lib/title.ts'
import { useWallet } from '../lib/wallet.tsx'

type Step = 'source' | 'details' | 'pair' | 'preview'

const STEPS: Step[] = ['source', 'details', 'pair', 'preview']

function nextStep(step: Step): Step {
  switch (step) {
    case 'source': return 'details'
    case 'details': return 'pair'
    case 'pair': return 'preview'
    case 'preview': return 'preview'
    default: {
      const _e: never = step
      return _e
    }
  }
}

function prevStep(step: Step): Step {
  switch (step) {
    case 'source': return 'source'
    case 'details': return 'source'
    case 'pair': return 'details'
    case 'preview': return 'pair'
    default: {
      const _e: never = step
      return _e
    }
  }
}

function stepIndex(step: Step): number {
  switch (step) {
    case 'source': return 1
    case 'details': return 2
    case 'pair': return 3
    case 'preview': return 4
    default: {
      const _e: never = step
      return _e
    }
  }
}

function stepLabel(step: Step): string {
  switch (step) {
    case 'source': return 'Source'
    case 'details': return 'Details'
    case 'pair': return 'Pair'
    case 'preview': return 'Preview'
    default: {
      const _e: never = step
      return _e
    }
  }
}

export function Launch() {
  usePageTitle('Launch a Pair — RedditPad')
  const w = useWallet()
  const [step, setStep] = useState<Step>('source')
  const [raw, setRaw] = useState('')
  const [source, setSource] = useState<RedditSource | null>(null)
  const [name, setName] = useState('')
  const [ticker, setTicker] = useState('')
  const [blurb, setBlurb] = useState('')
  const [preview, setPreview] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [factory, setFactory] = useState<FactoryStatus | null>(null)
  const [can, setCan] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [lines, setLines] = useState<string[]>([])
  const [live, setLive] = useState<{ token: string; hash: string; ticker: string; name: string } | null>(null)

  useEffect(() => {
    void readFactoryStatus().then(setFactory).catch((e: Error) => setErr(e.message))
  }, [])

  useEffect(() => {
    if (!w.address) { setCan(null); return }
    void readCanLaunch(w.address).then(setCan).catch(() => setCan(null))
  }, [w.address])

  const hostedLogo = useMemo(() => {
    if (typeof window === 'undefined') return '/brand/redditpad-mark.jpg'
    return `${window.location.origin}/brand/redditpad-mark.jpg`
  }, [])

  const onchainLogo = logoUrl.trim() || hostedLogo
  const logoErr = checkLogo(onchainLogo)
  const cleanTicker = tickerClean(ticker)
  const art = preview || '/brand/redditpad-mark.jpg'

  function resolveSource() {
    setErr(null)
    const parsed = parseRedditSource(raw)
    if (!parsed) {
      setErr('Paste a subreddit URL, a Reddit post URL, or a community name.')
      return
    }
    setSource(parsed)
    if (!name) setName(parsed.subreddit.replace(/^r\//, ''))
    if (!ticker) setTicker(tickerClean(parsed.subreddit.replace(/^r\//, '')).slice(0, 8))
    setStep('details')
  }

  async function onFile(file: File | null) {
    if (!file) return
    const check = await validateImageFile(file)
    if (!check.ok) { setErr(check.error); return }
    setErr(null)
    setPreview(URL.createObjectURL(file))
  }

  async function deploy() {
    if (!source || !w.walletClient || !w.address) {
      setErr('Connect a wallet on Robinhood Chain first.')
      return
    }
    if (!w.onRightChain) {
      setErr(WRONG_CHAIN_MSG)
      return
    }
    setBusy(true)
    setErr(null)
    setLines([])
    try {
      const draft = {
        name: name.trim(),
        symbol: tickerClean(ticker),
        logo: onchainLogo,
        description: `${blurb.trim()} · RedditPad pair lock $RDDT · source ${source.url}`.slice(0, 240),
        website: source.url,
        twitter: X_AT,
        telegram: '',
        creatorTaxBps: 0,
        buybackEnabled: false,
        quoteIn: '',
        recipient: w.address,
      }
      const call = await buildLaunchCall(draft)
      const receipt = await sendLaunch(w.walletClient, w.address, call, (s) => {
        setLines((cur) => [...cur, s])
      })
      saveLocalLaunch({
        id: tickerClean(ticker).toLowerCase(),
        name: name.trim(),
        ticker: tickerClean(ticker),
        subreddit: source.subreddit,
        sourceUrl: source.url,
        kind: source.kind === 'post' ? 'post' : 'subreddit',
        image: preview || onchainLogo,
        blurb: blurb.trim() || source.hint,
        mcap: 0,
        volume: 0,
        holders: 1,
        createdAt: Date.now(),
        bonding: 1,
        status: 'bonding',
        price: 0,
        change24h: 0,
        onchain: { token: receipt.token, curve: receipt.curve, hash: receipt.hash },
      })
      setLive({ token: receipt.token, hash: receipt.hash, ticker: tickerClean(ticker), name: name.trim() })
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="shell launch">
      <div className="shell__main">
      <header className="comm comm--plain">
        <div>
          <h1>Submit a pair</h1>
          <p>Like submitting a Reddit post — source, title, then the $RDDT lock.</p>
        </div>
      </header>
      <ol className="steps">
        {STEPS.map((s) => {
          const done = stepIndex(step) > stepIndex(s)
          const current = step === s
          const locked = stepIndex(s) > stepIndex(step)
          return (
            <li key={s} className={current ? 'on' : done ? 'done' : ''}>
              <button
                type="button"
                disabled={locked}
                onClick={() => setStep(s)}
              >
                <span className="steps__n">{stepIndex(s)}</span>
                {stepLabel(s)}
              </button>
            </li>
          )
        })}
      </ol>

      {step === 'source' && (
        <section className="panel">
          <h2>url</h2>
          <p className="muted">Subreddit URL, Reddit post URL, or a community name.</p>
          <input
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="https://www.reddit.com/r/wallstreetbets or reddit.com/comments/…"
          />
          {source && (
            <p className="note">{kindLabel(source.kind)} · {source.subreddit} · {source.hint}</p>
          )}
          <div className="row">
            <button type="button" className="btn btn--accent" onClick={resolveSource}>Continue</button>
          </div>
        </section>
      )}

      {step === 'details' && (
        <section className="panel">
          <h2>title and text</h2>
          <div className="launch__live">
            <span className="muted">Live pair from step 1</span>
            <PairBadge ticker={cleanTicker || 'TICKER'} />
          </div>
          <label>
            Image
            <input type="file" accept="image/*" onChange={(e) => void onFile(e.target.files?.[0] ?? null)} />
          </label>
          <img className="launch__img" src={art} alt="" />
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={32} />
          </label>
          <label>
            Ticker
            <input value={ticker} onChange={(e) => setTicker(tickerClean(e.target.value))} maxLength={11} />
          </label>
          <label>
            Description
            <textarea value={blurb} onChange={(e) => setBlurb(e.target.value)} rows={3} maxLength={180} />
          </label>
          <label>
            Hosted logo URL for Pons <span className="muted">(optional — https:// or ipfs://, under 512 bytes)</span>
            <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder={hostedLogo} />
          </label>
          {logoErr && <p className="note">{logoErr} Local preview still works. The factory only accepts a short hosted link.</p>}
          <div className="row">
            <button type="button" className="btn btn--ghost" onClick={() => setStep(prevStep(step))}>Back</button>
            <button
              type="button"
              className="btn btn--accent"
              onClick={() => {
                if (!name.trim() || !tickerClean(ticker)) {
                  setErr('Name and ticker are required.')
                  return
                }
                setErr(null)
                setStep(nextStep(step))
              }}
            >
              Continue
            </button>
          </div>
        </section>
      )}

      {step === 'pair' && (
        <section className="panel">
          <h2>3. Pair</h2>
          <div className="lockup">
            <div>
              <span className="muted">Your token</span>
              <strong>${cleanTicker || 'TICKER'}</strong>
            </div>
            <b>×</b>
            <div>
              <span className="muted">Permanent pair</span>
              <strong>$RDDT</strong>
              <input type="checkbox" checked readOnly aria-label="$RDDT permanently locked" />
            </div>
          </div>
          <p className="lede">Every RedditPad launch is paired with $RDDT.</p>
          <p className="note">
            Product lock: {cleanTicker || 'TOKEN'} / $RDDT. Onchain quote on Pons V2 is ETH
            (pairToken 0x0) on Robinhood Chain 4663. The RedditPad token CA below is the pad token,
            not Reddit Inc equity and not an official Reddit stock token.
          </p>
          <OfficialCa variant="about" />
          <div className="row">
            <button type="button" className="btn btn--ghost" onClick={() => setStep(prevStep(step))}>Back</button>
            <button type="button" className="btn btn--accent" onClick={() => setStep(nextStep(step))}>Continue</button>
          </div>
        </section>
      )}

      {step === 'preview' && source && (
        <section className="panel">
          <h2>4. Preview</h2>
          <article className="pcard pcard--feed preview-card">
            <div className="pcard__media">
              <img src={art} alt="" />
            </div>
            <div className="pcard__body">
              <div className="pcard__top">
                <div className="pcard__name">
                  <strong>{name || 'Your token'}</strong>
                  <PairBadge ticker={cleanTicker || 'TICKER'} />
                </div>
              </div>
              <p className="pcard__sub">
                <span>{source.subreddit}</span>
                <span>{blurb || source.hint}</span>
              </p>
            </div>
          </article>
          <div className="lockup">
            <div>
              <span className="muted">Your token</span>
              <strong>${cleanTicker || 'TICKER'}</strong>
            </div>
            <b>×</b>
            <div>
              <span className="muted">Permanent pair</span>
              <strong>$RDDT</strong>
            </div>
          </div>
          <Connect />
          {factory ? (
            <p className="note">
              Pons factory {factory.launchEnabled ? 'is accepting launches' : 'is not accepting launches'}.
              Launch fee {factory.launchFeeEth} ETH. {can === false ? 'This wallet cannot launch right now.' : ''}
            </p>
          ) : (
            <p className="skel" aria-hidden>Reading factory…</p>
          )}
          {live ? (
            <div className="ok">
              <p>Live on Pons. Token {live.token}</p>
              <p><a href={txUrl(live.hash)} target="_blank" rel="noreferrer">View transaction</a></p>
              <div className="row">
                <Link className="btn btn--accent" to={`/p/${live.ticker.toLowerCase()}`}>Open pair</Link>
                <ShareX name={live.name} ticker={live.ticker} />
                <XLink />
              </div>
            </div>
          ) : (
            <div className="row">
              <button type="button" className="btn btn--ghost" onClick={() => setStep(prevStep(step))}>Back</button>
              <button
                type="button"
                className="btn btn--accent"
                disabled={busy || !w.address}
                onClick={() => void deploy()}
              >
                {busy ? 'Launching…' : w.address ? 'Launch token' : 'Connect to launch'}
              </button>
            </div>
          )}
          {lines.length > 0 && (
            <ol className="term">
              {lines.map((l) => <li key={l}>{l}</li>)}
            </ol>
          )}
        </section>
      )}

      {err && (err === WRONG_CHAIN_MSG || err.includes('Robinhood Chain')
        ? <ChainAlert message={err} />
        : <p className="err" role="alert">{err}</p>)}
      </div>
      <Rail />
    </main>
  )
}
