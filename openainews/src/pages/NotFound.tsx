import { AppLink } from '../components/AppLink.tsx'
import { Footer } from '../components/Footer.tsx'
import { Masthead } from '../components/Masthead.tsx'

export function NotFound() {
  return (
    <div className="page">
      <Masthead />
      <main className="missing">
        <p className="kicker">404</p>
        <h1>This page could not be found.</h1>
        <p>The story may have moved, or the address may be incomplete.</p>
        <p>
          <AppLink href="/">Return to OpenAI News</AppLink>
        </p>
      </main>
      <Footer />
    </div>
  )
}
