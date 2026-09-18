import { useEffect } from 'react'
import { setDocumentMeta } from '../lib/meta.ts'
import type { Route } from '../lib/router.ts'

function pathFor(route: Route): string {
  switch (route.name) {
    case 'home': return '/'
    case 'games': {
      const qs = new URLSearchParams()
      if (route.q) qs.set('q', route.q)
      if (route.sort !== 'all') qs.set('sort', route.sort)
      if (route.genre !== 'all') qs.set('genre', route.genre)
      const s = qs.toString()
      return s ? `/games?${s}` : '/games'
    }
    case 'markets': return route.q ? `/markets?q=${encodeURIComponent(route.q)}` : '/markets'
    case 'launch': return route.game ? `/launch?game=${encodeURIComponent(route.game)}` : '/launch'
    case 'token': return `/token/${route.address}`
    case 'game': return `/game/${encodeURIComponent(route.id)}`
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
        title: 'RobloxPad — Play the game. Earn on it.',
        description: 'Play a live Roblox game. Launch a token on it. Trade while they play.',
      }
    case 'games':
      return { title: 'Games — RobloxPad', description: 'Live Roblox titles. Launch on one. Earn while they play.' }
    case 'markets':
      return { title: 'Markets — RobloxPad', description: 'Tokens on games people are playing.' }
    case 'launch':
      return { title: 'Launch — RobloxPad', description: 'Pick a Roblox game. Launch a token. Earn on the curve.' }
    case 'token':
      return { title: 'Token — RobloxPad', description: 'A token on a Roblox game. Trade while they play.' }
    case 'game':
      return { title: 'Game — RobloxPad', description: 'A live Roblox game you can launch on.' }
    case 'docs':
      return { title: 'Docs — RobloxPad', description: 'Play. Launch. Earn on Pons V2.' }
    case 'fees':
      return { title: 'Fees — RobloxPad', description: 'Creator tax recipient for a Pons V2 token.' }
    case 'notFound':
      return { title: 'Not found — RobloxPad', description: 'This path is not on RobloxPad.' }
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
