import { creatorByHandle, formatCount } from '../creators.ts'
import { timeAgo, type Post } from '../posts.ts'
import { isLiked, isSubbed, toggleLike } from '../store.ts'
import { FlyScene } from '../FlyScene.tsx'
import { AppLink } from './AppLink.tsx'

export function FeedCard({
  post,
  onSubscribe,
}: {
  post: Post
  onSubscribe: (handle: string) => void
}) {
  const who = creatorByHandle(post.handle)
  if (!who) return null
  const unlocked = !post.locked || isSubbed(post.handle)
  const liked = isLiked(post.id)

  return (
    <article className="feed-card">
      <header className="feed-head">
        <AppLink href={`/c/${who.handle}`} className="avatar-sm" ariaLabel={who.name}>
          <FlyScene kind={who.scene} seed={`${who.handle}-av`} detail="avatar" />
        </AppLink>
        <div>
          <AppLink href={`/c/${who.handle}`} className="name">
            {who.name}
          </AppLink>
          <p className="muted">@{who.handle} · {timeAgo(post.minutesAgo)}</p>
        </div>
        <button
          type="button"
          className={isSubbed(who.handle) ? 'chip' : 'chip chip-blue'}
          onClick={() => onSubscribe(who.handle)}
        >
          {isSubbed(who.handle) ? 'Subscribed' : 'Subscribe'}
        </button>
      </header>

      <AppLink href={`/p/${post.id}`} className="feed-art">
        <FlyScene kind={post.kind} seed={post.id} />
        {who.live && post.minutesAgo < 60 ? <span className="live-pill">LIVE</span> : null}
        {!unlocked ? (
          <span className="lock">
            <strong>Locked scene</strong>
            <em>Subscribe to @{who.handle}</em>
          </span>
        ) : null}
      </AppLink>

      <p className="caption">{post.caption}</p>
      <footer className="feed-bar">
        <button type="button" className={liked ? 'on' : ''} onClick={() => toggleLike(post.id)}>
          {liked ? 'Liked' : 'Like'} · {formatCount(post.likes + (liked ? 1 : 0))}
        </button>
        <AppLink href={`/p/${post.id}`}>Comments · {formatCount(post.comments)}</AppLink>
        <AppLink href={`/messages/${who.handle}`}>Tip</AppLink>
      </footer>
    </article>
  )
}
