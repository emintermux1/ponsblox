import { Footer } from '../components/Footer.tsx'
import { Masthead } from '../components/Masthead.tsx'
import { LeadStory, StoryCard } from '../components/StoryCard.tsx'
import { sectionLabel, type SectionId } from '../routes.ts'
import { storiesForSection } from '../stories.ts'

export function SectionPage({ id }: { id: SectionId }) {
  const stories = storiesForSection(id)
  const lead = stories[0]
  const rest = stories.slice(1)

  return (
    <div className="page">
      <Masthead active={id} />
      <main>
        <section className="band">
          <div className="band-head">
            <h1>{sectionLabel(id)}</h1>
          </div>
          {lead ? (
            lead.kind === 'feature' && lead.image ? (
              <LeadStory story={lead} />
            ) : (
              <StoryCard story={lead} />
            )
          ) : (
            <p className="empty">No stories in this section.</p>
          )}
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
