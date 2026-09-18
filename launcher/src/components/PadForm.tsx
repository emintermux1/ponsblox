import { useState, type ReactNode } from 'react'
import { chainLabel, quoteAsset, type SupportedChain } from '../lib/chain.ts'
import type { KitId } from '../lib/kits.ts'
import { buyLabel, launchBlocked, padLabels, pinNote } from '../lib/labels.ts'
import { ImageDrop } from './ImageDrop.tsx'

function PadField(props: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  readOnly?: boolean
}) {
  return (
    <label>
      {props.label}
      <input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        readOnly={props.readOnly}
      />
    </label>
  )
}

export function PadForm(props: {
  kit: KitId
  name: string
  ticker: string
  desc: string
  logo: string
  buyAmt: string
  onName: (v: string) => void
  onTicker: (v: string) => void
  onDesc: (v: string) => void
  onLogo: (v: string) => void
  onBuyAmt: (v: string) => void
  onError: (msg: string) => void
  chain: SupportedChain
  busy: boolean
  onLaunch: () => void
  live: ReactNode
}) {
  const labels = padLabels(props.kit)
  const blocked = launchBlocked(props.name, props.ticker)
  const [urlOpen, setUrlOpen] = useState(false)
  const chainName = chainLabel(props.chain)
  const quote = quoteAsset(props.chain)

  const go = (
    <div className="pf-actions">
      {props.kit === 'bags' && (
        <button type="button" className="pad-btn bags-back" disabled>
          Back
        </button>
      )}
      <button
        type="button"
        className="pad-btn solid"
        disabled={props.busy || Boolean(blocked)}
        onClick={props.onLaunch}
      >
        {props.busy ? 'Sending…' : labels.submit}
      </button>
      {blocked && <p className="pad-hint">{blocked}</p>}
    </div>
  )
  const name = (
    <PadField label={labels.name} value={props.name} onChange={props.onName} placeholder={labels.namePh} />
  )
  const ticker = (
    <PadField label={labels.ticker} value={props.ticker} onChange={props.onTicker} placeholder={labels.tickerPh} />
  )
  const desc = (
    <PadField label={labels.desc} value={props.desc} onChange={props.onDesc} placeholder={labels.descPh} />
  )
  const image = (
    <div className="pf-image">
      {props.kit !== 'bags' && <span className="pf-lab">{labels.image}</span>}
      {props.kit === 'bags' && <span className="pf-lab">Coin image</span>}
      <ImageDrop
        label={labels.image}
        current={props.logo}
        compact={props.kit === 'bags' || props.kit === 'pons' || props.kit === 'pumpfun'}
        onUrl={props.onLogo}
        onError={props.onError}
      />
      {urlOpen ? (
        <PadField
          label="Image URL"
          value={props.logo}
          onChange={props.onLogo}
          placeholder="https://"
        />
      ) : (
        <button type="button" className="pf-url" onClick={() => setUrlOpen(true)}>
          Use a URL instead
        </button>
      )}
    </div>
  )
  const facts = (
    <div className="pf-row">
      <PadField label="Chain" value={chainName} onChange={() => undefined} readOnly />
      <PadField label="Paired asset" value={quote} onChange={() => undefined} readOnly />
    </div>
  )
  const buy = (
    <PadField label={buyLabel(props.chain)} value={props.buyAmt} onChange={props.onBuyAmt} placeholder="0" />
  )
  const pairChip = (
    <div className="pf-chips" aria-label="Paired asset">
      <span className="on">{quote}</span>
    </div>
  )

  const bagsPreview = (
    <aside className="pf-card bags-preview" aria-live="polite">
      <div className={props.logo ? 'pf-thumb' : 'pf-thumb empty'}>
        {props.logo ? (
          <img src={props.logo} alt="" />
        ) : (
          <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden>
            <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="8.5" cy="10" r="1.4" fill="currentColor" />
            <path d="M3 16.5 9 12l4 3 3-2.5 5 4" fill="none" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        )}
      </div>
      <strong>{props.name.trim() || 'coin name'}</strong>
      <span>${(props.ticker.trim() || 'TICKER').toUpperCase()}</span>
      <p>{props.desc.trim() || 'Enter a description of coin'}</p>
    </aside>
  )

  const preview = (
    <aside className="pf-card" aria-live="polite">
      <div className={props.logo ? 'pf-thumb' : 'pf-thumb empty'}>
        {props.logo ? <img src={props.logo} alt="" /> : <span>Add an image</span>}
      </div>
      <strong>{props.name.trim() || 'Untitled coin'}</strong>
      <span>{props.ticker.trim() ? `$${props.ticker.trim().toUpperCase()}` : 'Ticker pending'}</span>
      <p>{props.desc.trim() || 'No description yet.'}</p>
      <small>{chainName} · {quote}</small>
    </aside>
  )

  switch (props.kit) {
    case 'bags':
      return (
        <>
          <section id="launch" className="pf split bags-form">
            <div>
              <div className="pf-progress" aria-hidden />
              <h2>{labels.title}</h2>
              <p className="bags-sub">Launch a coin in seconds</p>
              <div className="pf-row">{name}{ticker}</div>
              {desc}
              {image}
              {facts}
              {buy}
              <p className="bags-fine">{pinNote(props.chain)}</p>
              {go}
            </div>
            {bagsPreview}
          </section>
          {props.live}
        </>
      )
    case 'pons':
      return (
        <>
          <section id="launch" className="pf split">
            <div>
              <h2>{labels.title}</h2>
              <div className="pf-row">{name}{ticker}</div>
              {desc}
              {image}
              <PadField label="Paired asset" value={quote} onChange={() => undefined} readOnly />
              {buy}
              <p className="pad-note">{pinNote(props.chain)}</p>
              {go}
            </div>
            <aside className="pf-card pons-preview">
              <div className="pons-ico">{props.logo ? <img src={props.logo} alt="" /> : <i />}</div>
              <h3>Your token</h3>
              <p>{props.ticker.trim() ? props.ticker.toUpperCase() : 'ticker'}</p>
              <dl>
                <div><dt>Paired with</dt><dd>{quote}</dd></div>
                <div><dt>Chain</dt><dd>{chainName}</dd></div>
              </dl>
            </aside>
          </section>
          {props.live}
        </>
      )
    case 'pumpfun':
      return (
        <>
          <section id="launch" className="pf split pump-form">
            <div>
              <h2>{labels.title}</h2>
              <p className="pad-note">Coin details</p>
              <div className="pf-row">{name}{ticker}</div>
              {desc}
              {image}
              <p className="pf-lab">Paired asset</p>
              {pairChip}
              {buy}
              {go}
            </div>
            <aside className="pump-preview" aria-live="polite">
              {props.logo ? <img src={props.logo} alt="" /> : <p>A preview of how the coin will look</p>}
            </aside>
          </section>
          {props.live}
        </>
      )
    case 'app':
      return (
        <section id="launch" className="pf app">
          <h2>{labels.title}</h2>
          <p className="pad-note">Tell more information about an idea you are building</p>
          {name}
          {desc}
          <div className="app-drop">{image}</div>
          {ticker}
          {facts}
          {buy}
          {go}
          {props.live}
        </section>
      )
    case 'flap':
      return (
        <section id="launch" className="pf flap-form">
          <h2>Create token</h2>
          <div className="pf-banner">Tokens launch on this pad. Image is pinned to Pinata.</div>
          <p className="pad-note">BASIC INFORMATION</p>
          <div className="flap-grid">
            {image}
            <div>
              <div className="pf-row">{name}{ticker}</div>
              <PadField label="Chain" value={chainName} onChange={() => undefined} readOnly />
              {desc}
            </div>
          </div>
          <p className="pf-lab">Paired asset</p>
          {pairChip}
          {buy}
          {go}
          {props.live}
        </section>
      )
    case 'four':
      return (
        <section id="launch" className="pf four-form">
          <h2>Launch your token</h2>
          <div className="pf-tabs">
            <span className="on">Classic Mode</span>
            <span>Open Mode</span>
          </div>
          <div className="four-card">
            <p className="pad-note">Identity</p>
            <div className="flap-grid">
              {image}
              <div>
                {name}
                {ticker}
                {desc}
              </div>
            </div>
            <p className="pf-lab">Paired asset</p>
            {pairChip}
            {buy}
            {go}
          </div>
          {props.live}
        </section>
      )
    case 'long':
      return (
        <section id="launch" className="pf long-form">
          <h2>{labels.title}</h2>
          <p className="pad-note">{chainName} · {quote}</p>
          <div className="pf-row">{name}{ticker}</div>
          {desc}
          {image}
          {buy}
          {go}
          {preview}
          {props.live}
        </section>
      )
    case 'custom':
      return (
        <section id="launch" className="pf">
          <h2>{labels.title}</h2>
          {name}
          {ticker}
          {desc}
          {image}
          {facts}
          {buy}
          {go}
          {preview}
          {props.live}
        </section>
      )
    default: {
      const _n: never = props.kit
      return _n
    }
  }
}
