import { useState, type FormEvent } from 'react'
import { searchCreators } from '../creators.ts'
import { searchPosts } from '../posts.ts'
import { useNavigate } from '../nav.ts'
import { CreatorCard } from '../components/CreatorCard.tsx'
import { FeedCard } from '../components/FeedCard.tsx'

export function Search({ q, onSubscribe }: { q: string; onSubscribe: (handle: string) => void }) {
  const navigate = useNavigate()
  const [value, setValue] = useState(q)
  const flies = searchCreators(q)
  const posts = searchPosts(q)

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    const next = value.trim()
    navigate(next ? `/search?q=${encodeURIComponent(next)}` : '/search')
  }

  return (
    <div className="col">
      <header className="page-head">
        <p className="kicker">Search</p>
        <h1>Find a fly</h1>
      </header>
      <form className="search-box" onSubmit={onSubmit}>
        <input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="musca, peach, grate…"
          aria-label="Search OnlyFlys"
        />
        <button type="submit" className="btn btn-blue">
          Search
        </button>
      </form>
      {!q ? (
        <p className="muted">Try peach, grate, bulb, swarm.</p>
      ) : flies.length === 0 && posts.length === 0 ? (
        <p className="empty">No flies match that. The bin is picky.</p>
      ) : (
        <>
          {flies.length ? (
            <section>
              <h2 className="sec-title">Creators</h2>
              <div className="creator-grid">
                {flies.map((who) => (
                  <CreatorCard key={who.handle} who={who} />
                ))}
              </div>
            </section>
          ) : null}
          {posts.length ? (
            <section className="feed">
              <h2 className="sec-title">Scenes</h2>
              {posts.map((post) => (
                <FeedCard key={post.id} post={post} onSubscribe={onSubscribe} />
              ))}
            </section>
          ) : null}
        </>
      )}
    </div>
  )
}
