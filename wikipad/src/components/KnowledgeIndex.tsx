import { short } from '../lib/chain.ts'
import { feeRouteLabel, formatEditorTime } from '../lib/editorFees.ts'
import { compact, pct } from '../lib/format.ts'
import type { KnowledgePage } from '../lib/wiki.ts'

export function KnowledgeIndex({ page }: { page: KnowledgePage }) {
  const { index, editor } = page
  return (
    <aside className="infobox">
      <div className="infobox__title">Live Knowledge Index</div>
      {page.thumbnail && (
        <figure>
          <img src={page.thumbnail} alt={page.displayTitle} />
        </figure>
      )}
      <table>
        <tbody>
          <tr><th>24H views</th><td>{compact(index.views24h)}</td></tr>
          <tr><th>7D views</th><td>{compact(index.views7d)}</td></tr>
          <tr><th>View growth</th><td>{pct(index.growthPct)}</td></tr>
          <tr><th>Edits</th><td>{compact(index.edits)}</td></tr>
          <tr><th>Languages</th><td>{compact(index.languages)}</td></tr>
          <tr><th>Rank</th><td>{index.rank != null ? `#${index.rank}` : 'Outside yesterday’s top list'}</td></tr>
          <tr><th>Wikidata</th><td>{page.qid
            ? <a href={page.wikidataUrl || '#'} target="_blank" rel="noreferrer">{page.qid}</a>
            : '—'}</td></tr>
          <tr><th>Page id</th><td>{page.pageid || '—'}</td></tr>
          <tr>
            <th>Page writer</th>
            <td>
              {editor
                ? <a href={editor.userUrl} target="_blank" rel="noreferrer">{editor.name}</a>
                : '—'}
            </td>
          </tr>
          <tr>
            <th>Last edit</th>
            <td>{editor ? formatEditorTime(editor.timestamp) : '—'}</td>
          </tr>
          <tr>
            <th>Writer fees</th>
            <td>
              {editor
                ? <>
                    {feeRouteLabel(editor.held ? 'held' : 'wallet', editor.name)}
                    <div className="mono muted">{short(editor.feeTo)}</div>
                  </>
                : 'Fees reserved for this writer'}
            </td>
          </tr>
        </tbody>
      </table>
    </aside>
  )
}
