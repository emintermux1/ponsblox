import { useEffect, useState } from 'react'
import { CountUp } from '../components/CountUp.tsx'
import { EmptyState, ErrorState, SkeletonGrid } from '../components/ErrorState.tsx'
import { FeaturedStage } from '../components/FeaturedStage.tsx'
import { Reveal } from '../components/Reveal.tsx'
import { SKINPAD_TICKER } from '../config/official.ts'
import { fetchCatalogue, fetchPulse, type PulseStats } from '../lib/api.ts'
import { fmtUsd } from '../lib/format.ts'
import { cataloguePath, onNavClick, skinPath } from '../lib/router.ts'
import { CATEGORIES, type SkinListing } from '../lib/skins.ts'

const STEPS = [
  {
    title: 'Pick a skin',
    body: 'Choose any listing in the catalogue. Wear, StatTrak, and Souvenir are different items. The peg is written once, at launch.',
  },
  {
    title: 'Launch in one transaction',
    body: 'Name it, pay the Pons launch fee in ETH. The whole supply goes to a bonding curve. Add a first buy in the same transaction if you want in first.',
  },
  {
    title: 'Trade against the skin',
    body: "The token trades from the first block. Every page shows its price next to the skin's live Steam median and the gap between them.",
  },
] as const

export function Home() {
  const [items, setItems] = useState<SkinListing[] | null>(null)
  const [pulse, setPulse] = useState<PulseStats | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    void fetchCatalogue().then((r) => setItems(r.items.slice(0, 18))).catch((e: Error) => setErr(e.message))
    void fetchPulse().then(setPulse).catch(() => {})
  }, [])

  const featured = (items ?? []).filter((s) => s.image).slice(0, 6)
  const strip = (items ?? []).slice(0, 14)

  return (
    <main>
      <section className="hero">
        <div className="hero__copy fade-up">
          <h1>Launch tokens backed by CS2 skins</h1>
          <p className="lede">
            Pick any CS2 skin in the catalogue and launch a token <strong>pegged to it, one to one</strong>.
            It tracks the skin&apos;s <strong>live Steam price</strong>, trades on a bonding curve from the first
            block, and graduates into a pool with <strong>permanently locked liquidity</strong>.
          </p>
          <div className="hero__cta">
            <a className="btn btn--fire" href="/launch" onClick={onNavClick('/launch')}>Launch a token</a>
            <a className="btn btn--ghost" href="/docs" onClick={onNavClick('/docs')}>How it works</a>
          </div>
          <p className="hero__trust">
            <span className="live-dot" aria-hidden /> Live Steam Community Market data · Pons V2 on Robinhood Chain · ${SKINPAD_TICKER}
          </p>
        </div>
        <div className="hero__stage fade-up" style={{ animationDelay: '0.08s' }}>
          {featured.length > 0 ? <FeaturedStage items={featured} /> : <div className="stage stage--empty" />}
        </div>
      </section>

      <div className="stats fade-up" style={{ animationDelay: '0.14s' }}>
        <a className="stat" href="/catalogue" onClick={onNavClick('/catalogue')}>
          <div>
            <em><CountUp value={pulse?.catalogue} /></em>
            <span>Skins in the catalogue</span>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            <rect x="3" y="5" width="7" height="7" rx="1" /><rect x="14" y="5" width="7" height="7" rx="1" />
            <rect x="3" y="16" width="7" height="5" rx="1" /><rect x="14" y="16" width="7" height="5" rx="1" />
          </svg>
        </a>
        <a className="stat" href="/markets" onClick={onNavClick('/markets')}>
          <div>
            <em><CountUp value={pulse?.tokensLive} /></em>
            <span>Tokens live</span>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            <circle cx="12" cy="12" r="8" /><path d="M12 8v8M9 10.5h4.5a1.5 1.5 0 0 1 0 3H10" />
          </svg>
        </a>
        <a className="stat" href="/markets" onClick={onNavClick('/markets')}>
          <div>
            <em><CountUp value={pulse?.onPeg} /></em>
            <span>On peg ±5%</span>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            <circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.5" /><path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4" />
          </svg>
        </a>
        <div className="stat">
          <div>
            <em>4663</em>
            <span>Robinhood Chain</span>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            <path d="M9 15l6-6M8.5 12.5l-2.8 2.8a3.5 3.5 0 0 0 5 5l2.8-2.8M15.5 11.5l2.8-2.8a3.5 3.5 0 0 0-5-5l-2.8 2.8" />
          </svg>
        </div>
      </div>

      <Reveal className="band">
        <div className="band__head">
          <div>
            <h2>Most valuable right now</h2>
            <nav className="cats" aria-label="Browse by type">
              {CATEGORIES.filter((c) => c !== 'Other').map((c) => (
                <a key={c} className="cat" href={cataloguePath({ category: c })} onClick={onNavClick(cataloguePath({ category: c }))}>
                  {c}
                </a>
              ))}
            </nav>
          </div>
          <a className="band__more" href="/catalogue" onClick={onNavClick('/catalogue')}>See all {pulse?.catalogue || 300} items →</a>
        </div>
        <ErrorState error={err} />
        {items == null && !err && <SkeletonGrid n={12} />}
        {items && items.length === 0 && <EmptyState title="Catalogue is empty" body="Steam did not return weapon listings. Retry in a minute." />}
        {strip.length > 0 && (
          <div className="strip">
            {strip.map((s) => (
              <a
                key={s.id}
                className="mini"
                href={skinPath(s.id)}
                onClick={onNavClick(skinPath(s.id))}
                style={{ ['--rarity' as string]: s.rarityColor }}
              >
                {s.image ? <img src={s.image} alt={s.marketHashName} loading="lazy" /> : <span className="mini__blank" />}
                <strong>{s.finish}</strong>
                <em>{s.stattrak ? 'StatTrak ' : ''}{s.weapon}{s.wearShort ? ` · ${s.wearShort}` : ''}</em>
                <span>From {fmtUsd(s.lowestUsd ?? s.quoteUsd)}</span>
              </a>
            ))}
          </div>
        )}
      </Reveal>

      <Reveal className="band">
        <div className="band__head">
          <div>
            <p className="kicker">How it works</p>
            <h2>One skin, one token, one transaction</h2>
          </div>
        </div>
        <ol className="flow">
          {STEPS.map((step, i) => (
            <li key={step.title}>
              <em>0{i + 1}</em>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </Reveal>
    </main>
  )
}
