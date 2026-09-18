import { featuredCreators, liveCreators } from '../creators.ts'
import { feedPosts } from '../posts.ts'
import { PRODUCT, TAGLINE } from '../lore.ts'
import { FlyScene } from '../FlyScene.tsx'
import { AppLink } from '../components/AppLink.tsx'
import { FeedCard } from '../components/FeedCard.tsx'
import { OfficialCa } from '../components/OfficialCa.tsx'

export function Home({ onSubscribe }: { onSubscribe: (handle: string) => void }) {
  const live = liveCreators()
  const featured = featuredCreators()
  const feed = feedPosts()

  return (
    <div className="col">
      <section className="hero">
        <img src="/hero.jpg" alt="Two house flies and the OnlyFlys mark" />
        <div className="hero-copy">
          <p className="kicker">{PRODUCT}</p>
          <h1>{TAGLINE}</h1>
          <p>Subscribe to house flies. Watch the porch, the grate, the fruit bowl. Insect-on-insect. Not people.</p>
          <div className="hero-row">
            <AppLink href="/discover" className="btn btn-blue">
              Discover flies
            </AppLink>
            <AppLink href="/live" className="btn btn-ghost">
              Go live
            </AppLink>
          </div>
        </div>
      </section>

      <OfficialCa />

      <section className="rail">
        <header className="sec">
          <h2>Live now</h2>
          <AppLink href="/live">See all</AppLink>
        </header>
        <div className="story-row">
          {live.map((who) => (
            <AppLink key={who.handle} href={`/live/${who.handle}`} className="story">
              <span className="avatar-lg">
                <FlyScene kind={who.scene} seed={`${who.handle}-av`} detail="avatar" />
              </span>
              <em>{who.name}</em>
            </AppLink>
          ))}
        </div>
      </section>

      <section className="rail">
        <header className="sec">
          <h2>Creators</h2>
          <AppLink href="/discover">Grid</AppLink>
        </header>
        <div className="chip-row">
          {featured.map((who) => (
            <AppLink key={who.handle} href={`/c/${who.handle}`} className="chip">
              @{who.handle}
            </AppLink>
          ))}
        </div>
      </section>

      <section className="feed">
        {feed.map((post) => (
          <FeedCard key={post.id} post={post} onSubscribe={onSubscribe} />
        ))}
      </section>
    </div>
  )
}
