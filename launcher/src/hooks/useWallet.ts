import { useEffect, useState } from 'react'
import { bootWallet, getWallet, watchWallet, type WalletState } from '../lib/wallet.ts'

export function useWallet(): WalletState {
  const [snap, setSnap] = useState<WalletState>(getWallet())
  useEffect(() => {
    bootWallet()
    return watchWallet(() => setSnap({ ...getWallet() }))
  }, [])
  return snap
}
