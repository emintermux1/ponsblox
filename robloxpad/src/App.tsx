import { lazy, Suspense } from 'react'
import { DocumentMeta } from './components/DocumentMeta.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { Footer } from './components/Footer.tsx'
import { Nav } from './components/Nav.tsx'
import { useRoute } from './lib/router.ts'
import { WalletProvider } from './lib/wallet.tsx'
import { Home } from './pages/Home.tsx'

const Games = lazy(() => import('./pages/Games.tsx').then((m) => ({ default: m.Games })))
const Markets = lazy(() => import('./pages/Markets.tsx').then((m) => ({ default: m.Markets })))
const Launch = lazy(() => import('./pages/Launch.tsx').then((m) => ({ default: m.Launch })))
const TokenPage = lazy(() => import('./pages/Token.tsx').then((m) => ({ default: m.TokenPage })))
const GamePage = lazy(() => import('./pages/Game.tsx').then((m) => ({ default: m.GamePage })))
const Docs = lazy(() => import('./pages/Docs.tsx').then((m) => ({ default: m.Docs })))
const Fees = lazy(() => import('./pages/Fees.tsx').then((m) => ({ default: m.Fees })))
const NotFound = lazy(() => import('./pages/NotFound.tsx').then((m) => ({ default: m.NotFound })))

function Shell() {
  const route = useRoute()
  let page
  switch (route.name) {
    case 'home':
      page = <Home />
      break
    case 'games':
      page = <Games q={route.q} sort={route.sort} genre={route.genre} />
      break
    case 'markets':
      page = <Markets q={route.q} />
      break
    case 'launch':
      page = <Launch gameId={route.game} />
      break
    case 'token':
      page = <TokenPage address={route.address} />
      break
    case 'game':
      page = <GamePage id={route.id} />
      break
    case 'docs':
      page = <Docs />
      break
    case 'fees':
      page = <Fees address={route.address} />
      break
    case 'notFound':
      page = <NotFound />
      break
    default: {
      const _e: never = route
      page = _e
    }
  }
  const studio = route.name === 'launch'
  return (
    <div className={studio ? 'app app--studio' : 'app'}>
      <DocumentMeta route={route} />
      <a className="skip" href="#main">Skip to content</a>
      {!studio && <Nav />}
      <div id="main">
        <Suspense fallback={<main className="page"><p className="muted">Loading…</p></main>}>{page}</Suspense>
      </div>
      {!studio && <Footer />}
    </div>
  )
}

export default function App() {
  return (
    <WalletProvider>
      <ErrorBoundary>
        <Shell />
      </ErrorBoundary>
    </WalletProvider>
  )
}
