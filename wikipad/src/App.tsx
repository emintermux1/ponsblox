import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { Layout } from './components/Layout.tsx'
import { useRoute } from './lib/router.ts'
import { WalletProvider } from './lib/wallet.tsx'
import { Home } from './pages/Home.tsx'
import { Knowledge } from './pages/Knowledge.tsx'
import { Launch } from './pages/Launch.tsx'
import { Launched } from './pages/Launched.tsx'
import { NotFound } from './pages/NotFound.tsx'
import { Topic } from './pages/Topic.tsx'

function Shell() {
  const route = useRoute()
  let page
  switch (route.name) {
    case 'home':
      page = <Home />
      break
    case 'topic':
      page = <Topic title={route.title} />
      break
    case 'launch':
      page = <Launch title={route.title} />
      break
    case 'markets':
      page = <Launched />
      break
    case 'launched':
      page = <Launched />
      break
    case 'knowledge':
      page = <Knowledge />
      break
    case 'recent':
      page = <Launched />
      break
    case 'notFound':
      page = <NotFound />
      break
    default: {
      const _e: never = route
      page = _e
    }
  }
  return <Layout route={route}>{page}</Layout>
}

export default function App() {
  return (
    <ErrorBoundary>
      <WalletProvider>
        <Shell />
      </WalletProvider>
    </ErrorBoundary>
  )
}
