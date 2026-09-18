import { AppLink } from './AppLink.tsx'

export function Footer() {
  return (
    <footer className="site-foot">
      <div className="site-foot-inner">
        <p className="wordmark wordmark-foot">DJT News</p>
        <p>
          An independent digital newsroom covering the White House, American politics and
          financial markets. Wire headlines on this site link to the original publishers.
        </p>
        <p className="site-foot-nav">
          <AppLink href="/">Top Stories</AppLink>
          <AppLink href="/politics">Politics</AppLink>
          <AppLink href="/markets">Markets</AppLink>
          <AppLink href="/white-house">White House</AppLink>
        </p>
        <p className="site-foot-copy">© 2026 DJT News</p>
      </div>
    </footer>
  )
}
