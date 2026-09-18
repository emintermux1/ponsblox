import { addressUrl, short } from '../lib/chain.ts'
import { COPY } from '../lib/copy.ts'
import { feeRouteLabel, formatEditorTime } from '../lib/editorFees.ts'
import type { PageEditor } from '../lib/wiki.ts'

export function PageEditorCard({ editor }: { editor: PageEditor | null }) {
  if (!editor) {
    return (
      <section>
        <h2>Page writer</h2>
        <p className="muted">Wikipedia did not return a last writer for this page.</p>
        <p className="muted">{COPY.editorFees}</p>
      </section>
    )
  }
  const kind = editor.held ? 'held' : 'wallet'
  return (
    <section>
      <h2>Page writer</h2>
      <table className="wikitable">
        <tbody>
          <tr>
            <th>Writer</th>
            <td>
              <a href={editor.userUrl} target="_blank" rel="noreferrer">{editor.name}</a>
            </td>
          </tr>
          <tr>
            <th>Last edit</th>
            <td>{formatEditorTime(editor.timestamp)}</td>
          </tr>
          <tr>
            <th>Fee destination</th>
            <td>
              {feeRouteLabel(kind, editor.name)}
              {' · '}
              <a className="mono" href={addressUrl(editor.feeTo)} target="_blank" rel="noreferrer">
                {short(editor.feeTo)}
              </a>
              {editor.held && <div className="muted">{COPY.reservedFees}</div>}
            </td>
          </tr>
        </tbody>
      </table>
      <p className="muted">{COPY.editorFees}</p>
    </section>
  )
}
