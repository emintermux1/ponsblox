import { RPC_BUSY } from '../lib/safeError.ts'

export function RpcNotice({ onRetry }: { onRetry: () => void }) {
  return (
    <p className="rpc-notice">
      {RPC_BUSY}{' '}
      <button type="button" className="linkish" onClick={onRetry}>Retry</button>
    </p>
  )
}
