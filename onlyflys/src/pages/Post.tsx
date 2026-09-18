import { creatorByHandle, formatCount } from '../creators.ts'
import { postById, timeAgo } from '../posts.ts'
import { isLiked, isSubbed, toggleLike } from '../store.ts'
import { FlyScene } from '../FlyScene.tsx'
import { AppLink } from '../components/AppLink.tsx'
import { NotFound } from './NotFound.tsx'

export function PostPage({
  id,
  onSubscribe,
}: {
  id: string
  onSubscribe: (handle: string) => void
}) {
  const post = postById(id)
  if (!post) return <NotFound />
  const who = creatorByHandle(post.handle)
  if (!who) return <NotFound />

  const unlocked = !post.locked || isSubbed(who.handle)
  const liked = isLiked(post.id)

  return (
    <div className="col">
      <article className="post-page">
        <div className="post-stage">
          {unlocked ? (
            <FlyScene kind={post.kind} seed={post.id} detail="player" />
          ) : (
            <>
              <FlyScene kind={post.kind} seed={post.id} />
              <span className="lock">
                <strong>Locked scene</strong>
                <button type="button" className="btn btn-blue" onClick={() => onSubscribe(who.handle)}>
                  Subscribe · ${who.price}
                </button>
              </span>
            </>
          )}
        </div>
        <div className="post-copy">
          <AppLink href={`/c/${who.handle}`} className="name">
            {who.name}
          </AppLink>
          <p className="muted">@{who.handle} · {timeAgo(post.minutesAgo)}</p>
          <p className="caption">{post.caption}</p>
          <footer className="feed-bar">
            <button type="button" className={liked ? 'on' : ''} onClick={() => toggleLike(post.id)}>
              {liked ? 'Liked' : 'Like'} · {formatCount(post.likes + (liked ? 1 : 0))}
            </button>
            <AppLink href={`/messages/${who.handle}`}>Message / tip</AppLink>
          </footer>
        </div>
      </article>
    </div>
  )
}
