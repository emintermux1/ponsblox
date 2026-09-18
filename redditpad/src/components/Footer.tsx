import { Link } from 'react-router-dom'
import { OfficialCa } from './OfficialCa.tsx'
import { XLink } from './XLink.tsx'

export function Footer() {
  return (
    <footer className="foot">
      <div className="foot__inner">
        <p>Reddit culture, paired. Every community deserves a ticker. Powered by $RDDT pairs.</p>
        <OfficialCa variant="full" />
        <nav>
          <Link to="/explore">Explore</Link>
          <Link to="/launch">Launch</Link>
          <Link to="/trending">Trending</Link>
          <XLink />
          <a href="https://docs.ponsfamily.com/v2" target="_blank" rel="noreferrer">Pons V2</a>
        </nav>
      </div>
    </footer>
  )
}
