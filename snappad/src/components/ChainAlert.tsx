import { WRONG_CHAIN_MSG } from '../lib/chain.ts'
import { useWallet } from '../lib/wallet.tsx'

export function ChainAlert({ message = WRONG_CHAIN_MSG }: { message?: string }) {
  const w = useWallet()
  return (
    <p className="err" role="alert">
      {message}
      <button type="button" className="btn btn--ghost" onClick={() => void w.switchChain()}>
        Switch network
      </button>
    </p>
  )
}
