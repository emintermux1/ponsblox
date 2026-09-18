import { Footer } from '../components/Footer.tsx'
import { Masthead } from '../components/Masthead.tsx'
import { StoryCard } from '../components/StoryCard.tsx'
import { sectionLabel, type SectionId } from '../routes.ts'
import { storiesForSection } from '../stories.ts'

export function SectionPage({ id }: { id: SectionId }) {
  const stories = storiesForSection(id)

  return (
    <div className="page">
      <Masthead active={id} />
      <main>
        <section className="band">
          <div className="band-head">
            <h1>{sectionLabel(id)}</h1>
          </div>
          {stories.length === 0 ? (
            <p className="empty">No stories in this section.</p>
          ) : (
            <div className="card-grid">
              {stories.map((story) => (
                <StoryCard key={story.id} story={story} />
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  )
}
