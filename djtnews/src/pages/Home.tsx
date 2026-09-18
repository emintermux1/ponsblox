import { Footer } from '../components/Footer.tsx'
import { Masthead } from '../components/Masthead.tsx'
import { LeadStory, StoryCard } from '../components/StoryCard.tsx'
import { AppLink } from '../components/AppLink.tsx'
import { sectionHref, sectionLabel, type SectionId } from '../routes.ts'
import { FEATURE_STORY, originalStories, otherHomeStories, storiesForSection } from '../stories.ts'

const RAILS: SectionId[] = ['politics', 'markets', 'white-house']

export function Home() {
  const originals = originalStories()
  const rest = otherHomeStories().filter((story) => story.kind !== 'feature')
  const top = rest.slice(0, 4)
  const more = rest.slice(4)

  return (
    <div className="page">
      <Masthead active="home" />
      <main>
        <section className="band" aria-labelledby="top-hed">
          <div className="band-head">
            <h1 id="top-hed">Top Stories</h1>
          </div>
          <div className="lead-grid">
            <LeadStory story={FEATURE_STORY} />
            <div className="lead-side">
              {top.map((story) => (
                <StoryCard key={story.id} story={story} size="compact" />
              ))}
            </div>
          </div>
        </section>

        <section className="band" aria-labelledby="desk-hed">
          <div className="band-head">
            <h2 id="desk-hed">From the newsroom</h2>
          </div>
          <div className="card-grid">
            {originals.map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
          </div>
        </section>

        <section className="band" aria-labelledby="more-hed">
          <div className="band-head">
            <h2 id="more-hed">Also this week</h2>
          </div>
          <div className="card-grid">
            {more.map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
          </div>
        </section>

        {RAILS.map((id) => (
          <section className="band rail" key={id} aria-labelledby={`rail-${id}`}>
            <div className="band-head">
              <h2 id={`rail-${id}`}>{sectionLabel(id)}</h2>
              <AppLink href={sectionHref(id)} className="band-more">
                All {sectionLabel(id)}
              </AppLink>
            </div>
            <div className="card-grid card-grid-3">
              {storiesForSection(id)
                .filter((story) => story.id !== FEATURE_STORY.id)
                .slice(0, 3)
                .map((story) => (
                  <StoryCard key={story.id} story={story} size="compact" />
                ))}
            </div>
          </section>
        ))}
      </main>
      <Footer />
    </div>
  )
}
