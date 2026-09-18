import { useState } from 'react'
import { BUY, CA, EXPLORER, GMGN, TICKER } from '../lore.ts'

export function OfficialCa({ compact = false }: { compact?: boolean }) {
  const [copied, setCopied] = useState(false)

  async function copyCa() {
    if (!navigator.clipboard) return
    await navigator.clipboard.writeText(CA)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  if (compact) {
    return (
      <div className="token token-compact" aria-label={`${TICKER} official token`}>
        <span className="token-tick">{TICKER}</span>
        <button type="button" className="token-ca" onClick={() => void copyCa()}>
          {copied ? 'Copied' : CA}
        </button>
      </div>
    )
  }

  return (
    <aside className="token" aria-label={`${TICKER} official token`}>
      <p className="token-kicker">Official</p>
      <p className="token-tick">{TICKER}</p>
      <button type="button" className="token-ca" onClick={() => void copyCa()}>
        {copied ? 'Copied' : CA}
      </button>
      <p className="token-links">
        <a href={BUY} target="_blank" rel="noreferrer">Buy</a>
        <a href={GMGN} target="_blank" rel="noreferrer">GMGN</a>
        <a href={EXPLORER} target="_blank" rel="noreferrer">Explorer</a>
      </p>
    </aside>
  )
}
