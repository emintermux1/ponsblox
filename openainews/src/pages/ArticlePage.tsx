import { AppLink } from '../components/AppLink.tsx'
import { Footer } from '../components/Footer.tsx'
import { Masthead } from '../components/Masthead.tsx'
import { People } from '../components/People.tsx'
import { getArticle, type ArticleBlock } from '../article.ts'
import type { ArticleId } from '../routes.ts'

function Block({ block }: { block: ArticleBlock }) {
  switch (block.kind) {
    case 'p':
      return <p>{block.text}</p>
    case 'h2':
      return <h2>{block.text}</h2>
    case 'pull':
      return <p className="pull">{block.text}</p>
    case 'name':
      return <p className="name-line">{block.text}</p>
    case 'aside':
      return <p className="name-aside">{block.text}</p>
    default: {
      const _never: never = block
      return _never
    }
  }
}

export function ArticlePage({ id }: { id: ArticleId }) {
  const article = getArticle(id)

  return (
    <div className="page">
      <Masthead active="article" />
      <article className="feature">
        <header className="feature-head">
          <p className="kicker">{article.kicker}</p>
          <h1>{article.headline}</h1>
          <p className="feature-dek">{article.dek}</p>
          <p className="byline">
            <time dateTime={article.datetime}>{article.dateLabel}</time>
            <span aria-hidden="true"> · </span>
            {article.read}
          </p>
        </header>

        <figure className="hero-lockup">
          <img src="/gpt-6-1-alpha.png" alt="GPT-6.1 ALPHA" />
        </figure>

        <div className="feature-body">
          {article.body.map((block, index) => (
            <Block key={index} block={block} />
          ))}

          <People />

          <p className="sources">
            <span className="sources-label">Sources</span>
            {article.sources.map((source) => (
              <a key={source.href} href={source.href} target="_blank" rel="noopener noreferrer">
                {source.label}
              </a>
            ))}
          </p>
        </div>
      </article>
      <p className="back-home">
        <AppLink href="/">OpenAI News</AppLink>
      </p>
      <Footer />
    </div>
  )
}
