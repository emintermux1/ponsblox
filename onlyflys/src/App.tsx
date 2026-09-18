import { useEffect, useState, type ReactNode } from 'react'
import { AgeGate } from './components/AgeGate.tsx'
import { Nav } from './components/Nav.tsx'
import { SubscribeSheet } from './components/SubscribeSheet.tsx'
import { NavigateContext } from './nav.ts'
import { Discover } from './pages/Discover.tsx'
import { Home } from './pages/Home.tsx'
import { Live } from './pages/Live.tsx'
import { Messages } from './pages/Messages.tsx'
import { NotFound } from './pages/NotFound.tsx'
import { PostPage } from './pages/Post.tsx'
import { Profile } from './pages/Profile.tsx'
import { Search } from './pages/Search.tsx'
import { parseRoute, routeTitle, type Route } from './routes.ts'
import { useStoreTick } from './sim.ts'
import { hasEntered, isSubbed } from './store.ts'

function currentRoute(): Route {
  return parseRoute(window.location.pathname, window.location.search)
}

function renderRoute(route: Route, onSubscribe: (handle: string) => void): ReactNode {
  switch (route.type) {
    case 'home':
      return <Home onSubscribe={onSubscribe} />
    case 'discover':
      return <Discover />
    case 'search':
      return <Search q={route.q} onSubscribe={onSubscribe} />
    case 'messages':
      return <Messages handle={route.handle} onSubscribe={onSubscribe} />
    case 'live':
      return <Live handle={route.handle} onSubscribe={onSubscribe} />
    case 'profile':
      return <Profile handle={route.handle} onSubscribe={onSubscribe} />
    case 'post':
      return <PostPage id={route.id} onSubscribe={onSubscribe} />
    case 'notfound':
      return <NotFound />
    default: {
      const _never: never = route
      return _never
    }
  }
}

export default function App() {
  const [route, setRoute] = useState<Route>(currentRoute)
  const [open, setOpen] = useState<string | null>(null)
  const tick = useStoreTick()
  const inHive = hasEntered()

  useEffect(() => {
    function onPop() {
      setRoute(currentRoute())
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    document.title = routeTitle(route)
    const meta = document.querySelector('meta[property="og:title"]')
    if (meta) meta.setAttribute('content', document.title)
  }, [route])

  function navigate(href: string) {
    const url = new URL(href, window.location.origin)
    window.history.pushState({ href }, '', `${url.pathname}${url.search}`)
    setRoute(parseRoute(url.pathname, url.search))
    window.scrollTo(0, 0)
  }

  function onSubscribe(handle: string) {
    if (isSubbed(handle)) return
    setOpen(handle)
  }

  if (!inHive) return <AgeGate />

  return (
    <NavigateContext.Provider value={navigate}>
      <div className="shell">
        <Nav route={route} />
        <main className="main" data-tick={tick}>{renderRoute(route, onSubscribe)}</main>
      </div>
      {open ? <SubscribeSheet handle={open} onClose={() => setOpen(null)} /> : null}
    </NavigateContext.Provider>
  )
}
