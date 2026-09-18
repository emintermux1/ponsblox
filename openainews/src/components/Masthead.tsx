import { AppLink } from './AppLink.tsx'
import { sectionHref, type SectionId } from '../routes.ts'

const NAV: { label: string; href: string }[] = [
  { label: 'News', href: '/' },
  { label: 'Models', href: sectionHref('models') },
  { label: 'Research', href: sectionHref('research') },
  { label: 'Company', href: sectionHref('company') },
]

export function Masthead({ active }: { active?: SectionId | 'home' | 'article' }) {
  return (
    <header className="masthead">
      <div className="masthead-inner">
        <AppLink href="/" className="wordmark">
          <img className="wordmark-mark" src="/mark.png" alt="" width={28} height={28} />
          <span className="wordmark-openai">OpenAI</span>
          <span className="wordmark-news">News</span>
        </AppLink>
        <nav className="masthead-nav" aria-label="Sections">
          {NAV.map((item) => {
            const isOn =
              (active === 'home' && item.href === '/') ||
              (active === 'article' && item.href === '/') ||
              (active === 'models' && item.href === '/models') ||
              (active === 'research' && item.href === '/research') ||
              (active === 'company' && item.href === '/company')
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
      </div>
    </header>
  )
}
