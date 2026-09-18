import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { BoardList } from '../components/BoardList.tsx'
import { BrandFilm } from '../components/BrandFilm.tsx'
import { CountUp } from '../components/CountUp.tsx'
import { EmptyState, ErrorState, SkeletonGrid } from '../components/ErrorState.tsx'
import { FeatureGame } from '../components/FeatureGame.tsx'
import { FlowTrack } from '../components/FlowTrack.tsx'
import { HeatRow } from '../components/HeatRow.tsx'
import { HeroStage } from '../components/HeroStage.tsx'
import { IconRail } from '../components/IconRail.tsx'
import { Rise } from '../components/Rise.tsx'
import { ROBLOXPAD_TICKER } from '../config/official.ts'
import { fetchCatalogue, fetchPulse, type PulseStats } from '../lib/api.ts'
import { formatPlayers, type GameListing } from '../lib/games.ts'
import { ease } from '../lib/motion.ts'
import { gamesPath, navigate, onNavClick } from '../lib/router.ts'

const LINES = ['Play the game.', 'Earn on it.'] as const

export function Home() {
  const [items, setItems] = useState<GameListing[] | null>(null)
  const [pulse, setPulse] = useState<PulseStats | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const reduce = useReducedMotion()

  useEffect(() => {
    void fetchCatalogue().then((r) => setItems(r.items)).catch((e: Error) => setErr(e.message))
    void fetchPulse().then(setPulse).catch(() => {})
  }, [])

  const ranked = items ? [...items].sort((a, b) => b.playing - a.playing) : []
  const top = ranked.slice(0, 10)
  const hot = ranked[0] ?? null

  return (
    <main>
      <section className="hero">
        <div className="hero__copy">
          <h1 className="hero__title">
            {LINES.map((line, i) => (
              <span key={line} className="hero__line">
                <motion.b
                  initial={reduce ? false : { y: 18 }}
                  animate={{ y: 0 }}
                  transition={{ duration: 0.55, ease, delay: 0.05 + i * 0.08 }}
                >
                  {line}
                </motion.b>
              </span>
            ))}
          </h1>
          <p className="lede">
            Pick a live Roblox title. Launch a token on it. Trade while they play.
          </p>
          <form
            className="hero__search"
            onSubmit={(e) => {
              e.preventDefault()
              navigate(gamesPath({ q: query }))
            }}
          >
            <input
              className="field"
              value={query}
              placeholder="Search a Roblox game"
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search a Roblox game"
            />
          </form>
          <div className="hero__cta">
            <a className="btn btn--fire" href="/launch" onClick={onNavClick('/launch')}>Launch</a>
            <a className="btn btn--ghost" href="/games" onClick={onNavClick('/games')}>Games</a>
          </div>
          <dl className="stats">
            <div>
              <dt>Games</dt>
              <dd><CountUp value={pulse?.catalogue} /></dd>
            </div>
            <div>
              <dt>Playing</dt>
              <dd>{pulse ? formatPlayers(pulse.playingNow) : '—'}</dd>
            </div>
            <div>
              <dt>Tokens</dt>
              <dd><CountUp value={pulse?.tokensLive} /></dd>
            </div>
            <div>
              <dt>Network</dt>
              <dd>4663 · ${ROBLOXPAD_TICKER}</dd>
            </div>
          </dl>
        </div>
        <HeroStage />
      </section>

      {items && <IconRail items={ranked} />}

      {hot && <FeatureGame game={hot} />}
      {ranked.length > 3 && <HeatRow items={ranked.slice(1, 4)} />}

      <Rise className="band">
        <div className="band__head">
          <h2>Board</h2>
          <a className="band__more" href={gamesPath({ sort: 'playing' })} onClick={onNavClick(gamesPath({ sort: 'playing' }))}>All games</a>
        </div>
        <ErrorState error={err} />
        {items == null && !err && <SkeletonGrid n={8} />}
        {items && items.length === 0 && <EmptyState title="Board is empty" body="Roblox did not return games. Retry in a minute." />}
        {top.length > 0 && <BoardList items={top} />}
      </Rise>

      <Rise className="band band--flow">
        <FlowTrack />
      </Rise>

      <Rise>
        <BrandFilm />
      </Rise>
    </main>
  )
}
