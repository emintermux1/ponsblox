import { useEffect, useState, type ReactNode } from 'react'
import { NavigateContext } from './nav.ts'
import { ArticlePage } from './pages/ArticlePage.tsx'
import { Home } from './pages/Home.tsx'
import { NotFound } from './pages/NotFound.tsx'
import { SectionPage } from './pages/SectionPage.tsx'
import { parseRoute, routeTitle, type Route } from './routes.ts'

function renderRoute(route: Route): ReactNode {
  switch (route.type) {
    case 'home':
      return <Home />
    case 'section':
      return <SectionPage id={route.id} />
    case 'article':
      return <ArticlePage id={route.id} />
    case 'notfound':
      return <NotFound />
    default: {
      const _never: never = route
      return _never
    }
  }
}

export default function App() {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.pathname))

  useEffect(() => {
    function onPop() {
      setRoute(parseRoute(window.location.pathname))
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
    const next = parseRoute(href)
    window.history.pushState({ href }, '', href)
    setRoute(next)
    window.scrollTo(0, 0)
  }

  return <NavigateContext.Provider value={navigate}>{renderRoute(route)}</NavigateContext.Provider>
}
