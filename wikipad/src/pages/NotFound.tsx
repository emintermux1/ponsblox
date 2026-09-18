import { hrefFor, onNav } from '../lib/router.ts'

export function NotFound() {
  const home = hrefFor({ name: 'home' })
  return (
    <main className="article">
      <h1 className="firstHeading">Page not found</h1>
      <p>There is no WikiPad page at this address.</p>
      <p>
        <a href={home} onClick={(e) => onNav(e, home)}>Return to the main page</a>
      </p>
    </main>
  )
}
