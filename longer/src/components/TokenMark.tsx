'use client'

import { useEffect, useState } from 'react'
import { markDim, type MarkSize } from './AssetMark'

export function TokenMark({
  symbol,
  logo,
  size = 'md',
}: {
  symbol: string
  logo?: string
  size?: MarkSize
}) {
  const [broken, setBroken] = useState(false)
  const src = logo?.trim() || '/logo'
  const dim = markDim(size)

  useEffect(() => {
    setBroken(false)
  }, [src])

  if (!broken && src) {
    return (
      <img
        src={src}
        alt=""
        className={`${dim} shrink-0 border border-line object-cover`}
        onError={() => setBroken(true)}
      />
    )
  }
  return (
    <span
      className={`${dim} grid shrink-0 place-items-center border border-line bg-ink font-mono uppercase text-paper`}
    >
      {symbol.slice(0, 2)}
    </span>
  )
}
