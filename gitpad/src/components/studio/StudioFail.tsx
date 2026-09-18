import type { LaunchFail } from '../../lib/errors.ts'

export function StudioFail({
  fail,
  onRetry,
}: {
  fail: LaunchFail
  onRetry: () => void
}) {
  return (
    <div className="sfail">
      <p className="kicker">Launch failed</p>
      <h2>{fail.title}</h2>
      <p>{fail.message}</p>
      <p className="muted">{fail.next}</p>
      <p className="muted">GitPad will not send another blockchain write automatically.</p>
      <button type="button" className="btn btn--lime" onClick={onRetry}>{fail.retryLabel}</button>
    </div>
  )
}
