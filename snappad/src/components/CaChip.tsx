import { useState } from 'react'
import { addressUrl } from '../lib/chain.ts'
import { SNAP_CA, SNAP_CA_SHORT } from '../lib/social.ts'

export function CaChip({ compact = false }: { compact?: boolean }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(SNAP_CA)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      setCopied(false)
    }
  }

  return (
    <span className={`ca ${compact ? 'ca--chip' : ''}`}>
      <button
        type="button"
        className="ca__copy"
        onClick={() => void copy()}
        title={SNAP_CA}
        aria-label={`Copy contract address ${SNAP_CA}`}
      >
        <b>CA</b> {copied ? 'copied' : SNAP_CA_SHORT}
      </button>
      <a
        className="ca__ex"
        href={addressUrl(SNAP_CA)}
        target="_blank"
        rel="noopener noreferrer"
        title={SNAP_CA}
        aria-label={`Open ${SNAP_CA} on Robinhood explorer`}
      >
        ↗
      </a>
    </span>
  )
}
