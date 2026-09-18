'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { ASSETS } from '@/lib/assets'
import {
  getLongerLaunches,
  getPreviewLaunches,
  getSupported3XAssets,
  isPairFilter,
  isSortKey,
  type AssetWithPons,
  type LongerLaunch,
  type PairFilter,
  type SortKey,
} from '@/lib/pons'
import { previewTape, seedAssets } from '@/lib/preview'
import { AssetMark } from './AssetMark'
import { BrandLockup } from './BrandLockup'
import { LaunchTable } from './LaunchTable'
import { MarketsStrip } from './MarketsStrip'
import { OfficialCa } from './OfficialCa'
import { PageEnter } from './PageEnter'

const SORTS: { id: SortKey; label: string }[] = [
  { id: 'newest', label: 'Newest' },
  { id: 'mcap', label: 'Market Cap' },
  { id: 'volume', label: 'Volume' },
]

const STEPS = [
  { n: '01', t: 'Create a meme' },
  { n: '02', t: 'Pick a 3X' },
  { n: '03', t: 'Launch on Pons' },
] as const

export function Explore() {
  const params = useSearchParams()
  const router = useRouter()
  const pairParam = params.get('pair')
  const sortParam = params.get('sort')
  const pair: PairFilter = pairParam && isPairFilter(pairParam) ? pairParam : 'all'
  const sort: SortKey = isSortKey(sortParam) ? sortParam : 'newest'

  const [assets, setAssets] = useState<AssetWithPons[]>(seedAssets)
  const [rows, setRows] = useState<LongerLaunch[]>(() => getPreviewLaunches({ pair, sort }))

  useEffect(() => {
    void getSupported3XAssets().then(setAssets).catch(() => setAssets(seedAssets()))
  }, [])

  useEffect(() => {
    setRows(getPreviewLaunches({ pair, sort }))
    void getLongerLaunches({ pair, sort }).then((r) => {
      setRows(r.rows)
    })
  }, [pair, sort])

  const pairFilters = useMemo(() => [{ id: 'all' as const, label: 'All 3X' }, ...ASSETS.map((a) => ({ id: a.id, label: `${a.symbol} 3X` }))], [])
  const tapes = useMemo(() => Object.fromEntries(ASSETS.map((a) => [a.id, previewTape(a.id)])), [])

  function setQuery(next: { pair?: PairFilter; sort?: SortKey }) {
    const q = new URLSearchParams()
    const p = next.pair ?? pair
    const s = next.sort ?? sort
    if (p !== 'all') q.set('pair', p)
    if (s !== 'newest') q.set('sort', s)
    const qs = q.toString()
    router.replace(qs ? `/?${qs}` : '/', { scroll: false })
  }

  return (
    <PageEnter>
      <main className="mx-auto w-full max-w-[1200px] px-4 py-8">
        <section className="mb-8 grid gap-6 border-b border-line pb-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-[620px]">
            <p className="mb-2">
              <BrandLockup />
            </p>
            <h1 className="text-[28px] font-medium leading-tight tracking-tight text-paper sm:text-[32px]">
              Launch memes with leverage.
            </h1>
            <p className="mt-2 text-[14px] leading-relaxed text-muted">
              Pair Pons launches with 3X stock assets on Robinhood Chain.
            </p>
            <ol className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
              {STEPS.map((s) => (
                <li key={s.n} className="flex items-center gap-2 text-[13px] text-paper">
                  <span className="font-mono text-[10px] tracking-[0.14em] text-accent">{s.n}</span>
                  {s.t}
                </li>
              ))}
            </ol>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto">
            <OfficialCa />
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Link href="/launch" className="btn btn-accent btn-lg sm:w-auto">
                Launch a token
              </Link>
              <Link href="/assets" className="btn btn-ink btn-lg sm:w-auto">
                3X Assets
              </Link>
            </div>
          </div>
        </section>

        <MarketsStrip assets={assets.length ? assets : ASSETS} tapes={tapes} />

        <section className="mt-10">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-[13px] font-medium tracking-[0.16em] text-muted">RECENT LAUNCHES</h2>
            </div>
            <div className="chip-row">
              {SORTS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={sort === s.id ? 'chip chip-on' : 'chip'}
                  onClick={() => setQuery({ sort: s.id })}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-3 chip-row">
            {pairFilters.map((f) => {
              const asset = f.id === 'all' ? null : ASSETS.find((a) => a.id === f.id)
              return (
                <button
                  key={f.id}
                  type="button"
                  className={`${pair === f.id ? 'chip chip-on' : 'chip'} inline-flex items-center gap-1.5`}
                  onClick={() => setQuery({ pair: f.id })}
                >
                  {asset && <AssetMark asset={asset} size="xs" />}
                  {f.label}
                </button>
              )
            })}
          </div>
          <LaunchTable rows={rows} />
        </section>
      </main>
    </PageEnter>
  )
}
