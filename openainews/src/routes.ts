export type SectionId = 'models' | 'research' | 'company'

export type ArticleId = 'gpt-6-1-alpha'

export type Route =
  | { type: 'home' }
  | { type: 'section'; id: SectionId }
  | { type: 'article'; id: ArticleId }
  | { type: 'notfound' }

export function parseRoute(pathname: string): Route {
  const raw = pathname.split('?')[0] ?? '/'
  const path = raw.replace(/\/+$/, '') || '/'
  const key = path.toLowerCase()

  switch (key) {
    case '/':
      return { type: 'home' }
    case '/models':
      return { type: 'section', id: 'models' }
    case '/research':
      return { type: 'section', id: 'research' }
    case '/company':
      return { type: 'section', id: 'company' }
    case '/gpt-6-1-alpha':
      return { type: 'article', id: 'gpt-6-1-alpha' }
    default:
      return { type: 'notfound' }
  }
}

export function routeHref(route: Route): string {
  switch (route.type) {
    case 'home':
      return '/'
    case 'section':
      return sectionHref(route.id)
    case 'article':
      return articleHref(route.id)
    case 'notfound':
      return '/not-found'
    default: {
      const _never: never = route
      return _never
    }
  }
}

export function sectionHref(id: SectionId): string {
  switch (id) {
    case 'models':
      return '/models'
    case 'research':
      return '/research'
    case 'company':
      return '/company'
    default: {
      const _never: never = id
      return _never
    }
  }
}

export function articleHref(id: ArticleId): string {
  switch (id) {
    case 'gpt-6-1-alpha':
      return '/gpt-6-1-alpha'
    default: {
      const _never: never = id
      return _never
    }
  }
}

export function sectionLabel(id: SectionId): string {
  switch (id) {
    case 'models':
      return 'Models'
    case 'research':
      return 'Research'
    case 'company':
      return 'Company'
    default: {
      const _never: never = id
      return _never
    }
  }
}

export function routeTitle(route: Route): string {
  switch (route.type) {
    case 'home':
      return 'OpenAI News'
    case 'section':
      return `${sectionLabel(route.id)} — OpenAI News`
    case 'article':
      return articleTitle(route.id)
    case 'notfound':
      return 'Page not found — OpenAI News'
    default: {
      const _never: never = route
      return _never
    }
  }
}

function articleTitle(id: ArticleId): string {
  switch (id) {
    case 'gpt-6-1-alpha':
      return 'OpenAI’s next model appears to be called GPT-6.1 Alpha'
    default: {
      const _never: never = id
      return _never
    }
  }
}
