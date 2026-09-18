import { AppLink } from './AppLink.tsx'
import type { Story } from '../stories.ts'

export function StoryCard({ story }: { story: Story }) {
  return (
    <article className="card">
      <p className="kicker">
        {story.kicker}
        <span className="kicker-dot" aria-hidden="true">
          ·
        </span>
        <time dateTime={story.datetime}>{story.dateLabel}</time>
      </p>
      <h3 className="card-hed">
        <AppLink href={story.href}>{story.headline}</AppLink>
      </h3>
      <p className="card-dek">{story.dek}</p>
      <p className="card-meta">
        {story.external ? (
          <AppLink href={story.href} className="source-link">
            {story.source}
          </AppLink>
        ) : (
          <span>{story.source}</span>
        )}
      </p>
    </article>
  )
}

export function LeadStory({ story }: { story: Story }) {
  return (
    <article className="lead">
      <p className="kicker">
        {story.kicker}
        <span className="kicker-dot" aria-hidden="true">
          ·
        </span>
        <time dateTime={story.datetime}>{story.dateLabel}</time>
      </p>
      <h2 className="lead-hed">
        <AppLink href={story.href}>{story.headline}</AppLink>
      </h2>
      <p className="lead-dek">{story.dek}</p>
    </article>
  )
}
