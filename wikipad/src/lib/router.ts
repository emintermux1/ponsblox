import { useEffect, useState, type MouseEvent } from 'react'
import { wikiPathTitle } from './metadata.ts'

export type Route =
  | { name: 'home' }
  | { name: 'topic'; title: string }
  | { name: 'launch'; title: string | null }
  | { name: 'markets' }
  | { name: 'launched' }
  | { name: 'knowledge' }
  | { name: 'recent' }
  | { name: 'notFound' }

export function parseLocation(pathname: string): Route {
  const p = pathname.replace(/\/+$/, '') || '/'
  if (p === '/') return { name: 'home' }
  if (p === '/launch') return { name: 'launch', title: null }
  if (p === '/markets') return { name: 'markets' }
  if (p === '/launched') return { name: 'launched' }
  if (p === '/knowledge') return { name: 'knowledge' }
  if (p === '/recent') return { name: 'recent' }
  if (p.startsWith('/launch/')) {
    const title = decodeURIComponent(p.slice('/launch/'.length))
    return title ? { name: 'launch', title } : { name: 'launch', title: null }
  }
  if (p.startsWith('/wiki/')) {
    const title = decodeURIComponent(p.slice('/wiki/'.length))
    return title ? { name: 'topic', title } : { name: 'notFound' }
  }
  if (p.startsWith('/page/')) {
    const title = decodeURIComponent(p.slice('/page/'.length))
    return title ? { name: 'topic', title } : { name: 'notFound' }
  }
  return { name: 'notFound' }
}

export function hrefFor(route: Route): string {
  switch (route.name) {
    case 'home':
      return '/'
    case 'topic':
      return `/wiki/${encodeURIComponent(wikiPathTitle(route.title))}`
    case 'launch':
      return route.title ? `/launch/${encodeURIComponent(wikiPathTitle(route.title))}` : '/launch'
    case 'markets':
      return '/markets'
    case 'launched':
      return '/launched'
    case 'knowledge':
      return '/knowledge'
    case 'recent':
      return '/recent'
    case 'notFound':
      return '/404'
    default: {
      const _e: never = route
      return _e
    }
  }
}

export function navigate(to: string) {
  if (window.location.pathname === to) return
  window.history.pushState({}, '', to)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function onNav(e: MouseEvent<HTMLAnchorElement>, to: string) {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
  e.preventDefault()
  navigate(to)
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseLocation(window.location.pathname))
  useEffect(() => {
    const sync = () => setRoute(parseLocation(window.location.pathname))
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])
  return route
}
