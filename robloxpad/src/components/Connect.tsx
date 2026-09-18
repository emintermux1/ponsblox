import { short } from '../lib/chain.ts'
import { useWallet } from '../lib/wallet.tsx'

export function Connect() {
  const w = useWallet()

  if (w.address) {
    return (
      <div className="connect connect--on">
        {!w.onRightChain && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => void w.switchChain()}>
            Switch chain
          </button>
        )}
        <button type="button" className="btn btn--ink btn--sm" onClick={() => void w.switchAccount()}>
          {short(w.address)}
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={w.disconnect}>
          Out
        </button>
      </div>
    )
  }

  return (
    <div className="connect">
      <button
        type="button"
        className="btn btn--fire btn--sm"
        disabled={w.connecting}
        onClick={() => void w.connectMetaMask()}
      >
        {w.connecting ? 'Connecting…' : 'Connect'}
      </button>
      {w.error && <span className="err connect__err">{w.error}</span>}
    </div>
  )
}
