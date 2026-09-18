import { onNavClick } from '../lib/router.ts'

export function NotFound() {
  return (
    <main className="paper paper--page">
      <p className="kicker">404</p>
      <h1>This path is not on GitPad.</h1>
      <p className="lede">No token, repository, or studio lives here.</p>
      <div className="hero__cta">
        <a className="btn btn--lime" href="/" onClick={onNavClick('/')}>Home</a>
        <a className="btn btn--paper" href="/explore" onClick={onNavClick('/explore')}>Explore</a>
        <a className="btn btn--ghost" href="/launch" onClick={onNavClick('/launch')}>Launch</a>
      </div>
    </main>
  )
}
