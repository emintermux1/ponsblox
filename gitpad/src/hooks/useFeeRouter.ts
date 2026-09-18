import { useCallback, useEffect, useState } from 'react'
import { formatUnits, isAddress, type Address } from 'viem'
import { feeRouterLive, readDistributed, readFeeHistory, readFeeRoute, setFeeRoute, type DistEvent, type FeeSplit, validateSplits } from '../lib/gitpad.ts'
import { useWallet } from '../lib/wallet.tsx'
import { useTransactionStatus } from './useTransactionStatus.ts'

export function useFeeRouter(token?: string) {
  const w = useWallet()
  const tx = useTransactionStatus()
  const [splits, setSplits] = useState<FeeSplit[]>([])
  const [distributed, setDistributed] = useState('0')
  const [history, setHistory] = useState<DistEvent[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token || !isAddress(token) || !feeRouterLive()) return
    let live = true
    void Promise.all([
      readFeeRoute(token as Address),
      readDistributed(token as Address),
      readFeeHistory(token as Address),
    ]).then(([route, total, events]) => {
      if (!live) return
      setSplits(route)
      setDistributed(formatUnits(total, 18))
      setHistory(events)
    }).catch((e: Error) => { if (live) setError(e.message) })
    return () => { live = false }
  }, [token])

  const save = useCallback(async (next: FeeSplit[]) => {
    if (!w.address || !w.walletClient || !token || !isAddress(token)) throw new Error('Connect a wallet')
    const err = validateSplits(next)
    if (err) throw new Error(err)
    return tx.guard(() => setFeeRoute(w.walletClient!, w.address!, token as Address, next))
  }, [w, token, tx])

  return { splits, setSplits, distributed, history, live: feeRouterLive(), save, error, locked: tx.locked }
}
