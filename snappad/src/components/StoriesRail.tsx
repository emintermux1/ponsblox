import { Link } from 'react-router-dom'
import { liveStories } from '../lib/markets.ts'
import { isViewed } from '../lib/viewed.ts'

export function StoriesRail() {
  const stories = liveStories()

  return (
    <section className="stories" aria-label="Live snaps">
      <Link to="/launch" className="story story--you">
        <span className="story__ring">
          <img src="/brand/ghost.png" alt="" width={62} height={62} fetchPriority="high" onError={(e) => { e.currentTarget.src = '/brand/mark.svg' }} />
        </span>
        <b>Your Snap</b>
      </Link>
      {stories.map((p, i) => (
        <Link key={p.id} to={`/s/${p.id}`} className={`story ${isViewed(p.id) ? 'story--seen' : ''}`}>
          <span className="story__ring">
            <img
              src={p.avatar || p.image}
              alt=""
              loading={i < 8 ? 'eager' : 'lazy'}
              decoding="async"
              onError={(e) => { e.currentTarget.src = p.image || '/brand/ghost.png' }}
            />
          </span>
          <b>{p.account.replace('@', '')}</b>
        </Link>
      ))}
    </section>
  )
}
