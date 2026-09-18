import { useEffect, useMemo, useState } from 'react'
import { Directory } from './pages/Directory.tsx'
import { Docs } from './pages/Docs.tsx'
import { Studio } from './pages/Studio.tsx'
import { Tenant } from './pages/Tenant.tsx'
import { isCustomHost, resolveCustomHost } from './lib/domain.ts'
import { resolveTenant } from './lib/tenant.ts'

type Route =
  | { kind: 'studio' }
  | { kind: 'pads' }
  | { kind: 'docs' }
  | { kind: 'tenant'; slug: string }
  | { kind: 'resolving'; host: string }

function readRoute(): Route {
  const path = location.pathname
  const tenant = resolveTenant(location.host, path)
  if (tenant.kind === 'tenant' && tenant.slug) return { kind: 'tenant', slug: tenant.slug }
  if (isCustomHost(location.host)) return { kind: 'resolving', host: location.host }
  if (path === '/pads' || path === '/directory') return { kind: 'pads' }
  if (path === '/docs') return { kind: 'docs' }
  return { kind: 'studio' }
}

export function App() {
  const [route, setRoute] = useState<Route>(() => readRoute())

  useEffect(() => {
    const sync = () => setRoute(readRoute())
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])

  useEffect(() => {
    if (route.kind !== 'resolving') return
    let alive = true
    resolveCustomHost(route.host).then((slug) => {
      if (!alive) return
      setRoute(slug ? { kind: 'tenant', slug } : { kind: 'studio' })
    })
    return () => { alive = false }
  }, [route])

  useEffect(() => {
    switch (route.kind) {
      case 'studio':
      case 'resolving':
        document.title = 'LAUNCHER'
        return
      case 'pads':
        document.title = 'Pads — LAUNCHER'
        return
      case 'docs':
        document.title = 'Docs — LAUNCHER'
        return
      case 'tenant':
        document.title = `${route.slug} — LAUNCHER`
        return
      default: {
        const _n: never = route
        return _n
      }
    }
  }, [route])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest('a')
      if (!a) return
      const href = a.getAttribute('href')
      if (!href || href.startsWith('http') || href.startsWith('#')) return
      e.preventDefault()
      history.pushState({}, '', href)
      setRoute(readRoute())
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  const page = useMemo(() => {
    switch (route.kind) {
      case 'studio':
        return <Studio />
      case 'pads':
        return <Directory />
      case 'docs':
        return <Docs />
      case 'tenant':
        return <Tenant slug={route.slug} />
      case 'resolving':
        return null
      default: {
        const _n: never = route
        return _n
      }
    }
  }, [route])

  return page
}
