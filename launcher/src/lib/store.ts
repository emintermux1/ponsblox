import type { Address, Hex } from 'viem'
import type { SupportedChain } from './chain.ts'
import type { CustomSkin } from './custom.ts'
import type { KitId } from './kits.ts'

export type LocalPad = {
  slug: string
  name: string
  chain: SupportedChain
  hash: Hex
  owner: Address
  kit?: KitId
  custom?: CustomSkin
  ownerFeeBps?: number
  creatorFeeBps?: number
  createdAt: number
}

const KEY = 'launcher.pads.v1'

export function rememberPad(pad: LocalPad) {
  const all = listRemembered().filter((p) => p.slug !== pad.slug)
  all.unshift(pad)
  localStorage.setItem(KEY, JSON.stringify(all.slice(0, 40)))
}

export function listRemembered(): LocalPad[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as LocalPad[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function findRemembered(slug: string): LocalPad | null {
  return listRemembered().find((p) => p.slug === slug) ?? null
}
