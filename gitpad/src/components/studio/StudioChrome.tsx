import { ART } from '../../lib/chain.ts'
import { X_URL } from '../../lib/format.ts'
import { onNavClick } from '../../lib/router.ts'
import { Connect } from '../Connect.tsx'
import { LiveOnPons } from '../LiveOnPons.tsx'

export function StudioChrome({
  mode,
  onMode,
  previewOpen,
  onPreview,
}: {
  mode: 'new' | 'existing'
  onMode: (m: 'new' | 'existing') => void
  previewOpen?: boolean
  onPreview?: () => void
}) {
  return (
    <header className="studio__bar">
      <a className="studio__brand" href="/" onClick={onNavClick('/')} aria-label="Leave Launch Studio">
        <img src={ART.lockup} alt="GitPad" />
      </a>
      <div className="studio__modes">
        <button type="button" className={mode === 'new' ? 'is-on' : ''} onClick={() => onMode('new')}>NEW TOKEN</button>
        <button type="button" className={mode === 'existing' ? 'is-on' : ''} onClick={() => onMode('existing')}>EXISTING TOKEN</button>
      </div>
      <div className="studio__right">
        {onPreview && (
          <button type="button" className={`studio__pv ${previewOpen ? 'is-on' : ''}`} onClick={onPreview}>
            {previewOpen ? 'Configure' : 'Preview'}
          </button>
        )}
        <a className="mono studio__launches" href="/dashboard/launches" onClick={onNavClick('/dashboard/launches')}>Launches</a>
        <a className="mono studio__launches" href={X_URL} target="_blank" rel="noreferrer">X</a>
        <LiveOnPons />
        <Connect />
      </div>
    </header>
  )
}
