import { Disclosure } from '../Disclosure.tsx'
import { FACTORY, short } from '../../lib/chain.ts'
import type { FeeSplit } from '../../lib/gitpad.ts'
import { X_URL } from '../../lib/format.ts'

export function ReviewSheet({
  owner,
  repo,
  githubId,
  displayName,
  symbol,
  metadata,
  fees,
  creatorTax,
  wallet,
  networkCost,
  ack,
  onAck,
}: {
  owner: string
  repo: string
  githubId: number | null
  displayName: string
  symbol: string
  metadata: string
  fees: string
  creatorTax: string
  wallet: string
  networkCost: string
  ack: boolean
  onAck: (v: boolean) => void
}) {
  return (
    <div className="sheet">
      <p className="kicker">Final deployment sheet</p>
      <h2>Review</h2>
      <dl className="kv kv--sheet">
        <div>
          <dt>REPOSITORY</dt>
          <dd>{owner}/{repo}{githubId != null ? <span className="mono"> Repository ID: {githubId}</span> : null}</dd>
        </div>
        <div>
          <dt>TOKEN</dt>
          <dd>{displayName} ${symbol}</dd>
        </div>
        <div>
          <dt>X</dt>
          <dd><a href={X_URL} target="_blank" rel="noreferrer">{X_URL}</a></dd>
        </div>
        <div>
          <dt>METADATA</dt>
          <dd className="mono break">{metadata}</dd>
        </div>
        <div>
          <dt>FACTORY</dt>
          <dd>Pons V2 <span className="mono">{short(FACTORY, 6)}</span></dd>
        </div>
        <div>
          <dt>NETWORK</dt>
          <dd>Robinhood ecosystem · Chain 4663</dd>
        </div>
        <div>
          <dt>CREATOR TAX</dt>
          <dd>{creatorTax}</dd>
        </div>
        <div>
          <dt>FEES</dt>
          <dd>{fees}</dd>
        </div>
        <div>
          <dt>WALLET</dt>
          <dd className="mono">{wallet}</dd>
        </div>
        <div>
          <dt>ESTIMATED NETWORK COST</dt>
          <dd>{networkCost}</dd>
        </div>
      </dl>
      <p className="sheet__sign">
        DEPLOY TOKEN opens your wallet. You will sign <code>launchToken</code> or <code>launchAndBuy</code> on the Pons V2 factory.
        GitPad cannot approve this for you. The token is LIVE only after <code>TokenLaunched</code> is in the receipt.
      </p>
      <label className="check">
        <input type="checkbox" checked={ack} onChange={(e) => onAck(e.target.checked)} />
        I confirm this sheet and I will sign the wallet prompt myself. This does not imply maintainer endorsement.
      </label>
      <Disclosure />
    </div>
  )
}

export function feeSheetLine(input: {
  routeFees: boolean
  splits: FeeSplit[]
}): string {
  if (!input.routeFees || !input.splits.length) return 'Creator wallet receives Pons tax'
  return input.splits.map((s) => `${s.bps / 100}% ${labelRole(s.role)}`).join(' ')
}

function labelRole(role: FeeSplit['role']): string {
  switch (role) {
    case 'HOLDERS': return 'Holders'
    case 'TREASURY': return 'Treasury'
    case 'CREATOR': return 'Creator'
    case 'GITPAD': return 'GitPad'
    case 'OTHER': return 'Other'
    default: {
      const _e: never = role
      return _e
    }
  }
}
