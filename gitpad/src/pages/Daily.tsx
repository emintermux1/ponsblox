import { useEffect, useState } from 'react'
import { CopyButton } from '../components/CopyButton.tsx'
import { EmptyState, ErrorState } from '../components/ErrorState.tsx'
import { fetchDaily, type DailyPage } from '../lib/api.ts'
import { gitpadUrl, shareIntentUrl } from '../lib/copy.ts'
import { shareOgSrc } from '../lib/share.ts'
import { onNavClick } from '../lib/router.ts'

export function Daily() {
  const [page, setPage] = useState<DailyPage | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [reviewed, setReviewed] = useState(false)

  useEffect(() => {
    void fetchDaily()
      .then((row) => {
        setPage(row)
        const tops = row.sections[0]?.lines.slice(0, 3).map((l) => l.label).join(', ')
        setDraft(`GitPad Daily — ${row.dateLabel}\n${tops || 'No top repositories yet.'}\n${typeof location !== 'undefined' ? location.origin : ''}/daily`)
      })
      .catch((e: Error) => setErr(e.message))
  }, [])

  const og = shareOgSrc({
    layout: 'daily',
    title: page?.dateLabel || 'GitPad Daily',
    stars: page ? `${page.sections[0]?.lines.length || 0} ranked repositories` : '',
  })

  return (
    <main className="ink paper--page dailypage">
      <p className="kicker">GitPad Daily</p>
      <h1>{page?.dateLabel || '…'}</h1>
      {page?.note ? <p className="muted">{page.note}</p> : null}
      <ErrorState error={err} />
      {!page && !err && <p className="muted">Loading…</p>}
      {page?.sections.map((sec) => (
        <section key={sec.id}>
          <h2>{sec.title}</h2>
          {!sec.lines.length && <EmptyState title="Empty" body={sec.empty} />}
          <ol className="daily__list">
            {sec.lines.map((line) => (
              <li key={`${sec.id}-${line.label}`}>
                <span className="mono">{line.rank != null ? String(line.rank).padStart(2, '0') : '—'}</span>
                <a href={line.href} onClick={onNavClick(line.href)}><strong>{line.label}</strong></a>
                <em>{line.meta}</em>
              </li>
            ))}
          </ol>
        </section>
      ))}
      {page && (
        <section className="share">
          <img src={og} alt="GitPad Daily card" width={600} height={315} />
          <label>
            Share text
            <textarea className="field share__draft" rows={5} value={draft} onChange={(e) => { setDraft(e.target.value); setReviewed(false) }} />
          </label>
          <label className="check">
            <input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} />
            I reviewed this post.
          </label>
          <div className="hero__cta">
            <a className="btn btn--lime" href={reviewed ? shareIntentUrl(draft) : undefined} target="_blank" rel="noreferrer" onClick={(e) => { if (!reviewed) e.preventDefault() }}>
              Share on X
            </a>
            <CopyButton value={gitpadUrl('/daily')} label="Copy GitPad Link" />
          </div>
        </section>
      )}
    </main>
  )
}
