import { short } from '../lib/chain.ts'
import { useWallet } from '../lib/wallet.tsx'

export function Connect() {
  const w = useWallet()

  if (w.address) {
    return (
      <div className="connect">
        {!w.onRightChain && (
          <button type="button" className="linkish" onClick={() => void w.switchChain()}>
            Switch to Robinhood Chain
          </button>
        )}
        <button type="button" className="linkish" onClick={() => void w.switchAccount()}>
          {short(w.address)}
        </button>
        <button type="button" className="linkish" onClick={w.disconnect}>
          Disconnect
        </button>
        {w.error && <span className="err">{w.error}</span>}
      </div>
    )
  }

  return (
    <div className="connect">
      <button type="button" className="linkish" disabled={w.connecting} onClick={() => void w.connectMetaMask()}>
        {w.connecting ? 'Connecting…' : 'Connect wallet'}
      </button>
      {w.error && <span className="err">{w.error}</span>}
    </div>
  )
}
