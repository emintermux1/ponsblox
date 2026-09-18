import type { DeployPhase } from '../lib/deployPhase.ts'

export type DeployLine = {
  text: string
  ok?: boolean
  err?: boolean
}

export function DeployTerminal({
  lines,
  phase,
  live,
}: {
  lines: DeployLine[]
  phase: DeployPhase
  live?: boolean
}) {
  const waiting = phase === 'AWAITING_SIGNATURE' || phase === 'CONFIRMING'
  return (
    <div className={`dterm ${live ? 'dterm--full' : ''}`} aria-live="polite">
      <div className="term__bar">
        <span /><span /><span />
        <em>GITPAD DEPLOYMENT</em>
      </div>
      <p className="dterm__phase mono">{phase}</p>
      <ol>
        {lines.map((line, i) => (
          <li key={`${i}-${line.text}`} className={line.err ? 'is-err' : line.ok === false ? '' : 'is-on'}>
            <i>{line.err ? 'x' : line.ok === false ? '>' : '✓'}</i>
            {line.text}
          </li>
        ))}
        {waiting && <li className="is-now"><i>&gt;</i>WAITING...<em className="dterm__cursor" /></li>}
        {!!lines.length && !waiting && phase !== 'SUCCESS' && phase !== 'FAILED' && (
          <li className="is-now"><i>&gt;</i><em className="dterm__cursor" /></li>
        )}
      </ol>
    </div>
  )
}
