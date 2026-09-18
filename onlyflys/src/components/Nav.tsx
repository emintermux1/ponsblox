import { useState, type FormEvent } from 'react'
import { useNavigate } from '../nav.ts'
import type { Route } from '../routes.ts'
import { AppLink } from './AppLink.tsx'
import { OfficialCa } from './OfficialCa.tsx'

const TABS = [
  { href: '/', label: 'Home', key: 'home' },
  { href: '/discover', label: 'Discover', key: 'discover' },
  { href: '/live', label: 'Live', key: 'live' },
  { href: '/messages', label: 'Messages', key: 'messages' },
] as const

function tabOn(route: Route, key: (typeof TABS)[number]['key']) {
  switch (route.type) {
    case 'home':
      return key === 'home'
    case 'discover':
    case 'search':
      return key === 'discover'
    case 'live':
      return key === 'live'
    case 'messages':
      return key === 'messages'
    case 'profile':
    case 'post':
    case 'notfound':
      return false
    default: {
      const _never: never = route
      return _never
    }
  }
}

export function Nav({ route }: { route: Route }) {
  const navigate = useNavigate()
  const [q, setQ] = useState(route.type === 'search' ? route.q : '')

  function onSearch(event: FormEvent) {
    event.preventDefault()
    const next = q.trim()
    navigate(next ? `/search?q=${encodeURIComponent(next)}` : '/search')
  }

  return (
    <>
      <header className="top">
        <AppLink href="/" className="brand" ariaLabel="OnlyFlys home">
          <img className="brand-mark" src="/logo.png" alt="" />
          <img className="brand-wide" src="/wordmark.png" alt="OnlyFlys" />
        </AppLink>
        <form className="top-search" onSubmit={onSearch}>
          <input
            type="search"
            placeholder="Search flies"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search"
          />
        </form>
        <AppLink href="/search" className="icon-btn" ariaLabel="Search">
          ⌕
        </AppLink>
      </header>

      <nav className="side" aria-label="OnlyFlys">
        <AppLink href="/" className="brand side-brand" ariaLabel="OnlyFlys home">
          <img src="/wordmark.png" alt="OnlyFlys" />
        </AppLink>
        {TABS.map((tab) => (
          <AppLink key={tab.key} href={tab.href} className={tabOn(route, tab.key) ? 'on' : ''}>
            {tab.label}
          </AppLink>
        ))}
        <AppLink href="/search" className={route.type === 'search' ? 'on' : ''}>
          Search
        </AppLink>
        <OfficialCa compact />
      </nav>

      <nav className="dock" aria-label="Primary">
        {TABS.map((tab) => (
          <AppLink key={tab.key} href={tab.href} className={tabOn(route, tab.key) ? 'on' : ''}>
            {tab.label}
          </AppLink>
        ))}
      </nav>
    </>
  )
}
