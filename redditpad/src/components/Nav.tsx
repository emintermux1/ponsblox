import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Connect } from './Connect.tsx'
import { OfficialCa } from './OfficialCa.tsx'
import { XLink } from './XLink.tsx'

export function Nav() {
  const [q, setQ] = useState('')
  const nav = useNavigate()

  return (
    <header className="nav">
      <div className="nav__inner">
        <Link to="/" className="brand" aria-label="redditpad home">
          <img src="/brand/redditpad-mark.jpg" alt="" className="brand__mark" />
          <span className="brand__word">redditpad</span>
        </Link>
        <form
          className="nav__search"
          onSubmit={(e) => {
            e.preventDefault()
            nav(`/explore?q=${encodeURIComponent(q.trim())}`)
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search communities, tickers or Reddit posts"
            aria-label="Search communities, tickers or Reddit posts"
          />
        </form>
        <nav className="nav__links" aria-label="Primary">
          <NavLink to="/explore">Explore</NavLink>
          <NavLink to="/launch">Launch</NavLink>
          <NavLink to="/trending">Trending</NavLink>
          <NavLink to="/graduated">Graduated</NavLink>
          <XLink />
        </nav>
        <div className="nav__end">
          <OfficialCa variant="chip" />
          <Connect compact />
        </div>
      </div>
      <nav className="nav__mobile" aria-label="Mobile">
        <NavLink to="/explore">Explore</NavLink>
        <NavLink to="/launch">Launch</NavLink>
        <NavLink to="/trending">Trending</NavLink>
        <NavLink to="/graduated">Graduated</NavLink>
        <XLink compact />
      </nav>
    </header>
  )
}
