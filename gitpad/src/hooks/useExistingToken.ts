import { useEffect, useState } from 'react'
import { isAddress, type Address } from 'viem'
import { reportMarket } from '../lib/api.ts'
import { readPendingRecipient, readToken, type TokenRecord } from '../lib/pons.ts'

export function useExistingToken(address?: string) {
  const [token, setToken] = useState<TokenRecord | null>(null)
  const [pending, setPending] = useState<Awaited<ReturnType<typeof readPendingRecipient>>>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!address) { setToken(null); return }
    if (!isAddress(address)) { setError('Not a valid contract address'); return }
    let live = true
    setBusy(true)
    setError(null)
    void readToken(address as Address)
      .then(async (row) => {
        if (!live) return
        if (!row) { setError('Not a Pons V2 launch'); setToken(null); return }
        setToken(row)
        setPending(await readPendingRecipient(row.token).catch(() => null))
        void reportMarket({
          token: row.token,
          priceRblx: row.priceRblx,
          capRblx: row.capRblx,
          quoteReserve: row.quoteReserve,
          graduated: row.graduated,
        })
      })
      .catch((e: Error) => { if (live) setError(e.message) })
      .finally(() => { if (live) setBusy(false) })
    return () => { live = false }
  }, [address])

  return { token, pending, busy, error }
}
