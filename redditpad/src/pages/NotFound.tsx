import { Link } from 'react-router-dom'
import { usePageTitle } from '../lib/title.ts'

export function NotFound() {
  usePageTitle('this thread was removed — redditpad')
  return (
    <main className="shell">
      <div className="shell__main">
        <article className="thread">
          <div className="thread__main">
            <h1>this thread was removed</h1>
            <p>No pair lives at this URL. The catalog is still up.</p>
            <div className="comm__cta">
              <Link className="btn btn--accent" to="/explore">Explore</Link>
              <Link className="btn" to="/">Home</Link>
            </div>
          </div>
        </article>
      </div>
    </main>
  )
}
