import { useEffect, useState, type MouseEvent } from 'react'
import type { ExploreSort } from '../server/github.ts'

export type { ExploreSort }

export type Route =
  | { name: 'home' }
  | { name: 'explore'; sort: ExploreSort | 'tokenized'; q: string }
  | { name: 'repo'; owner: string; repo: string }
  | { name: 'launch'; owner: string | null; repo: string | null; mode: 'new' | 'existing' }
  | { name: 'fees'; address: string }
  | { name: 'token'; address: string }
  | { name: 'repoToken'; owner: string; repo: string }
  | { name: 'docs' }
  | { name: 'activity' }
  | { name: 'watch' }
  | { name: 'claim'; owner: string | null; repo: string | null; code: string | null }
  | { name: 'treasury'; owner: string | null; repo: string | null }
  | { name: 'admin' }
  | { name: 'first' }
  | { name: 'board' }
  | { name: 'map' }
  | { name: 'daily' }
  | { name: 'launches' }
  | { name: 'notFound' }

const SORTS: Array<ExploreSort | 'tokenized'> = [
  'trending', 'new', 'starred', 'growing', 'forked', 'today',
  'ai', 'crypto', 'devtools', 'gaming', 'rising', 'tokenized',
]

function asSort(value: string | null): ExploreSort | 'tokenized' {
  const v = (value || 'trending') as ExploreSort | 'tokenized'
  return SORTS.includes(v) ? v : 'trending'
}

function splitRepo(raw: string): { owner: string; repo: string } | null {
  const [owner, repo] = raw.split('/').map((s) => s.trim())
  if (!owner || !repo) return null
  if (!/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repo)) return null
  return { owner, repo }
}

export function parseLocation(pathname: string, search: string): Route {
  const p = pathname.replace(/\/+$/, '') || '/'
  const q = new URLSearchParams(search)
  if (p === '/') return { name: 'home' }
  if (p === '/explore') return { name: 'explore', sort: asSort(q.get('sort')), q: q.get('q') || '' }
  if (p === '/first') return { name: 'first' }
  if (p === '/board') return { name: 'board' }
  if (p === '/map') return { name: 'map' }
  if (p === '/daily') return { name: 'daily' }
  if (p === '/dashboard/launches' || p === '/dashboard') return { name: 'launches' }
  if (p === '/docs') return { name: 'docs' }
  if (p === '/activity') return { name: 'activity' }
  if (p === '/watch') return { name: 'watch' }
  if (p === '/admin') return { name: 'admin' }
  if (p === '/claim') {
    const picked = splitRepo(q.get('repo') || '')
    return { name: 'claim', owner: picked?.owner ?? q.get('owner'), repo: picked?.repo ?? q.get('name'), code: q.get('code') }
  }
  if (p === '/treasury') {
    const picked = splitRepo(q.get('repo') || '')
    return { name: 'treasury', owner: picked?.owner ?? null, repo: picked?.repo ?? null }
  }
  if (p === '/launch') {
    const picked = splitRepo(q.get('repo') || '')
    return {
      name: 'launch',
      owner: picked?.owner ?? null,
      repo: picked?.repo ?? null,
      mode: q.get('mode') === 'existing' ? 'existing' : 'new',
    }
  }
  if (p === '/connect') return { name: 'launch', owner: null, repo: null, mode: 'existing' }
  if (p.startsWith('/fees/')) {
    const address = p.slice('/fees/'.length).split('/')[0] ?? ''
    if (/^0x[a-fA-F0-9]{40}$/.test(address)) return { name: 'fees', address }
  }
  if (p.startsWith('/repo/')) {
    const picked = splitRepo(p.slice('/repo/'.length))
    if (picked) return { name: 'repo', owner: picked.owner, repo: picked.repo }
  }
  if (p.startsWith('/t/')) {
    const picked = splitRepo(p.slice('/t/'.length))
    if (picked) return { name: 'repoToken', owner: picked.owner, repo: picked.repo }
  }
  if (p.startsWith('/token/')) {
    const address = p.slice('/token/'.length).split('/')[0] ?? ''
    if (/^0x[a-fA-F0-9]{40}$/.test(address)) return { name: 'token', address }
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

export function repoPath(owner: string, repo: string) {
  return `/repo/${owner}/${repo}`
}

export function launchPath(owner: string, repo: string) {
  return `/launch?repo=${encodeURIComponent(`${owner}/${repo}`)}`
}

export function explorePath(sort: ExploreSort | 'tokenized', q = '') {
  const qs = new URLSearchParams()
  if (sort !== 'trending') qs.set('sort', sort)
  if (q) qs.set('q', q)
  const s = qs.toString()
  return s ? `/explore?${s}` : '/explore'
}
