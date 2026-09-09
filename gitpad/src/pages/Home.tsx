import { useEffect, useState } from 'react'
import { ErrorState, SkeletonGrid } from '../components/ErrorState.tsx'
import { FeedTape } from '../components/FeedTape.tsx'
import { PulseStrip } from '../components/PulseStrip.tsx'
import { RepoCard } from '../components/RepoCard.tsx'
import { RepoRail } from '../components/RepoRail.tsx'
import { Reveal } from '../components/Reveal.tsx'
import { Terminal } from '../components/Terminal.tsx'
import {
  fetchFeed,
  fetchPulse,
  type FeedFilter,
  type FeedItem,
  type PulseStats,
  type RepoCard as Card,
} from '../lib/api.ts'
import { useTrendingRepositories } from '../hooks/useTrendingRepositories.ts'
import { ART } from '../lib/chain.ts'
import { compact } from '../lib/format.ts'
import { loadIndexed } from '../lib/tokens.ts'
import { launchPath, onNavClick, repoPath } from '../lib/router.ts'
import type { TokenRecord } from '../lib/pons.ts'

export function Home() {
  const trending = useTrendingRepositories('trending')
  const [launches, setLaunches] = useState<TokenRecord[]>([])
  const [pulse, setPulse] = useState<PulseStats | null>(null)
  const [filter, setFilter] = useState<FeedFilter>('all')
  const [feed, setFeed] = useState<FeedItem[]>([])

  useEffect(() => {
    void loadIndexed().then((rows) => setLaunches(rows.slice(0, 8))).catch(() => {})
    void fetchPulse().then(setPulse).catch(() => {})
  }, [])

  useEffect(() => {
    setFeed([])
    void fetchFeed(filter).then((r) => setFeed(r.events)).catch(() => setFeed([]))
  }, [filter])

  const first = trending.repos.filter((r) => r.tokenStatus !== 'live').slice(0, 4)
  const featured = trending.repos[0]
  const pulseView = pulse && {
    ...pulse,
    trendingToday: Math.max(pulse.trendingToday, trending.repos.length),
    repositoriesTracked: Math.max(pulse.repositoriesTracked, trending.repos.length),
  }

  return (
    <main>
      <section className="hero">
        <div className="hero__copy">
          <h1 className="hero__title">
            <span>Git</span><span className="hero__pad">Pad</span>
          </h1>
          <p className="lede">Launch tokens paired with trending GitHub repositories.</p>
          <div className="hero__cta">
            <a className="btn btn--lime btn--lg" href="/explore" onClick={onNavClick('/explore')}>Explore</a>
            <a className="btn btn--paper btn--lg" href="/launch" onClick={onNavClick('/launch')}>Launch</a>
          </div>
          <Terminal lines={feed.slice(0, 4).map((e) => e.title)} />
        </div>
        <figure className="hero__art">
          <img src={ART.night} alt="" />
          <figcaption>GITPAD</figcaption>
        </figure>
      </section>
      <RepoRail repos={trending.repos.slice(0, 10)} />

      <section className="ink">
        <Reveal>
        <header className="sec">
          <div>
            <p className="kicker">GitPad Pulse</p>
            <h2>What's moving</h2>
          </div>
        </header>
        <PulseStrip pulse={pulseView} />
        <FeedTape
          events={feed.slice(0, 8)}
          filter={filter}
          onFilter={setFilter}
          empty="No events yet."
        />
        </Reveal>
      </section>

      <section className="paper">
        <Reveal>
        <header className="sec">
          <div>
            <p className="kicker">Trending repositories</p>
            <h2>Moving on GitHub</h2>
          </div>
          <a className="btn btn--ink" href="/board" onClick={onNavClick('/board')}>Open board</a>
        </header>
        {featured && (
          <a className="spot" href={repoPath(featured.owner, featured.name)} onClick={onNavClick(repoPath(featured.owner, featured.name))}>
            <span className="kicker">Featured · moving</span>
            <strong>{featured.owner}/{featured.name}</strong>
            <p>{featured.description || 'No description on GitHub.'}</p>
            <span className="spot__meta">
              ★ {compact(featured.stars)} · Trend {featured.trendScore}
            </span>
          </a>
        )}
        <ErrorState error={trending.error} />
        {trending.busy && !trending.repos.length ? <SkeletonGrid /> : (
          <div className="grid">{trending.repos.slice(0, 6).map((r: Card) => <RepoCard key={r.id} repo={r} />)}</div>
        )}
        </Reveal>
      </section>

      <section className="ink">
        <Reveal>
        <header className="sec">
          <div>
            <p className="kicker">Be First</p>
            <h2>Trending, not yet tokenized</h2>
          </div>
          <a className="btn btn--lime" href="/first" onClick={onNavClick('/first')}>All open slots</a>
        </header>
        {first.length ? (
          <ol className="befirst">
            {first.map((r, i) => (
              <li key={r.id}>
                <span className="mono">TRENDING #{String(r.rank || i + 1).padStart(2, '0')}</span>
                <a href={repoPath(r.owner, r.name)} onClick={onNavClick(repoPath(r.owner, r.name))}>
                  <strong>{r.owner}/{r.name}</strong>
                </a>
                <em>⭐ {compact(r.stars)}{r.stars7d != null ? ` ↑ +${compact(r.stars7d)} this week` : ''} · Quote ETH</em>
                <b>NOT YET TOKENIZED</b>
                <a className="btn btn--lime btn--sm" href={launchPath(r.owner, r.name)} onClick={onNavClick(launchPath(r.owner, r.name))}>
                  Launch
                </a>
              </li>
            ))}
          </ol>
        ) : (
          <p className="muted">
            {trending.busy ? 'Reading GitHub…' : 'No un-tokenized repositories in this trending window.'}
          </p>
        )}
        </Reveal>
      </section>

      <section className="paper">
        <Reveal>
        <header className="sec">
          <div>
            <p className="kicker">Live launches</p>
            <h2>On Pons V2</h2>
          </div>
          <a href="/dashboard/launches" onClick={onNavClick('/dashboard/launches')}>Your launches</a>
        </header>
        {launches.length ? (
          <ul className="tape">
            {launches.map((t) => (
              <li key={t.token}>
                <a href={`/token/${t.token}`} onClick={onNavClick(`/token/${t.token}`)}>
                  <strong>{t.name}</strong> ${t.symbol} · {t.repo ? `${t.repo.owner}/${t.repo.name}` : 'unpaired'}
                </a>
              </li>
            ))}
          </ul>
        ) : <p className="muted">No indexed launches yet.</p>}
        </Reveal>
      </section>

      <section className="ink how">
        <Reveal>
        <header className="sec">
          <div>
            <p className="kicker">How it works</p>
            <h2>CODE → REPOSITORY → TOKEN</h2>
          </div>
        </header>
        <ol className="steps">
          <li><span>01</span><strong>CODE</strong><p>A public GitHub repository. Identity is the numeric id, not the URL.</p></li>
          <li><span>02</span><strong>REPOSITORY</strong><p>The narrative pair. On-chain quote is ETH.</p></li>
          <li><span>03</span><strong>TOKEN</strong><p>Your wallet calls Pons V2. LIVE only after TokenLaunched.</p></li>
        </ol>
        </Reveal>
      </section>

      <section className="paper">
        <Reveal>
        <p className="kicker">For repository owners</p>
        <h2>Claim the repo. Point the fees.</h2>
        <p className="ownerlead">
          Claim proves you control the GitHub repository. It does not move a token,
          and it is not GitPad saying an existing launch is official.
        </p>
        <div className="ownercards">
          <a className="ownercard" href="/claim" onClick={onNavClick('/claim')}>
            <span className="kicker">01 Claim</span>
            <strong>Prove the repo is yours</strong>
            <p>GitHub OAuth. Ownership only. No token transfer.</p>
            <span className="btn btn--lime">Claim repository</span>
          </a>
          <a className="ownercard" href="/treasury" onClick={onNavClick('/treasury')}>
            <span className="kicker">02 Treasury</span>
            <strong>Say where fees go</strong>
            <p>Register the wallet that should receive routed creator fees.</p>
            <span className="btn btn--ink">Set treasury</span>
          </a>
          <a className="ownercard" href="/docs" onClick={onNavClick('/docs')}>
            <span className="kicker">03 Rules</span>
            <strong>Read the fee path</strong>
            <p>Creator tax, claim, and what GitPad will never write for you.</p>
            <span className="btn btn--line">How this works</span>
          </a>
        </div>
        </Reveal>
      </section>
    </main>
  )
}
