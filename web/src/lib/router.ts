import { useEffect, useState, type MouseEvent } from 'react'

export type Route =
  | { name: 'home' }
  | { name: 'sign'; code: string }

export function parsePath(pathname: string): Route {
  const p = pathname.replace(/\/+$/, '') || '/'
  if (p.startsWith('/sign/')) {
    const code = (p.slice('/sign/'.length).split('/')[0] ?? '').toUpperCase()
    if (code) return { name: 'sign', code }
  }
  return { name: 'home' }
}

export function navigate(to: string) {
  if (to !== location.pathname) {
    history.pushState({}, '', to)
    window.dispatchEvent(new PopStateEvent('popstate'))
    window.scrollTo(0, 0)
  }
}

export function onNavClick(to: string) {
  return (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    navigate(to)
  }
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parsePath(location.pathname))
  useEffect(() => {
    const on = () => setRoute(parsePath(location.pathname))
    window.addEventListener('popstate', on)
    return () => window.removeEventListener('popstate', on)
  }, [])
  return route
}
