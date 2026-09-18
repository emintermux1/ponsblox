const DEFAULT_TITLE = 'GitPad — Launch tokens paired with trending GitHub repositories'
const DEFAULT_DESC = 'Launch tokens paired with trending GitHub repositories. Live on Pons, Robinhood Chain.'

function tag(selector: string, create: () => HTMLElement): HTMLElement {
  const cur = document.head.querySelector(selector)
  if (cur instanceof HTMLElement) return cur
  const el = create()
  document.head.appendChild(el)
  return el
}

function setMeta(attr: 'name' | 'property', key: string, value: string) {
  const el = tag(`meta[${attr}="${key}"]`, () => {
    const m = document.createElement('meta')
    m.setAttribute(attr, key)
    return m
  })
  el.setAttribute('content', value)
}

export function setDocumentMeta(input: {
  title?: string
  description?: string
  path?: string
  image?: string
}) {
  if (typeof document === 'undefined') return
  const title = input.title || DEFAULT_TITLE
  const description = input.description || DEFAULT_DESC
  const path = input.path || (typeof location !== 'undefined' ? `${location.pathname}${location.search}` : '/')
  const origin = typeof location !== 'undefined' ? location.origin : ''
  const url = origin ? `${origin}${path}` : path
  const image = input.image || '/api/og?title=GitPad&layout=home'
  document.title = title
  setMeta('name', 'description', description)
  setMeta('property', 'og:title', title)
  setMeta('property', 'og:description', description)
  setMeta('property', 'og:url', url)
  setMeta('property', 'og:image', image.startsWith('http') || !origin ? image : `${origin}${image}`)
  setMeta('property', 'og:type', 'website')
  setMeta('name', 'twitter:card', 'summary_large_image')
  setMeta('name', 'twitter:title', title)
  setMeta('name', 'twitter:description', description)
  setMeta('name', 'twitter:image', image.startsWith('http') || !origin ? image : `${origin}${image}`)
  const canon = tag('link[rel="canonical"]', () => {
    const l = document.createElement('link')
    l.setAttribute('rel', 'canonical')
    return l
  })
  canon.setAttribute('href', url)
}
