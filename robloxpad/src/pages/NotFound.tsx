import { onNavClick } from '../lib/router.ts'

export function NotFound() {
  return (
    <main className="page">
      <p className="kicker">404</p>
      <h1>This path is not on RobloxPad.</h1>
      <p className="lede">Open the board, or launch from a Roblox URL.</p>
      <div className="row">
        <a className="btn btn--fire" href="/" onClick={onNavClick('/')}>Home</a>
        <a className="btn btn--ghost" href="/games" onClick={onNavClick('/games')}>Browse games</a>
      </div>
    </main>
  )
}
