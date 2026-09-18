import { useEffect } from 'react'

export type PageMeta = {
  title: string
  description: string
  url: string
  image: string
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  const sel = `meta[${attr}="${key}"]`
  let el = document.head.querySelector(sel)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

export function applyPageMeta(meta: PageMeta) {
  document.title = meta.title
  upsertMeta('name', 'description', meta.description)
  upsertMeta('property', 'og:title', meta.title)
  upsertMeta('property', 'og:description', meta.description)
  upsertMeta('property', 'og:url', meta.url)
  upsertMeta('property', 'og:image', meta.image)
  upsertMeta('property', 'og:type', 'article')
  upsertMeta('name', 'twitter:card', 'summary_large_image')
  upsertMeta('name', 'twitter:title', meta.title)
  upsertMeta('name', 'twitter:description', meta.description)
  upsertMeta('name', 'twitter:image', meta.image)
  let link = document.head.querySelector('link[rel="canonical"]')
  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', 'canonical')
    document.head.appendChild(link)
  }
  link.setAttribute('href', meta.url)
}

export function usePageMeta(meta: PageMeta) {
  useEffect(() => {
    applyPageMeta(meta)
  }, [meta.title, meta.description, meta.url, meta.image])
}
