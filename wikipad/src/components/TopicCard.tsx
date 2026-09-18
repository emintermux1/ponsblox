import { compact, pct } from '../lib/format.ts'
import { hrefFor, onNav } from '../lib/router.ts'
import type { TrendingItem } from '../lib/wiki.ts'

export function TopicCard({ item }: { item: TrendingItem }) {
  const href = hrefFor({ name: 'topic', title: item.title })
  return (
    <article className="topic-card">
      <a href={href} onClick={(e) => onNav(e, href)} className="topic-card__media">
        {item.thumbnail
          ? <img src={item.thumbnail} alt="" />
          : <span className="topic-card__ph" />}
      </a>
      <div>
        <h3>
          <a href={href} onClick={(e) => onNav(e, href)}>{item.title}</a>
        </h3>
        <p>{item.extract || item.description || 'No extract available.'}</p>
        <p className="meta">
          {compact(item.views)} pageviews
          {item.growthPct != null && <> · {pct(item.growthPct)}</>}
          {item.rank != null && <> · rank #{item.rank}</>}
        </p>
      </div>
    </article>
  )
}
