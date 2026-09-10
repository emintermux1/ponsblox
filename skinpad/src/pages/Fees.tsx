import { useEffect, useState } from 'react'
import { isAddress, type Address } from 'viem'
import { ErrorState } from '../components/ErrorState.tsx'
import { PONS_DOCS_URL, PONS_FEE_ESCROW } from '../config/official.ts'
import { short } from '../lib/chain.ts'
import { onNavClick, tokenPath } from '../lib/router.ts'
import { feeBrief, feePermissionFor, readToken, transferCreatorFeeRecipient, type TokenRecord } from '../lib/pons.ts'
import { useWallet } from '../lib/wallet.tsx'

export function Fees({ address }: { address: string }) {
  const w = useWallet()
  const [token, setToken] = useState<TokenRecord | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [next, setNext] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!isAddress(address)) { setErr('Not an address'); return }
    void readToken(address as Address).then((row) => {
      if (!row) setErr('Not a Pons V2 launch.')
      else setToken(row)
    }).catch((e: Error) => setErr(e.message))
  }, [address])

  const perm = token ? feePermissionFor({ token, wallet: w.address || undefined }) : null

  async function move() {
    if (!token || !w.walletClient || !w.address) return
    setErr(null)
    try {
      const hash = await transferCreatorFeeRecipient(w.walletClient, w.address, token.token, next as Address)
      setNote(`Submitted ${hash}`)
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  return (
    <main className="page">
      <p className="kicker">Creator fees</p>
      <h1>Where fees go</h1>
      <ErrorState error={err} />
      <p className="muted">
        Pons charges creator tax in ETH and holds it in escrow {short(PONS_FEE_ESCROW, 6)}.
        Claim through Pons. SkinPad does not sweep funds for you.{' '}
        <a href={PONS_DOCS_URL} target="_blank" rel="noreferrer">Pons docs</a>
      </p>
      {token && (
        <dl className="kv">
          <div><dt>Token</dt><dd className="mono">{short(token.token, 6)}</dd></div>
          <div><dt>Current recipient</dt><dd className="mono">{short(token.creatorFeeRecipient, 6)}</dd></div>
          <div><dt>Tax</dt><dd>{token.creatorTaxBps / 100}%</dd></div>
          <div><dt>Permission</dt><dd>{feeBrief(perm)}</dd></div>
        </dl>
      )}
      {perm?.kind === 'transfer_recipient' && (
        <div className="row">
          <input className="field" value={next} placeholder="0x new recipient" onChange={(e) => setNext(e.target.value)} />
          <button type="button" className="btn btn--fire" onClick={() => void move()}>Transfer recipient</button>
        </div>
      )}
      {note && <p className="muted">{note}</p>}
      <p><a href={tokenPath(address)} onClick={onNavClick(tokenPath(address))}>Back to token</a></p>
    </main>
  )
}
