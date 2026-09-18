import { isAddress, type Address } from 'viem'
import { PONS_FEE_ESCROW } from '../config/official.ts'
import { timeAgoMs } from './format.ts'

function env(name: string): string {
  const fromProcess = typeof process !== 'undefined' ? process.env[name] : undefined
  const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  const fromVite = viteEnv?.[name]
  return (fromProcess || fromVite || '').trim()
}

export type EditorFeeKind = 'wallet' | 'held'

/** Hold destination when the editor has no wallet on their User page. Never invents a CA. */
export function editorHoldRecipient(): Address {
  const vault = env('VITE_EDITOR_FEE_VAULT')
  const router = env('VITE_GITPAD_FEE_ROUTER')
  if (vault && isAddress(vault)) return vault as Address
  if (router && isAddress(router)) return router as Address
  return PONS_FEE_ESCROW
}

export function resolveEditorFeeTo(wallet: string | null | undefined): { feeTo: Address; kind: EditorFeeKind } {
  const w = (wallet || '').trim()
  if (w && isAddress(w)) return { feeTo: w as Address, kind: 'wallet' }
  return { feeTo: editorHoldRecipient(), kind: 'held' }
}

export function feePctLabel(bps: number): string {
  const pct = bps / 100
  return `${pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(2)}%`
}

export function feeRouteLabel(kind: EditorFeeKind, name: string): string {
  switch (kind) {
    case 'wallet':
      return name ? `Writer wallet · ${name}` : 'Writer wallet'
    case 'held':
      return name ? `Fees reserved for this writer · ${name}` : 'Fees reserved for this writer'
    default: {
      const _e: never = kind
      return _e
    }
  }
}

export function editorUserUrl(name: string): string {
  return `https://en.wikipedia.org/wiki/User:${encodeURIComponent(name.replace(/ /g, '_'))}`
}

export function formatEditorTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return iso
  return timeAgoMs(ms)
}
