import { useCallback, useState } from 'react'
import type { Hash } from 'viem'
import { publicClient } from '../lib/chain.ts'

export type TxPhase = 'idle' | 'simulating' | 'signing' | 'pending' | 'success' | 'reverted' | 'error'

export function useTransactionStatus() {
  const [phase, setPhase] = useState<TxPhase>('idle')
  const [hash, setHash] = useState<Hash | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [locked, setLocked] = useState(false)

  const wait = useCallback(async (tx: Hash) => {
    setHash(tx)
    setPhase('pending')
    const receipt = await publicClient.waitForTransactionReceipt({ hash: tx })
    if (receipt.status === 'reverted') {
      setPhase('reverted')
      throw new Error('Transaction reverted on chain')
    }
    setPhase('success')
    return receipt
  }, [])

  const guard = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    if (locked) return undefined
    setLocked(true)
    setError(null)
    try {
      return await fn()
    } catch (e) {
      setPhase('error')
      setError((e as Error).message)
      throw e
    } finally {
      setLocked(false)
    }
  }, [locked])

  return { phase, hash, error, locked, setPhase, wait, guard }
}
