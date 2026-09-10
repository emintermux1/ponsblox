import { useEffect } from 'react'
import { setDocumentMeta } from '../lib/meta.ts'
import type { Route } from '../lib/router.ts'

function pathFor(route: Route): string {
  switch (route.name) {
    case 'home': return '/'
    case 'catalogue': {
      const qs = new URLSearchParams()
      if (route.q) qs.set('q', route.q)
      if (route.category !== 'all') qs.set('category', route.category)
      if (route.wear !== 'all') qs.set('wear', route.wear)
      const s = qs.toString()
      return s ? `/catalogue?${s}` : '/catalogue'
    }
    case 'markets': return route.q ? `/markets?q=${encodeURIComponent(route.q)}` : '/markets'
    case 'launch': return route.skin ? `/launch?skin=${encodeURIComponent(route.skin)}` : '/launch'
    case 'token': return `/token/${route.address}`
    case 'skin': return `/skin/${encodeURIComponent(route.id)}`
    case 'docs': return '/docs'
    case 'fees': return `/fees/${route.address}`
    case 'notFound': return typeof location !== 'undefined' ? location.pathname : '/404'
    default: {
      const _e: never = route
      return _e
    }
  }
}

function copyFor(route: Route): { title: string; description: string } {
  switch (route.name) {
    case 'home':
      return {
        title: 'CS2 SKINPAD — Launch tokens backed by CS2 skins',
        description: 'Pick any CS2 skin in the catalogue and launch a token pegged to it, one to one.',
      }
    case 'catalogue':
      return { title: 'Catalogue — CS2 SKINPAD', description: 'The 300 most valuable CS2 weapon listings, priced from Steam.' }
    case 'markets':
      return { title: 'Markets — CS2 SKINPAD', description: 'Every token launched here, against the skin it tracks.' }
    case 'launch':
      return { title: 'Launch — CS2 SKINPAD', description: 'Name a token, peg it to a CS2 skin, and sign launchToken on Pons V2.' }
    case 'token':
      return { title: 'Token — CS2 SKINPAD', description: 'Pons V2 token pegged one to one to a CS2 skin.' }
    case 'skin':
      return { title: `${route.id} — CS2 SKINPAD`, description: 'CS2 listing you can peg a token to.' }
    case 'docs':
      return { title: 'Docs — CS2 SKINPAD', description: 'How the peg, drift, catalogue, and Pons curve work.' }
    case 'fees':
      return { title: 'Fees — CS2 SKINPAD', description: 'Creator tax recipient for a Pons V2 token.' }
    case 'notFound':
      return { title: 'Not found — CS2 SKINPAD', description: 'This path is not on SkinPad.' }
    default: {
      const _e: never = route
      return _e
    }
  }
}

export function DocumentMeta({ route }: { route: Route }) {
  useEffect(() => {
    const copy = copyFor(route)
    setDocumentMeta({ ...copy, path: pathFor(route) })
  }, [route])
  return null
}
