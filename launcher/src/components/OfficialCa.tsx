import { useEffect, useState } from 'react'
import {
  LAUNCHER_TOKEN_ARC,
  LAUNCHER_TOKEN_ARC_SHORT,
  LAUNCHER_TOKEN_ARC_URL,
  chainLabel,
} from '../lib/chain.ts'

type OfficialCaKind = 'chip' | 'full' | 'docs'

function useCopy(): [copied: boolean, copy: (text: string) => void] {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1600)
    return () => clearTimeout(t)
  }, [copied])
  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).then(() => setCopied(true)).catch(() => setCopied(false))
  }
  return [copied, copy]
}

export function OfficialCa({ kind }: { kind: OfficialCaKind }) {
  const [copied, copy] = useCopy()
  const copyBtn = (
    <button
      type="button"
      className="ca-copy"
      title={LAUNCHER_TOKEN_ARC}
      onClick={() => copy(LAUNCHER_TOKEN_ARC)}
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  )

  switch (kind) {
    case 'chip':
      return (
        <div className="ca-chip" title={LAUNCHER_TOKEN_ARC} aria-label={`LAUNCHER token ${LAUNCHER_TOKEN_ARC}`}>
          <span>CA {LAUNCHER_TOKEN_ARC_SHORT}</span>
          {copyBtn}
        </div>
      )
    case 'full':
      return (
        <p className="ca-full">
          <span>Live on {chainLabel('arc')}</span>
          <code title={LAUNCHER_TOKEN_ARC}>{LAUNCHER_TOKEN_ARC}</code>
          {copyBtn}
          <a href={LAUNCHER_TOKEN_ARC_URL} target="_blank" rel="noreferrer">Arcscan</a>
        </p>
      )
    case 'docs':
      return (
        <p className="ca-docs">
          The LAUNCHER token is live on {chainLabel('arc')}. Contract on{' '}
          <a href={LAUNCHER_TOKEN_ARC_URL} target="_blank" rel="noreferrer" title={LAUNCHER_TOKEN_ARC}>
            Arcscan
          </a>
          :{' '}
          <a href={LAUNCHER_TOKEN_ARC_URL} target="_blank" rel="noreferrer">
            {LAUNCHER_TOKEN_ARC}
          </a>
          .
        </p>
      )
    default: {
      const _n: never = kind
      return _n
    }
  }
}
