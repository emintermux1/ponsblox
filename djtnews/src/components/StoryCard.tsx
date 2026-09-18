import { AppLink } from './AppLink.tsx'
import { GainsHero } from './GainsHero.tsx'
import type { Story } from '../stories.ts'

function StoryMedia({ story, className }: { story: Story; className: string }) {
  if (story.id === 'trump-unveils-gains-index') {
    return (
      <AppLink href={story.href} className={className}>
        <GainsHero variant="card" />
      </AppLink>
    )
  }
  if (!story.image) return null
  return (
    <AppLink href={story.href} className={className}>
      <img src={story.image.src} alt={story.image.alt} />
    </AppLink>
  )
}

export function StoryCard({ story, size = 'std' }: { story: Story; size?: 'std' | 'compact' }) {
  return (
    <article className={size === 'compact' ? 'card card-compact' : 'card'}>
      {size !== 'compact' && (story.id === 'trump-unveils-gains-index' || story.image) ? (
        <StoryMedia story={story} className="card-media" />
      ) : null}
      <div className="card-body">
        <p className="kicker">{story.kicker}</p>
        <h3 className="card-hed">
          <AppLink href={story.href}>{story.headline}</AppLink>
        </h3>
        <p className="card-dek">{story.dek}</p>
        <p className="card-meta">
          <time dateTime={story.datetime}>{story.dateLabel}</time>
          <span aria-hidden="true"> · </span>
          {story.external ? (
            <AppLink href={story.href} className="source-link">
              {story.source}
            </AppLink>
          ) : (
            <span>{story.byline ? `${story.byline}` : story.source}</span>
          )}
        </p>
      </div>
    </article>
  )
}

export function LeadStory({ story }: { story: Story }) {
  return (
    <article className="lead">
      {story.id === 'trump-unveils-gains-index' || story.image ? (
        <StoryMedia story={story} className="lead-media" />
      ) : null}
      <div className="lead-body">
        <p className="kicker">{story.kicker}</p>
        <h2 className="lead-hed">
          <AppLink href={story.href}>{story.headline}</AppLink>
        </h2>
        <p className="lead-dek">{story.dek}</p>
        <p className="card-meta">
          {story.byline ? <span>{story.byline}</span> : null}
          {story.byline ? <span aria-hidden="true"> · </span> : null}
          <time dateTime={story.datetime}>{story.dateLabel}</time>
          <span aria-hidden="true"> · </span>
          <span>{story.source}</span>
        </p>
      </div>
    </article>
  )
}
