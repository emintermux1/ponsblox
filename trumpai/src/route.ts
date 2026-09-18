export type SitePath = 'home' | 't1' | 'eagle47'

export function parseSitePath(pathname: string): SitePath {
  const raw = pathname.split('?')[0] ?? '/'
  const path = raw.replace(/\/+$/, '') || '/'
  const key = path.toLowerCase()
  switch (key) {
    case '/':
      return 'home'
    case '/t1':
    case '/t-1':
    case '/introducing':
      return 't1'
    case '/projects/eagle-47':
    case '/eagle-47':
    case '/eagle47':
      return 'eagle47'
    default:
      return 'home'
  }
}

export function pathHref(path: SitePath) {
  switch (path) {
    case 'home':
      return '/'
    case 't1':
      return '/T1'
    case 'eagle47':
      return '/projects/eagle-47'
    default: {
      const _never: never = path
      return _never
    }
  }
}

export function isBlogPath(pathname: string) {
  const path = parseSitePath(pathname)
  return path === 't1' || path === 'eagle47'
}
