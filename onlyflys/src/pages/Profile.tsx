import { useState } from 'react'
import { creatorByHandle, formatCount } from '../creators.ts'
import { postsFor } from '../posts.ts'
import { isSubbed } from '../store.ts'
import { FlyScene } from '../FlyScene.tsx'
import { AppLink } from '../components/AppLink.tsx'
import { FeedCard } from '../components/FeedCard.tsx'
import { NotFound } from './NotFound.tsx'

export function Profile({
  handle,
  onSubscribe,
}: {
  handle: string
  onSubscribe: (handle: string) => void
}) {
  const who = creatorByHandle(handle)
  const [tab, setTab] = useState<'posts' | 'media' | 'live'>('posts')
  if (!who) return <NotFound />

  const posts = postsFor(who.handle)
  const sub = isSubbed(who.handle)

  return (
    <div className="col">
      <div className="cover">
        <FlyScene kind={who.scene} seed={`${who.handle}-cover`} detail="player" />
      </div>
      <section className="profile">
        <div className="avatar-xl">
          <FlyScene kind={who.scene} seed={`${who.handle}-av`} detail="avatar" />
        </div>
        <h1>{who.name}</h1>
        <p className="muted">@{who.handle} · {who.tag}</p>
        <p className="bio">{who.bio}</p>
        <ul className="stats">
          <li><strong>{formatCount(who.likes)}</strong> likes</li>
          <li><strong>{who.photos}</strong> photos</li>
          <li><strong>{who.videos}</strong> videos</li>
        </ul>
        <div className="hero-row">
          <button type="button" className={sub ? 'btn btn-ghost' : 'btn btn-blue'} onClick={() => onSubscribe(who.handle)}>
            {sub ? 'Subscribed' : `Subscribe · $${who.price}`}
          </button>
          <AppLink href={`/messages/${who.handle}`} className="btn btn-ghost">
            Message
          </AppLink>
          {who.live ? (
            <AppLink href={`/live/${who.handle}`} className="btn btn-ghost">
              Live
            </AppLink>
          ) : null}
        </div>
      </section>
      <div className="tabs">
        <button type="button" className={tab === 'posts' ? 'on' : ''} onClick={() => setTab('posts')}>
          Posts
        </button>
        <button type="button" className={tab === 'media' ? 'on' : ''} onClick={() => setTab('media')}>
          Media
        </button>
        <button type="button" className={tab === 'live' ? 'on' : ''} onClick={() => setTab('live')}>
          Live
        </button>
      </div>
      {tab === 'live' ? (
        <section className="live-box">
          {who.live ? (
            <AppLink href={`/live/${who.handle}`} className="live-link">
              <FlyScene kind={who.scene} seed={`${who.handle}-live`} detail="player" />
              <span className="live-pill">LIVE</span>
            </AppLink>
          ) : (
            <p className="muted">@{who.handle} is off the bulb. Check posts.</p>
          )}
        </section>
      ) : tab === 'media' ? (
        <div className="media-grid">
          {posts.map((post) => (
            <AppLink key={post.id} href={`/p/${post.id}`} className="media-cell">
              <FlyScene kind={post.kind} seed={post.id} />
              {post.locked && !sub ? <span className="mini-lock">Locked</span> : null}
            </AppLink>
          ))}
        </div>
      ) : (
        <section className="feed">
          {posts.map((post) => (
            <FeedCard key={post.id} post={post} onSubscribe={onSubscribe} />
          ))}
        </section>
      )}
    </div>
  )
}
