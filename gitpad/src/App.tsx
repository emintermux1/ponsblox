import { lazy, Suspense } from 'react'
import { CommandPalette } from './components/CommandPalette.tsx'
import { DocumentMeta } from './components/DocumentMeta.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { Footer } from './components/Footer.tsx'
import { Nav } from './components/Nav.tsx'
import { useRoute } from './lib/router.ts'
import { WalletProvider } from './lib/wallet.tsx'
import { Home } from './pages/Home.tsx'

const Activity = lazy(() => import('./pages/Activity.tsx').then((m) => ({ default: m.Activity })))
const Admin = lazy(() => import('./pages/Admin.tsx').then((m) => ({ default: m.Admin })))
const Claim = lazy(() => import('./pages/Claim.tsx').then((m) => ({ default: m.Claim })))
const Docs = lazy(() => import('./pages/Docs.tsx').then((m) => ({ default: m.Docs })))
const Explore = lazy(() => import('./pages/Explore.tsx').then((m) => ({ default: m.Explore })))
const Fees = lazy(() => import('./pages/Fees.tsx').then((m) => ({ default: m.Fees })))
const Launch = lazy(() => import('./pages/Launch.tsx').then((m) => ({ default: m.Launch })))
const Repo = lazy(() => import('./pages/Repo.tsx').then((m) => ({ default: m.Repo })))
const TokenByAddress = lazy(() => import('./pages/Token.tsx').then((m) => ({ default: m.TokenByAddress })))
const TokenByRepo = lazy(() => import('./pages/Token.tsx').then((m) => ({ default: m.TokenByRepo })))
const Treasury = lazy(() => import('./pages/Treasury.tsx').then((m) => ({ default: m.Treasury })))
const Watch = lazy(() => import('./pages/Watch.tsx').then((m) => ({ default: m.Watch })))
const First = lazy(() => import('./pages/First.tsx').then((m) => ({ default: m.First })))
const Board = lazy(() => import('./pages/Board.tsx').then((m) => ({ default: m.Board })))
const TokenizedMap = lazy(() => import('./pages/Map.tsx').then((m) => ({ default: m.TokenizedMap })))
const Daily = lazy(() => import('./pages/Daily.tsx').then((m) => ({ default: m.Daily })))
const Launches = lazy(() => import('./pages/Launches.tsx').then((m) => ({ default: m.Launches })))
const NotFound = lazy(() => import('./pages/NotFound.tsx').then((m) => ({ default: m.NotFound })))

function Shell() {
  const route = useRoute()
  let page
  switch (route.name) {
    case 'home':
      page = <Home />
      break
    case 'explore':
      page = <Explore sort={route.sort} q={route.q} />
      break
    case 'repo':
      page = <Repo owner={route.owner} repo={route.repo} />
      break
    case 'launch':
      page = <Launch owner={route.owner} repo={route.repo} mode={route.mode} />
      break
    case 'fees':
      page = <Fees address={route.address} />
      break
    case 'token':
      page = <TokenByAddress address={route.address} />
      break
    case 'repoToken':
      page = <TokenByRepo owner={route.owner} repo={route.repo} />
      break
    case 'docs':
      page = <Docs />
      break
    case 'activity':
      page = <Activity />
      break
    case 'watch':
      page = <Watch />
      break
    case 'claim':
      page = <Claim owner={route.owner} repo={route.repo} code={route.code} />
      break
    case 'treasury':
      page = <Treasury owner={route.owner} repo={route.repo} />
      break
    case 'admin':
      page = <Admin />
      break
    case 'first':
      page = <First />
      break
    case 'board':
      page = <Board />
      break
    case 'map':
      page = <TokenizedMap />
      break
    case 'daily':
      page = <Daily />
      break
    case 'launches':
      page = <Launches />
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
        <Suspense fallback={<main className="paper paper--page"><p className="muted">Loading…</p></main>}>{page}</Suspense>
      </div>
      {!studio && <Footer />}
      <CommandPalette />
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
