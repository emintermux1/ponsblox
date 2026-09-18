import { CopyButton } from '../CopyButton.tsx'
import { ShareStudio } from '../ShareStudio.tsx'
import { txUrl } from '../../lib/chain.ts'
import { onNavClick } from '../../lib/router.ts'

export function StudioSuccess({
  name,
  symbol,
  owner,
  repo,
  token,
  hash,
  stars,
  registryAvailable,
  registryBusy,
  registryDone,
  onWriteRegistry,
}: {
  name: string
  symbol: string
  owner: string
  repo: string
  token: string
  hash: string
  stars?: number | null
  registryAvailable?: boolean
  registryBusy?: boolean
  registryDone?: boolean
  onWriteRegistry?: () => void
}) {
  return (
    <div className="ssuccess ssuccess--in">
      <p className="kicker">GitPad · Pons V2</p>
      <p className="ssuccess__live">LIVE</p>
      <h1>{name}</h1>
      <p className="lede">${symbol}</p>
      <p className="sprev__pair">
        paired with
        <b>{owner}/{repo}</b>
      </p>
      <p className="kicker">CONTRACT</p>
      <p className="ssuccess__ca mono">{token}</p>
      {registryAvailable && (
        <p className="muted">
          The token is live on Pons. Writing the GitPad registry is a separate wallet signature — it is not sent automatically.
        </p>
      )}
      <div className="hero__cta">
        <a className="btn btn--lime btn--lg" href={`/token/${token}`} onClick={onNavClick(`/token/${token}`)}>View Token</a>
        <CopyButton value={token} label="Copy CA" className="btn btn--paper btn--lg" />
        <a className="btn btn--ghost btn--lg" href={txUrl(hash)} target="_blank" rel="noreferrer">View Transaction</a>
        {registryAvailable && onWriteRegistry && (
          <button type="button" className="btn btn--ink btn--lg" disabled={registryBusy || registryDone} onClick={onWriteRegistry}>
            {registryDone ? 'Registry written' : registryBusy ? 'Sign registry…' : 'Write repository registry'}
          </button>
        )}
      </div>
      <ShareStudio
        name={name}
        symbol={symbol}
        owner={owner}
        repo={repo}
        token={token}
        hash={hash}
        stars={stars}
      />
    </div>
  )
}
