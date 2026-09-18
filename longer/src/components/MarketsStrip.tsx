'use client'

import Link from 'next/link'
import type { LeveragedAsset } from '@/lib/assets'
import type { AssetWithPons } from '@/lib/pons'
import { InstrumentCard } from './InstrumentCard'

export function MarketsStrip({
  assets,
  tapes,
}: {
  assets: AssetWithPons[] | LeveragedAsset[]
  tapes?: Record<string, number[]>
}) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 className="text-[13px] font-medium tracking-[0.16em] text-muted">3X MARKETS</h2>
        <Link href="/assets" className="text-[12px] text-muted transition-colors hover:text-paper">
          All assets
        </Link>
      </div>
      <div className="snap-strip">
        {assets.map((asset) => (
          <InstrumentCard
            key={asset.id}
            asset={asset}
            href={`/?pair=${asset.id}`}
            spark={tapes?.[asset.id]}
          />
        ))}
      </div>
    </section>
  )
}
