import { AppLink } from './AppLink.tsx'
import { sectionHref, type SectionId } from '../routes.ts'

const NAV: { label: string; href: string }[] = [
  { label: 'Top Stories', href: '/' },
  { label: 'Politics', href: sectionHref('politics') },
  { label: 'Markets', href: sectionHref('markets') },
  { label: 'White House', href: sectionHref('white-house') },
]

const EDITION = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
}).format(new Date('2026-09-17T12:00:00-04:00'))

export function Masthead({ active }: { active?: SectionId | 'home' }) {
  return (
    <header className="masthead">
      <div className="masthead-rail">
        <p className="masthead-date">{EDITION}</p>
        <p className="masthead-place">Washington</p>
        <p className="masthead-url">djtnews.org</p>
      </div>
      <div className="masthead-brand">
        <AppLink href="/" className="wordmark">
          DJT News
        </AppLink>
        <p className="masthead-tag">The White House · Politics · Markets</p>
      </div>
      <nav className="masthead-nav" aria-label="Sections">
        {NAV.map((item) => {
          const isOn =
            (active === 'home' && item.href === '/') ||
            (active === 'politics' && item.href === '/politics') ||
            (active === 'markets' && item.href === '/markets') ||
            (active === 'white-house' && item.href === '/white-house')
          return (
            <AppLink
              key={item.href}
              href={item.href}
              className={isOn ? 'nav-link is-on' : 'nav-link'}
            >
              {item.label}
            </AppLink>
          )
        })}
      </nav>
    </header>
  )
}
