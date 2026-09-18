import { COPY } from '../lib/copy.ts'
import { OfficialCa } from './OfficialCa.tsx'
import { XLink } from './XLink.tsx'

export function Footer() {
  return (
    <footer className="foot">
      <div className="foot-brand">
        <p>{COPY.name}. {COPY.line}.</p>
        <OfficialCa kind="full" />
      </div>
      <nav aria-label="LAUNCHER">
        <a href="/">{COPY.studio}</a>
        <a href="/pads">{COPY.directory}</a>
        <a href="/docs">{COPY.docs}</a>
        <XLink />
      </nav>
    </footer>
  )
}
