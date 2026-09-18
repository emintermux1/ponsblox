import { ChainAlert } from './ChainAlert.tsx'
import { short } from '../lib/chain.ts'
import { useWallet } from '../lib/wallet.tsx'

export function Connect({ compact = false }: { compact?: boolean }) {
  const w = useWallet()

  if (w.address) {
    return (
      <div className="connect">
        {!w.onRightChain && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => void w.switchChain()}>
            Switch
          </button>
        )}
        <button type="button" className="btn btn--ink btn--sm" onClick={() => void w.switchAccount()}>
          {short(w.address)}
        </button>
        {!compact && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={w.disconnect}>
            Out
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="connect">
      <button
        type="button"
        className="btn btn--yellow btn--sm"
        disabled={w.connecting}
        onClick={() => void w.connectMetaMask()}
      >
        {w.connecting ? 'Connecting…' : 'Log in'}
      </button>
      {w.error && (w.error.includes('Robinhood Chain') ? <ChainAlert message={w.error} /> : <span className="err">{w.error}</span>)}
    </div>
  )
}
