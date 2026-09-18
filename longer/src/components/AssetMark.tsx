'use client'

import { useState } from 'react'
import type { LeveragedAsset } from '@/lib/assets'

export type MarkSize = 'xs' | 'sm' | 'md' | 'lg'

export function markDim(size: MarkSize): string {
  switch (size) {
    case 'xs':
      return 'h-5 w-5 text-[8px]'
    case 'sm':
      return 'h-7 w-7 text-[10px]'
    case 'md':
      return 'h-9 w-9 text-[11px]'
    case 'lg':
      return 'h-12 w-12 text-[13px]'
    default: {
      const _e: never = size
      return _e
    }
  }
}

export function AssetMark({
  asset,
  size = 'md',
}: {
  asset: Pick<LeveragedAsset, 'logo' | 'symbol' | 'name'>
  size?: MarkSize
}) {
  const [broken, setBroken] = useState(false)
  const dim = markDim(size)
  if (!broken && asset.logo) {
    return (
      <img
        src={asset.logo}
        alt={asset.name}
        className={`${dim} shrink-0 object-contain`}
        onError={() => setBroken(true)}
      />
    )
  }
  return (
    <span
      className={`${dim} grid shrink-0 place-items-center bg-ink font-mono uppercase text-paper`}
    >
      {asset.symbol.slice(0, 2)}
    </span>
  )
}
