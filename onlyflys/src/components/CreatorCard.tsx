import { formatCount, type Creator } from '../creators.ts'
import { isSubbed } from '../store.ts'
import { FlyScene } from '../FlyScene.tsx'
import { AppLink } from './AppLink.tsx'

export function CreatorCard({ who }: { who: Creator }) {
  const sub = isSubbed(who.handle)

  return (
    <article className="creator-card">
      <AppLink href={`/c/${who.handle}`} className="creator-art">
        <FlyScene kind={who.scene} seed={who.handle} />
        {who.live ? <span className="live-pill">LIVE</span> : null}
      </AppLink>
      <div className="creator-meta">
        <div className="avatar-sm">
          <FlyScene kind={who.scene} seed={`${who.handle}-av`} detail="avatar" />
        </div>
        <div>
          <AppLink href={`/c/${who.handle}`} className="name">
            {who.name}
          </AppLink>
          <p className="muted">@{who.handle} · {formatCount(who.likes)} likes</p>
        </div>
      </div>
      <p className="creator-tag">{who.tag}</p>
      <AppLink href={`/c/${who.handle}`} className={sub ? 'btn btn-ghost' : 'btn btn-blue'}>
        {sub ? 'Subscribed' : `Subscribe · $${who.price}`}
      </AppLink>
    </article>
  )
}
