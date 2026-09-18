export type SectionId = 'politics' | 'markets' | 'white-house'

export type ArticleId =
  | 'inside-the-white-house-crypto-meeting'
  | 'trump-unveils-gains-index'

export type Route =
  | { type: 'home' }
  | { type: 'section'; id: SectionId }
  | { type: 'article'; id: ArticleId }
  | { type: 'notfound' }

const CRYPTO_SLUG = 'inside-the-white-house-crypto-meeting'
const GAINS_SLUG = 'trump-unveils-gains-index'

export function parseRoute(pathname: string): Route {
  const raw = pathname.split('?')[0] ?? '/'
  const path = raw.replace(/\/+$/, '') || '/'
  const key = path.toLowerCase()

  switch (key) {
    case '/':
      return { type: 'home' }
    case '/politics':
      return { type: 'section', id: 'politics' }
    case '/markets':
    case '/finance':
      return { type: 'section', id: 'markets' }
    case '/white-house':
      return { type: 'section', id: 'white-house' }
    case `/finance/${CRYPTO_SLUG}`:
      return { type: 'article', id: CRYPTO_SLUG }
    case `/markets/${GAINS_SLUG}`:
      return { type: 'article', id: GAINS_SLUG }
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
    case 'politics':
      return '/politics'
    case 'markets':
      return '/markets'
    case 'white-house':
      return '/white-house'
    default: {
      const _never: never = id
      return _never
    }
  }
}

export function articleHref(id: ArticleId): string {
  switch (id) {
    case 'inside-the-white-house-crypto-meeting':
      return '/finance/inside-the-white-house-crypto-meeting'
    case 'trump-unveils-gains-index':
      return '/markets/trump-unveils-gains-index'
    default: {
      const _never: never = id
      return _never
    }
  }
}

export function sectionLabel(id: SectionId): string {
  switch (id) {
    case 'politics':
      return 'Politics'
    case 'markets':
      return 'Markets'
    case 'white-house':
      return 'White House'
    default: {
      const _never: never = id
      return _never
    }
  }
}

export function routeTitle(route: Route): string {
  switch (route.type) {
    case 'home':
      return 'DJT News'
    case 'section':
      return `${sectionLabel(route.id)} — DJT News`
    case 'article':
      return articleTitle(route.id)
    case 'notfound':
      return 'Page not found — DJT News'
    default: {
      const _never: never = route
      return _never
    }
  }
}

function articleTitle(id: ArticleId): string {
  switch (id) {
    case 'inside-the-white-house-crypto-meeting':
      return 'Trump, Tenev and the Market That Never Really Closes — DJT News'
    case 'trump-unveils-gains-index':
      return 'Trump announces new “Department of Gains” focused on U.S. markets and economic growth — DJT News'
    default: {
      const _never: never = id
      return _never
    }
  }
}
