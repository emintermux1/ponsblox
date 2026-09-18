'use client'

import Link from 'next/link'
import { pairTicker, tokenPairLabel } from '@/lib/assets'
import { timeAgoMs, usd } from '@/lib/format'
import { byLongerName } from '@/lib/naming'
import type { LongerLaunch } from '@/lib/pons'
import { AssetMark } from './AssetMark'
import { Badge } from './Badge'
import { CopyAddr } from './CopyAddr'
import { TokenMark } from './TokenMark'

export function LaunchTable({ rows }: { rows: LongerLaunch[] }) {
  if (!rows.length) {
    return (
      <div className="border border-line px-4 py-10 text-center text-sm text-muted">
        No launches for this 3X pair yet.
      </div>
    )
  }

  return (
    <div className="border border-line">
      <div className="hidden grid-cols-[1.4fr_1.2fr_0.7fr_0.7fr_0.5fr_0.8fr] gap-3 border-b border-line px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted md:grid">
        <span>Token</span>
        <span>Pair</span>
        <span className="text-right">MC</span>
        <span className="text-right">24h vol</span>
        <span className="text-right">Age</span>
        <span className="text-right">Curve</span>
      </div>
      {rows.map((row, i) => (
        <Link
          key={row.id}
          href={`/token/${row.id}`}
          style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
          className="row-enter grid grid-cols-1 gap-3 border-b border-line px-3 py-3 last:border-b-0 transition-colors hover:bg-ink md:grid-cols-[1.4fr_1.2fr_0.7fr_0.7fr_0.5fr_0.8fr] md:items-center md:gap-3"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <TokenMark symbol={row.symbol} logo={row.logo} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm text-paper">{byLongerName(row.name)}</p>
                {row.source === 'preview' && <Badge tone="muted">Preview</Badge>}
              </div>
              <p className="font-mono text-[11px] text-muted">{row.symbol}</p>
              {row.token ? (
                <p className="mt-0.5" onClick={(e) => e.preventDefault()}>
                  <CopyAddr address={row.token} compact />
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <AssetMark asset={row.pair} size="sm" />
            <span className="min-w-0 truncate text-sm text-paper">{tokenPairLabel(row.symbol, row.pair)}</span>
            <Badge tone="accent">3X LONG</Badge>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 md:hidden">
            <MobileStat k="MC" v={usd(row.marketCap)} />
            <MobileStat k="VOL" v={usd(row.volume24h)} />
            <MobileStat k="Age" v={timeAgoMs(row.createdAt)} />
            <MobileStat
              k="Curve"
              v={
                row.bonding === 'graduated'
                  ? 'Graduated'
                  : row.bondingPct != null
                    ? `${Math.round(row.bondingPct)}% bond`
                    : '—'
              }
            />
          </div>
          <p className="hidden text-sm tabular-nums text-paper md:block md:text-right">{usd(row.marketCap)}</p>
          <p className="hidden text-sm tabular-nums text-paper md:block md:text-right">{usd(row.volume24h)}</p>
          <p className="hidden font-mono text-[12px] text-muted md:block md:text-right">{timeAgoMs(row.createdAt)}</p>
          <p className="hidden text-right font-mono text-[12px] text-muted md:block">
            {row.bonding === 'graduated'
              ? 'Graduated'
              : row.bondingPct != null
                ? `${Math.round(row.bondingPct)}% bond`
                : '—'}
          </p>
          <span className="sr-only">{pairTicker(row.pair)}</span>
        </Link>
      ))}
    </div>
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
