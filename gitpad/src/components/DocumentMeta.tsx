import { useEffect } from 'react'
import { setDocumentMeta } from '../lib/meta.ts'
import type { Route } from '../lib/router.ts'

function pathFor(route: Route): string {
  switch (route.name) {
    case 'home': return '/'
    case 'explore': {
      const qs = new URLSearchParams()
      if (route.sort !== 'trending') qs.set('sort', route.sort)
      if (route.q) qs.set('q', route.q)
      const s = qs.toString()
      return s ? `/explore?${s}` : '/explore'
    }
    case 'repo': return `/repo/${route.owner}/${route.repo}`
    case 'launch': {
      const qs = new URLSearchParams()
      if (route.owner && route.repo) qs.set('repo', `${route.owner}/${route.repo}`)
      if (route.mode === 'existing') qs.set('mode', 'existing')
      const s = qs.toString()
      return s ? `/launch?${s}` : '/launch'
    }
    case 'fees': return `/fees/${route.address}`
    case 'token': return `/token/${route.address}`
    case 'repoToken': return `/t/${route.owner}/${route.repo}`
    case 'docs': return '/docs'
    case 'activity': return '/activity'
    case 'watch': return '/watch'
    case 'claim': return '/claim'
    case 'treasury': return '/treasury'
    case 'admin': return '/admin'
    case 'first': return '/first'
    case 'board': return '/board'
    case 'map': return '/map'
    case 'daily': return '/daily'
    case 'launches': return '/dashboard/launches'
    case 'notFound': return typeof location !== 'undefined' ? location.pathname : '/404'
    default: {
      const _e: never = route
      return _e
    }
  }
}

function copyFor(route: Route): { title: string; description: string; image?: string } {
  switch (route.name) {
    case 'home':
      return {
        title: 'GitPad — Launch tokens paired with trending GitHub repositories',
        description: 'Launch tokens paired with trending GitHub repositories. Live on Pons, Robinhood Chain.',
      }
    case 'explore':
      return { title: 'Explore — GitPad', description: 'Trending GitHub repositories ranked by velocity. See which ones already have a token.' }
    case 'repo':
      return {
        title: `${route.owner}/${route.repo} — GitPad`,
        description: `GitHub repository ${route.owner}/${route.repo} on GitPad. Launch a token paired with this repository.`,
        image: `/api/og?title=${encodeURIComponent(`${route.owner}/${route.repo}`)}&repo=${encodeURIComponent(`${route.owner}/${route.repo}`)}&layout=og`,
      }
    case 'launch':
      return {
        title: route.mode === 'existing' ? 'Existing token — GitPad Launch Studio' : 'Launch Studio — GitPad',
        description: 'Configure a repository, token, and fees, then sign launchToken on Pons V2 yourself.',
      }
    case 'fees':
      return { title: 'Fees — GitPad', description: 'Creator tax destinations for a Pons V2 token.' }
    case 'token':
      return {
        title: 'Token — GitPad',
        description: 'Pons V2 token on Robinhood Chain. Repository pair, market reads, and fee routing.',
        image: `/api/og?contract=${encodeURIComponent(route.address)}&layout=og`,
      }
    case 'repoToken':
      return { title: `${route.owner}/${route.repo} token — GitPad`, description: `Token paired with ${route.owner}/${route.repo}.` }
    case 'docs':
      return { title: 'Docs — GitPad', description: 'How GitPad launches on Pons V2. Repository is the narrative pair. On-chain quote is ETH.' }
    case 'activity':
      return { title: 'Activity — GitPad', description: 'Launches, claims, and repository momentum.' }
    case 'watch':
      return { title: 'Watch — GitPad', description: 'Repositories and tokens you asked GitPad to remember.' }
    case 'claim':
      return { title: 'Claim repository — GitPad', description: 'Verify GitHub maintainer status. A claim never transfers a token.' }
    case 'treasury':
      return { title: 'Treasury — GitPad', description: 'Connect a repository treasury wallet after a claim.' }
    case 'admin':
      return { title: 'Admin — GitPad', description: 'Operations inspect only.' }
    case 'first':
      return { title: 'Be First — GitPad', description: 'Trending GitHub repositories that do not have a GitPad token yet.' }
    case 'board':
      return { title: 'Board — GitPad', description: 'Trending repositories in one table.' }
    case 'map':
      return { title: 'Map — GitPad', description: 'Tokenized repositories by category.' }
    case 'daily':
      return { title: 'Daily — GitPad', description: 'What moved on GitHub and what launched on Pons.' }
    case 'launches':
      return { title: 'Your launches — GitPad', description: 'LIVE, PENDING, and FAILED launches from this wallet.' }
    case 'notFound':
      return { title: 'Not found — GitPad', description: 'This path is not on GitPad.' }
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
