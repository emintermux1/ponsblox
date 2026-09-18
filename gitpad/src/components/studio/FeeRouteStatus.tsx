import { Connect } from '../Connect.tsx'
import { short } from '../../lib/chain.ts'
import { feeRouterLive } from '../../lib/gitpad.ts'
import type { FeePermission } from '../../lib/pons.ts'

export function FeeRouteStatus({ perm }: { perm: FeePermission | null }) {
  if (!perm) return null
  switch (perm.kind) {
    case 'router_set':
      return <p className="ok">Creator tax already hits GitPadFeeRouter. Activate writes the split.</p>
    case 'transfer_recipient':
      return (
        <p className="ok">
          Creator wallet connected.
          {feeRouterLive()
            ? ' Activate sends transferCreatorFeeRecipient, then setRoute. You only sign.'
            : ' Activate can move the Pons recipient. setRoute waits until GitPadFeeRouter is set.'}
        </p>
      )
    case 'need_creator':
      return (
        <>
          <p className="ok">Connect the creator wallet.</p>
          <p>GitPad sends the fee transactions from that wallet after you click Activate. You only sign.</p>
          <p className="mono break">{perm.creator}</p>
          {perm.connected && (
            <p className="muted">Connected {short(perm.connected)} is not the creator. Switch account.</p>
          )}
          <Connect />
        </>
      )
    case 'unsupported':
      return <p className="muted">{perm.reason}</p>
    default: {
      const _e: never = perm
      return _e
    }
  }
}
