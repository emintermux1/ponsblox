export type Route =
  | { type: 'home' }
  | { type: 'discover' }
  | { type: 'search'; q: string }
  | { type: 'messages'; handle?: string }
  | { type: 'live'; handle?: string }
  | { type: 'profile'; handle: string }
  | { type: 'post'; id: string }
  | { type: 'notfound' }

function cleanPath(pathname: string) {
  const raw = pathname.split('?')[0] ?? '/'
  return raw.replace(/\/+$/, '') || '/'
}

export function parseRoute(pathname: string, search = ''): Route {
  const key = cleanPath(pathname).toLowerCase()
  const raw = search.startsWith('?') ? search.slice(1) : search
  const params = new URLSearchParams(raw)

  switch (key) {
    case '/':
      return { type: 'home' }
    case '/discover':
      return { type: 'discover' }
    case '/search':
      return { type: 'search', q: params.get('q') ?? '' }
    case '/messages':
      return { type: 'messages' }
    case '/live':
      return { type: 'live' }
    default:
      break
  }

  const parts = key.split('/').filter(Boolean)
  if (parts.length === 2) {
    const [head, tail] = parts
    switch (head) {
      case 'messages':
        return { type: 'messages', handle: tail }
      case 'live':
        return { type: 'live', handle: tail }
      case 'c':
        return { type: 'profile', handle: tail }
      case 'p':
        return { type: 'post', id: tail }
      default:
        return { type: 'notfound' }
    }
  }

  return { type: 'notfound' }
}

export function routeHref(route: Route): string {
  switch (route.type) {
    case 'home':
      return '/'
    case 'discover':
      return '/discover'
    case 'search':
      return route.q ? `/search?q=${encodeURIComponent(route.q)}` : '/search'
    case 'messages':
      return route.handle ? `/messages/${route.handle}` : '/messages'
    case 'live':
      return route.handle ? `/live/${route.handle}` : '/live'
    case 'profile':
      return `/c/${route.handle}`
    case 'post':
      return `/p/${route.id}`
    case 'notfound':
      return '/not-found'
    default: {
      const _never: never = route
      return _never
    }
  }
}

export function routeTitle(route: Route): string {
  switch (route.type) {
    case 'home':
      return 'OnlyFlys — the hive for house flies'
    case 'discover':
      return 'Discover — OnlyFlys'
    case 'search':
      return route.q ? `${route.q} — Search — OnlyFlys` : 'Search — OnlyFlys'
    case 'messages':
      return 'Messages — OnlyFlys'
    case 'live':
      return 'Live — OnlyFlys'
    case 'profile':
      return `@${route.handle} — OnlyFlys`
    case 'post':
      return 'Post — OnlyFlys'
    case 'notfound':
      return 'Lost in the bin — OnlyFlys'
    default: {
      const _never: never = route
      return _never
    }
  }
}
