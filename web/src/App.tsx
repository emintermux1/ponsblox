import { useEffect } from 'react'
import { WalletProvider } from './lib/wallet.tsx'
import { bouncePaths, playUrl } from './lib/play.ts'
import { useRoute } from './lib/router.ts'
import { Play } from './pages/Play.tsx'
import { Sign } from './pages/Sign.tsx'

function Shell() {
  const route = useRoute()

  useEffect(() => {
    if (bouncePaths(location.pathname)) window.location.replace(playUrl())
  }, [])

  switch (route.name) {
    case 'home':
      return <Play />
    case 'sign':
      return (
        <WalletProvider>
          <Sign code={route.code} />
        </WalletProvider>
      )
    default: {
      const _e: never = route
      return _e
    }
  }
}

export default function App() {
  return <Shell />
}
