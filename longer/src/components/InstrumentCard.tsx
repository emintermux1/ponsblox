'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import {
  assetStatus,
  brandInk,
  pairTicker,
  statusCopy,
  type LeveragedAsset,
} from '@/lib/assets'
import { compact, usd } from '@/lib/format'
import type { AssetWithPons } from '@/lib/pons'
import { AssetMark } from './AssetMark'
import { Badge } from './Badge'
import { Sparkline } from './Tape'

function ponsOf(asset: LeveragedAsset | AssetWithPons): boolean {
  return 'ponsApproved' in asset ? asset.ponsApproved : false
}

export function InstrumentCard({
  asset,
  href,
  selected,
  onSelect,
  spark,
  className = '',
}: {
  asset: LeveragedAsset | AssetWithPons
  href?: string
  selected?: boolean
  onSelect?: () => void
  spark?: number[]
  className?: string
}) {
  const status = assetStatus(asset, ponsOf(asset))
  const launches = 'launchCount' in asset ? asset.launchCount : null
  const volume = 'combinedVolume' in asset ? asset.combinedVolume : null
  const pending = !asset.enabled || !asset.address
  const ink = brandInk(asset.id)

  const body: ReactNode = (
    <>
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: ink }} />
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <AssetMark asset={asset} size="md" />
          <div className="min-w-0">
            <p className="text-sm text-paper">{pairTicker(asset)}</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">{asset.name}</p>
          </div>
        </div>
        <Badge tone="accent">3X LONG</Badge>
      </div>
      {spark && spark.length > 1 && <Sparkline values={spark} className="mt-3 h-8" />}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Badge tone={status === 'development' ? 'muted' : status === 'live' ? 'ok' : 'accent'}>
          {statusCopy(status)}
        </Badge>
        {pending && <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">No CA yet</span>}
      </div>
      {(launches != null || volume != null) && (
        <p className="mt-2 font-mono text-[11px] tabular-nums text-muted">
          {compact(launches ?? 0)} launches · {usd(volume ?? 0)} vol
        </p>
      )}
    </>
  )

  const cls = `instrument ${selected ? 'instrument-on' : ''} ${className}`

  if (href) {
    return (
      <Link href={href} className={cls}>
        {body}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onSelect} className={`${cls} w-full`}>
      {body}
    </button>
  )
}
