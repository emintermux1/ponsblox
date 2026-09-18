import type { ReactNode } from 'react'
import { classifyError } from '../lib/errors.ts'

export function ErrorState({ error }: { error: string | null | undefined }) {
  if (!error) return null
  const row = classifyError(error)
  return (
    <div className="estate" role="alert">
      <strong>{row.message}</strong>
      <p>{row.next}</p>
    </div>
  )
}

export function EmptyState({ title, body, children }: { title: string; body: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      <p className="muted">{body}</p>
      {children && <div className="empty__cta">{children}</div>}
    </div>
  )
}

export function SkeletonGrid({ n = 8 }: { n?: number }) {
  return (
    <div className="skin-grid">
      {Array.from({ length: n }, (_, i) => <div key={i} className="skel" />)}
    </div>
  )
}
