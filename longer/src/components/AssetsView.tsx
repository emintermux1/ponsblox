'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ASSETS, pairTicker, statusCopy, assetStatus } from '@/lib/assets'
import { addressUrl, short } from '@/lib/chain'
import { compact, usd } from '@/lib/format'
import { getSupported3XAssets, type AssetWithPons } from '@/lib/pons'
import { previewTape, seedAssets } from '@/lib/preview'
import { AssetMark } from './AssetMark'
import { Badge } from './Badge'
import { InstrumentCard } from './InstrumentCard'
import { PageEnter } from './PageEnter'

export function AssetsView() {
  const [rows, setRows] = useState<AssetWithPons[]>(seedAssets)

  useEffect(() => {
    void getSupported3XAssets().then(setRows).catch(() => setRows(seedAssets()))
  }, [])

  const list = rows
  const tapes = useMemo(() => Object.fromEntries(ASSETS.map((a) => [a.id, previewTape(a.id)])), [])

  return (
    <PageEnter>
      <main className="mx-auto w-full max-w-[1200px] px-4 py-8">
        <h1 className="text-[26px] font-medium tracking-tight text-paper">3X Assets</h1>
        <p className="mt-1 text-[14px] text-muted">Leveraged stock tokens available as LONGER pairs on Robinhood Chain.</p>

        <div className="mt-6 snap-strip">
          {list.map((asset) => (
            <InstrumentCard key={asset.id} asset={asset} href={`/?pair=${asset.id}`} spark={tapes[asset.id]} />
          ))}
        </div>

        <div className="mt-8 border border-line">
          <div className="hidden grid-cols-[1.3fr_1fr_1fr_0.8fr_1.1fr_0.6fr_0.7fr] gap-3 border-b border-line px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted md:grid">
            <span>Asset</span>
            <span>Underlying</span>
            <span>Leveraged</span>
            <span>Status</span>
            <span>Contract</span>
            <span className="text-right">Launches</span>
            <span className="text-right">Volume</span>
          </div>
          {list.map((asset) => {
            const status = assetStatus(asset, asset.ponsApproved)
            return (
              <Link
                key={asset.id}
                href={`/?pair=${asset.id}`}
                className="grid grid-cols-1 gap-3 border-b border-line px-3 py-3 last:border-b-0 transition-colors hover:bg-ink md:grid-cols-[1.3fr_1fr_1fr_0.8fr_1.1fr_0.6fr_0.7fr] md:items-center"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <AssetMark asset={asset} size="md" />
                  <div className="min-w-0">
                    <p className="truncate text-sm text-paper">{pairTicker(asset)}</p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">{asset.name}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1 md:hidden">
                      <Badge tone="accent">3X LONG</Badge>
                      <Badge tone={status === 'development' ? 'muted' : status === 'live' ? 'ok' : 'accent'}>
                        {statusCopy(status)}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 md:hidden">
                  <MobileStat k="Underlying" v={asset.underlying} />
                  <MobileStat k="Leveraged" v={asset.leveragedSymbol} />
                  <MobileStat k="Contract" v={asset.address ? short(asset.address) : 'No CA yet'} />
                  <MobileStat k="Launches" v={compact(asset.launchCount)} />
                  <MobileStat k="Volume" v={usd(asset.combinedVolume)} />
                </div>
                <p className="hidden text-sm text-paper md:block">{asset.underlying}</p>
                <p className="hidden font-mono text-sm text-paper md:block">{asset.leveragedSymbol}</p>
                <div className="hidden flex-wrap gap-1 md:flex">
                  <Badge tone="accent">3X LONG</Badge>
                  <Badge tone={status === 'development' ? 'muted' : status === 'live' ? 'ok' : 'accent'}>
                    {statusCopy(status)}
                  </Badge>
                </div>
                <p className="hidden font-mono text-[12px] text-muted md:block">
                  {asset.address ? (
                    <span
                      onClick={(e) => {
                        e.preventDefault()
                        window.open(addressUrl(asset.address), '_blank')
                      }}
                    >
                      {short(asset.address)}
                    </span>
                  ) : (
                    'No CA yet'
                  )}
                </p>
                <p className="hidden text-sm tabular-nums text-paper md:block md:text-right">{compact(asset.launchCount)}</p>
                <p className="hidden text-sm tabular-nums text-paper md:block md:text-right">{usd(asset.combinedVolume)}</p>
              </Link>
            )
          })}
        </div>
      </main>
    </PageEnter>
  )
}

function MobileStat({ k, v }: { k: string; v: string }) {
  return (
    <div className="min-w-0">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">{k}</p>
      <p className="truncate text-sm tabular-nums text-paper">{v}</p>
    </div>
  )
}
