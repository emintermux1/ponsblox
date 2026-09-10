import { useEffect, useState, type MouseEvent } from 'react'

export type Route =
  | { name: 'home' }
  | { name: 'catalogue'; q: string; category: string; wear: string }
  | { name: 'markets'; q: string }
  | { name: 'launch'; skin: string }
  | { name: 'token'; address: string }
  | { name: 'skin'; id: string }
  | { name: 'docs' }
  | { name: 'fees'; address: string }
  | { name: 'notFound' }

export function parseLocation(pathname: string, search: string): Route {
  const p = pathname.replace(/\/+$/, '') || '/'
  const q = new URLSearchParams(search)
  if (p === '/') return { name: 'home' }
  if (p === '/catalogue') {
    return {
      name: 'catalogue',
      q: q.get('q') || '',
      category: q.get('category') || 'all',
      wear: q.get('wear') || 'all',
    }
  }
  if (p === '/markets') return { name: 'markets', q: q.get('q') || '' }
  if (p === '/launch') return { name: 'launch', skin: q.get('skin') || '' }
  if (p === '/docs') return { name: 'docs' }
  if (p.startsWith('/fees/')) {
    const address = p.slice('/fees/'.length).split('/')[0] ?? ''
    if (/^0x[a-fA-F0-9]{40}$/.test(address)) return { name: 'fees', address }
  }
  if (p.startsWith('/token/')) {
    const address = p.slice('/token/'.length).split('/')[0] ?? ''
    if (/^0x[a-fA-F0-9]{40}$/.test(address)) return { name: 'token', address }
  }
  if (p.startsWith('/skin/')) {
    const id = decodeURIComponent(p.slice('/skin/'.length))
    if (id) return { name: 'skin', id }
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

export function cataloguePath(input?: { q?: string; category?: string; wear?: string }): string {
  const qs = new URLSearchParams()
  if (input?.q) qs.set('q', input.q)
  if (input?.category && input.category !== 'all') qs.set('category', input.category)
  if (input?.wear && input.wear !== 'all') qs.set('wear', input.wear)
  const s = qs.toString()
  return s ? `/catalogue?${s}` : '/catalogue'
}

export function launchPath(skinId?: string): string {
  return skinId ? `/launch?skin=${encodeURIComponent(skinId)}` : '/launch'
}

export function skinPath(id: string): string {
  return `/skin/${encodeURIComponent(id)}`
}

export function tokenPath(address: string): string {
  return `/token/${address}`
}

export function feesPath(address: string): string {
  return `/fees/${address}`
}
