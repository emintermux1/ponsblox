import { onNavClick } from '../lib/router.ts'

export function NotFound() {
  return (
    <main className="page">
      <p className="kicker">404</p>
      <h1>This path is not on SkinPad.</h1>
      <a className="btn btn--fire" href="/" onClick={onNavClick('/')}>Home</a>
    </main>
  )
}
