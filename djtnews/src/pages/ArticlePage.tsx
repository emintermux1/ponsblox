import { AppLink } from '../components/AppLink.tsx'
import { Figure } from '../components/Figure.tsx'
import { Footer } from '../components/Footer.tsx'
import { GainsBoard, IndexBars, KnowBox, SparkPreview } from '../components/ArticleModules.tsx'
import { GainsHero } from '../components/GainsHero.tsx'
import { Masthead } from '../components/Masthead.tsx'
import { getArticle } from '../article.ts'
import type { ArticleBlock } from '../article.ts'
import type { ArticleId } from '../routes.ts'

function Block({ block }: { block: ArticleBlock }) {
  switch (block.kind) {
    case 'p':
      return <p>{block.text}</p>
    case 'h2':
      return <h2>{block.text}</h2>
    case 'quote':
      return <p className="drop-word">{block.text}</p>
    case 'pull':
      return <blockquote className="pull-quote">{block.text}</blockquote>
    case 'note':
      return <p className="scene-note">{block.text}</p>
    case 'cite':
      return (
        <p>
          {block.before}
          <a href={block.href} target="_blank" rel="noopener noreferrer">
            {block.label}
          </a>
          {block.after}
        </p>
      )
    case 'figure':
      return (
        <Figure
          src={block.src}
          alt={block.alt}
          caption={block.caption}
          credit={block.credit}
          crop={block.crop}
        />
      )
    case 'know':
      return <KnowBox heading={block.heading} items={block.items} />
    case 'bars':
      return (
        <IndexBars
          kicker={block.kicker}
          heading={block.heading}
          caption={block.caption}
          credit={block.credit}
          baseline={block.baseline}
          rows={block.rows}
        />
      )
    case 'spark':
      return (
        <SparkPreview
          kicker={block.kicker}
          heading={block.heading}
          value={block.value}
          change={block.change}
          fromBaseline={block.fromBaseline}
          points={block.points}
          labels={block.labels}
          caption={block.caption}
          credit={block.credit}
        />
      )
    case 'board':
      return (
        <GainsBoard
          kicker={block.kicker}
          heading={block.heading}
          caption={block.caption}
          credit={block.credit}
          rows={block.rows}
        />
      )
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
      <Masthead active={article.section} />
      <article className="feature">
        <header className="feature-head">
          <p className="kicker">{article.kicker}</p>
          <h1>{article.headline}</h1>
          <p className="feature-dek">{article.dek}</p>
          <div className="byline">
            <img
              className="byline-photo"
              src={article.authorPhoto}
              alt={article.authorName}
              width={56}
              height={56}
            />
            <div>
              <p className="byline-name">{article.byline}</p>
              <p className="byline-meta">
                {article.role}
                <span aria-hidden="true"> · </span>
                <time dateTime={article.datetime}>{article.dateLabel}</time>
                <span aria-hidden="true"> · </span>
                {article.location}
              </p>
            </div>
          </div>
        </header>

        {article.id === 'trump-unveils-gains-index' ? (
          <figure className="figure">
            <GainsHero />
            <figcaption>
              {article.hero.caption}
              {article.hero.credit ? <span className="credit"> {article.hero.credit}</span> : null}
            </figcaption>
          </figure>
        ) : (
          <Figure
            src={article.hero.src}
            alt={article.hero.alt}
            caption={article.hero.caption}
            credit={article.hero.credit}
            crop={article.hero.crop}
          />
        )}

        <div className="feature-body">
          {article.body.map((block, index) => (
            <Block key={index} block={block} />
          ))}

          <aside className="author-box">
            <img src={article.authorPhoto} alt={article.authorName} />
            <div>
              <p className="author-name">{article.authorName}</p>
              <p>{article.authorBio}</p>
            </div>
          </aside>

          {article.sources.length > 0 ? (
            <p className="sources">
              <span className="sources-label">Sources</span>
              {article.sources.map((source, index) => (
                <span key={source.href} className="sources-item">
                  {index > 0 ? <span className="sources-sep"> · </span> : null}
                  <a href={source.href} target="_blank" rel="noopener noreferrer">
                    {source.label}
                  </a>
                </span>
              ))}
            </p>
          ) : null}
        </div>
      </article>
      <p className="back-home">
        <AppLink href="/">← DJT News home</AppLink>
      </p>
      <Footer />
    </div>
  )
}
