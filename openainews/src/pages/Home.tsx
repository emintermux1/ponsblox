import { AppLink } from '../components/AppLink.tsx'
import { Footer } from '../components/Footer.tsx'
import { Masthead } from '../components/Masthead.tsx'
import { LeadStory, StoryCard } from '../components/StoryCard.tsx'
import { FEATURE_STORY, otherHomeStories } from '../stories.ts'

export function Home() {
  const rest = otherHomeStories()

  return (
    <div className="page">
      <Masthead active="home" />
      <main>
        <section className="hero" aria-labelledby="lead-hed">
          <LeadStory story={FEATURE_STORY} />
          <AppLink href={FEATURE_STORY.href} className="hero-lockup-link">
            <figure className="hero-lockup">
              <img src="/gpt-6-1-alpha.png" alt="GPT-6.1 ALPHA" />
            </figure>
          </AppLink>
        </section>
        <section className="band" aria-labelledby="index-hed">
          <div className="band-head">
            <h2 id="index-hed">From OpenAI</h2>
            <p>Official pages, dates and headlines as published.</p>
          </div>
          <div className="card-grid">
            {rest.map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
