import { useEffect, useState, type MouseEvent } from 'react'

export type Route =
  | { name: 'home' }
  | { name: 'games'; q: string; sort: string; genre: string }
  | { name: 'markets'; q: string }
  | { name: 'launch'; game: string }
  | { name: 'token'; address: string }
  | { name: 'game'; id: string }
  | { name: 'docs' }
  | { name: 'fees'; address: string }
  | { name: 'notFound' }

export function parseLocation(pathname: string, search: string): Route {
  const p = pathname.replace(/\/+$/, '') || '/'
  const q = new URLSearchParams(search)
  if (p === '/') return { name: 'home' }
  if (p === '/games' || p === '/catalogue') {
    return {
      name: 'games',
      q: q.get('q') || '',
      sort: q.get('sort') || 'all',
      genre: q.get('genre') || 'all',
    }
  }
  if (p === '/markets') return { name: 'markets', q: q.get('q') || '' }
  if (p === '/launch') return { name: 'launch', game: q.get('game') || q.get('skin') || '' }
  if (p === '/docs') return { name: 'docs' }
  if (p.startsWith('/fees/')) {
    const address = p.slice('/fees/'.length).split('/')[0] ?? ''
    if (/^0x[a-fA-F0-9]{40}$/.test(address)) return { name: 'fees', address }
  }
  if (p.startsWith('/token/')) {
    const address = p.slice('/token/'.length).split('/')[0] ?? ''
    if (/^0x[a-fA-F0-9]{40}$/.test(address)) return { name: 'token', address }
  }
  if (p.startsWith('/game/') || p.startsWith('/skin/')) {
    const raw = p.startsWith('/game/') ? p.slice('/game/'.length) : p.slice('/skin/'.length)
    const id = decodeURIComponent(raw)
    if (id) return { name: 'game', id }
  }
  return { name: 'notFound' }
}

export function navigate(to: string) {
  if (to !== `${location.pathname}${location.search}`) {
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
  const [route, setRoute] = useState<Route>(() => parseLocation(location.pathname, location.search))
  useEffect(() => {
    const on = () => setRoute(parseLocation(location.pathname, location.search))
    window.addEventListener('popstate', on)
    return () => window.removeEventListener('popstate', on)
  }, [])
  return route
}

export function gamesPath(input?: { q?: string; sort?: string; genre?: string }): string {
  const qs = new URLSearchParams()
  if (input?.q) qs.set('q', input.q)
  if (input?.sort && input.sort !== 'all') qs.set('sort', input.sort)
  if (input?.genre && input.genre !== 'all') qs.set('genre', input.genre)
  const s = qs.toString()
  return s ? `/games?${s}` : '/games'
}

export function launchPath(gameId?: string): string {
  return gameId ? `/launch?game=${encodeURIComponent(gameId)}` : '/launch'
}

export function gamePath(id: string): string {
  return `/game/${encodeURIComponent(id)}`
}

export function tokenPath(address: string): string {
  return `/token/${address}`
}

export function feesPath(address: string): string {
  return `/fees/${address}`
}
