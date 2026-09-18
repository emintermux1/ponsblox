'use client'

import { useEffect, useState } from 'react'
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi'
import { robinhood, short } from '@/lib/chain'

export function ConnectWallet() {
  const { address, chainId, isConnecting } = useAccount()
  const { connectors, connect, error } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain } = useSwitchChain()
  const [open, setOpen] = useState(false)
  const onRightChain = chainId === robinhood.id
  const unique = connectors.filter((c, i, all) => all.findIndex((x) => x.id === c.id) === i)

  useEffect(() => {
    if (address) setOpen(false)
  }, [address])

  if (address) {
    return (
      <div className="flex items-center gap-2">
        {!onRightChain && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => switchChain({ chainId: robinhood.id })}
          >
            Switch chain
          </button>
        )}
        <button type="button" className="btn btn-ink min-h-10 px-2.5 sm:px-3" onClick={() => disconnect()}>
          {short(address)}
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        type="button"
        className="btn btn-ink min-h-10 px-2.5 sm:px-3"
        disabled={isConnecting}
        onClick={() => {
          if (unique.length === 1) {
            connect({ connector: unique[0] })
            return
          }
          setOpen((v) => !v)
        }}
      >
        {isConnecting ? 'Connecting…' : (
          <>
            <span className="md:hidden">Connect</span>
            <span className="hidden md:inline">Connect Wallet</span>
          </>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-30 min-w-[200px] border border-line bg-panel p-1">
          {unique.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted">No wallet detected. Install one, then refresh.</p>
          )}
          {unique.map((c) => (
            <button
              key={c.uid}
              type="button"
              className="block w-full px-3 py-2 text-left text-sm text-paper hover:bg-ink"
              onClick={() => connect({ connector: c })}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
      {error && <p className="absolute right-0 top-full mt-1 whitespace-nowrap text-[11px] text-danger">{error.message}</p>}
    </div>
  )
}
