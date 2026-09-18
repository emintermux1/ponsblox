import { AppLink } from './AppLink.tsx'

export function Footer() {
  return (
    <footer className="site-foot">
      <div className="site-foot-inner">
        <p className="wordmark wordmark-foot">
          <img className="wordmark-mark" src="/mark.png" alt="" width={28} height={28} />
          <span className="wordmark-openai">OpenAI</span>
          <span className="wordmark-news">News</span>
        </p>
        <p>
          An independent newsroom covering OpenAI models, research and product releases. Official
          OpenAI pages open on openai.com.
        </p>
        <p className="site-foot-nav">
          <AppLink href="/">News</AppLink>
          <AppLink href="/models">Models</AppLink>
          <AppLink href="/research">Research</AppLink>
          <AppLink href="/company">Company</AppLink>
          <a href="https://openai.com/news/product-releases/" target="_blank" rel="noopener noreferrer">
            Product Releases
          </a>
        </p>
        <p className="site-foot-copy">© 2026 Open AI News</p>
      </div>
    </footer>
  )
}
