'use client'

import {
  LONGER_BUY_URL,
  LONGER_EXPLORER_URL,
  LONGER_GMGN_URL,
  LONGER_OFFICIAL_TOKEN,
  LONGER_TICKER,
} from '@/lib/official'
import { CopyAddr } from './CopyAddr'

export function OfficialCa({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex min-w-0 items-center gap-2">
        <span className="shrink-0 font-mono text-[11px] text-paper">{LONGER_TICKER}</span>
        <CopyAddr address={LONGER_OFFICIAL_TOKEN} compact links={false} />
      </div>
    )
  }

  return (
    <aside className="border border-line bg-panel p-4" aria-label={`${LONGER_TICKER} official token`}>
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent">Official</p>
      <p className="mt-1 text-[16px] font-medium text-paper">{LONGER_TICKER}</p>
      <p className="mt-2">
        <CopyAddr address={LONGER_OFFICIAL_TOKEN} links={false} />
      </p>
      <p className="mt-3 flex flex-wrap gap-3 font-mono text-[12px]">
        <a href={LONGER_BUY_URL} target="_blank" rel="noreferrer" className="text-accent hover:text-paper">
          Buy
        </a>
        <a href={LONGER_GMGN_URL} target="_blank" rel="noreferrer" className="text-muted hover:text-paper">
          GMGN
        </a>
        <a href={LONGER_EXPLORER_URL} target="_blank" rel="noreferrer" className="text-muted hover:text-paper">
          Explorer
        </a>
      </p>
    </aside>
  )
}
