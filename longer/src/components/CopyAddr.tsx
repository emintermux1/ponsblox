'use client'

import { useState, type MouseEvent } from 'react'
import { GMGN_TOKEN, PONS_LAUNCHPAD_TOKEN } from '@/lib/official'
import { short, tokenUrl } from '@/lib/chain'

export async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    return false
  }
}

export function CopyAddr({
  address,
  compact = false,
  links = true,
}: {
  address: string
  compact?: boolean
  links?: boolean
}) {
  const [done, setDone] = useState(false)
  const ca = address.trim()
  if (!ca) return null

  async function onCopy(e: MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const ok = await copyText(ca)
    if (!ok) return
    setDone(true)
    window.setTimeout(() => setDone(false), 1600)
  }

  return (
    <span className="inline-flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      <button
        type="button"
        onClick={(e) => void onCopy(e)}
        className="min-w-0 truncate font-mono text-[12px] text-paper transition-colors hover:text-accent"
        title={ca}
      >
        {done ? 'Copied' : compact ? short(ca) : ca}
      </button>
      {links && (
        <>
          <a
            href={PONS_LAUNCHPAD_TOKEN(ca)}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="font-mono text-[11px] text-accent hover:text-paper"
          >
            Buy
          </a>
          <a
            href={GMGN_TOKEN(ca)}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="font-mono text-[11px] text-muted hover:text-paper"
          >
            GMGN
          </a>
          <a
            href={tokenUrl(ca)}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="font-mono text-[11px] text-muted hover:text-paper"
          >
            Explorer
          </a>
        </>
      )}
    </span>
  )
}
