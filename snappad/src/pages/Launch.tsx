import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { ChainAlert } from '../components/ChainAlert.tsx'
import { Connect } from '../components/Connect.tsx'
import { Countdown } from '../components/Countdown.tsx'
import { SourceCard } from '../components/SourceCard.tsx'
import { txUrl, WRONG_CHAIN_MSG } from '../lib/chain.ts'
import { bySnapPadName, onchainLogoUrl } from '../lib/brand.ts'
import { tickerClean } from '../lib/format.ts'
import { pairById } from '../lib/markets.ts'
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
import { snapchatWebsite, X_AT } from '../lib/social.ts'
import { fetchPublicSnap } from '../lib/resolve.ts'
import { parseSnapSource, sourceFromFile, type SnapSource } from '../lib/snap.ts'
import { usePageTitle } from '../lib/title.ts'
import { useWallet } from '../lib/wallet.tsx'

export function Launch() {
  usePageTitle('Snap it. Coin it. — SnapPad')
  const w = useWallet()
  const [params] = useSearchParams()
  const location = useLocation()
  const seeded = useRef(false)
  const [raw, setRaw] = useState('')
  const [source, setSource] = useState<SnapSource | null>(null)
  const [name, setName] = useState('')
  const [ticker, setTicker] = useState('')
  const [caption, setCaption] = useState('')
  const [preview, setPreview] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [factory, setFactory] = useState<FactoryStatus | null>(null)
  const [can, setCan] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [reading, setReading] = useState(false)
  const [lines, setLines] = useState<string[]>([])
  const [live, setLive] = useState<{ token: string; hash: string; ticker: string; name: string } | null>(null)
  const [startedAt] = useState(() => Date.now())

  useEffect(() => {
    void readFactoryStatus().then(setFactory).catch((e: Error) => setErr(e.message))
  }, [])

  useEffect(() => {
    if (!w.address) { setCan(null); return }
    void readCanLaunch(w.address).then(setCan).catch(() => setCan(null))
  }, [w.address])

  const hostedLogo = onchainLogoUrl(source?.image)
  const onchainLogo = onchainLogoUrl(logoUrl.trim() || hostedLogo)
  const logoErr = checkLogo(onchainLogo)
  const cleanTicker = tickerClean(ticker)
  const coinName = bySnapPadName(name || source?.name || '')
  const snapSite = snapchatWebsite(source?.snapUrl || source?.url, source?.account)
  const art = preview || source?.image || '/brand/mark.jpg'
  const launchReady = Boolean(
    source && name.trim() && cleanTicker && !logoErr && factory?.launchEnabled && can !== false,
  )

  function applySource(next: SnapSource) {
    setSource(next)
    setName(next.name)
    setTicker(next.ticker)
    setCaption(next.caption)
    setErr(null)
  }

  useEffect(() => {
    if (seeded.current) return
    const fromQuery = params.get('from') || params.get('snap')
    const fromState = (location.state as { from?: string } | null)?.from
    const from = fromQuery || fromState
    if (!from) return
    const pair = pairById(from)
    if (!pair) return
    seeded.current = true
    setRaw(pair.snapUrl || pair.sourceUrl)
    applySource({
      kind: pair.kind,
      url: pair.snapUrl || pair.sourceUrl,
      account: pair.account,
      caption: pair.caption,
      hint: `${pair.kind} · ${pair.account}`,
      name: pair.name,
      ticker: pair.ticker,
      image: pair.image,
      videoUrl: pair.videoUrl,
      snapUrl: pair.snapUrl,
    })
    if (pair.image) setPreview(pair.image)
    setLogoUrl(onchainLogoUrl(pair.image))
  }, [location.state, params])

  async function resolveLink() {
    setErr(null)
    setReading(true)
    try {
      const live = await fetchPublicSnap(raw)
      if (live) {
        applySource(live)
        if (live.image) setPreview(live.image)
        if (live.image) setLogoUrl(onchainLogoUrl(live.image.startsWith('http') ? undefined : live.image))
        return
      }
      const parsed = parseSnapSource(raw)
      if (!parsed) {
        setErr('Paste a public Snapchat profile or Spotlight link — @nba, snapchat.com/@espn-snap — or drop a real screenshot.')
        return
      }
      applySource(parsed)
    } finally {
      setReading(false)
    }
  }

  async function onFile(file: File | null) {
    if (!file) return
    const check = await validateImageFile(file)
    if (!check.ok) { setErr(check.error); return }
    setPreview(URL.createObjectURL(file))
    applySource(sourceFromFile(file))
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
    if (!name.trim() || !cleanTicker) {
      setErr('Name and ticker are required.')
      return
    }
    setBusy(true)
    setErr(null)
    setLines([])
    try {
      const website = snapSite
      const draft = {
        name: coinName,
        symbol: cleanTicker,
        logo: onchainLogo,
        description: `${caption.trim() || source.hint} · SnapPad · ${source.account}`.slice(0, 240),
        website,
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
        id: cleanTicker.toLowerCase(),
        name: coinName,
        ticker: cleanTicker,
        account: source.account,
        caption: caption.trim(),
        sourceUrl: website,
        kind: source.kind,
        image: preview || source.image || onchainLogo,
        avatar: source.image || preview || onchainLogo,
        tone: '#111',
        createdAt: Date.now(),
        mcap: 0,
        volume: 0,
        holders: 1,
        price: 0,
        change24h: 0,
        streak: source.kind === 'streak' ? 1 : 0,
        videoUrl: source.videoUrl,
        snapUrl: source.snapUrl || source.url,
        onchain: { token: receipt.token, curve: receipt.curve, hash: receipt.hash },
      })
      setLive({ token: receipt.token, hash: receipt.hash, ticker: cleanTicker, name: coinName })
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="launch">
      <div className="launch__cam">
        <p className="camera__kicker">Camera</p>
        <h1>Snap it. Coin it.</h1>
        <p>Not a lens. Any Snap — screenshot, selfie, streak, story, viral still.</p>
        <label
          className="drop"
          aria-label="Drop a screenshot or tap to upload"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            void onFile(e.dataTransfer.files[0] ?? null)
          }}
        >
          <input type="file" accept="image/*" onChange={(e) => void onFile(e.target.files?.[0] ?? null)} />
          {preview ? <img src={preview} alt="" /> : <span>Drop a screenshot or tap to upload</span>}
        </label>
        <div className="launch__or">or paste a public Snap link</div>
        <div className="launch__row">
          <input
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="https://www.snapchat.com/add/milo"
          />
          <button type="button" className="btn btn--yellow" disabled={reading} onClick={() => void resolveLink()}>
            {reading ? 'Reading…' : 'Read Snap'}
          </button>
        </div>
      </div>

      {source && (
        <section className="launch__sheet">
          <Countdown createdAt={startedAt} />
          <p className="lede">24h countdown starts at launch. The Snap disappears. The coin doesn’t.</p>
          <SourceCard
            image={art}
            account={source.account}
            ticker={cleanTicker || 'SNAP'}
            name={coinName}
            caption={caption}
            timestamp="just now"
            kind={source.kind}
            sourceUrl={snapSite}
          />
          <p className="note">Website {snapSite} · X {X_AT}</p>
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={32} />
          </label>
          <p className="note">Onchain name: {coinName}</p>
          <label>
            Ticker
            <input value={ticker} onChange={(e) => setTicker(tickerClean(e.target.value))} maxLength={11} />
          </label>
          <label>
            Caption
            <input value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={80} />
          </label>
          <label>
            Hosted cover URL
            <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder={hostedLogo} />
          </label>
          {logoErr && <p className="note">{logoErr} Local preview still works. Pons needs a short https link.</p>}
          <div className="pairlock">
            <span>${cleanTicker || 'TICKER'}</span>
            <b>×</b>
            <span>$SNAP</span>
          </div>
          <Connect />
          {factory ? (
            <p className="note">
              Pons {factory.launchEnabled ? 'is accepting launches' : 'is closed'}.
              Fee {factory.launchFeeEth} ETH.
              {can === false ? ' This wallet cannot launch right now.' : ''}
            </p>
          ) : (
            <p className="note">Reading factory…</p>
          )}
          {live ? (
            <div className="ok">
              <p>Live. Token {live.token}</p>
              <p><a href={txUrl(live.hash)} target="_blank" rel="noreferrer">View transaction</a></p>
              <Link className="btn btn--yellow" to={`/s/${live.ticker.toLowerCase()}`}>Open Snap</Link>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn--yellow btn--wide btn--press"
              disabled={busy || !w.address || !launchReady}
              onClick={() => void deploy()}
            >
              {busy ? 'Launching…' : !w.address ? 'Log in to launch' : launchReady ? 'Launch coin' : 'Fix details to launch'}
            </button>
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
    </main>
  )
}
