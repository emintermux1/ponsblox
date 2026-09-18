import { parseCustom, type CustomSkin } from './custom.ts'
import { kitIdOrDefault, type KitId } from './kits.ts'
import type { SupportedChain } from './chain.ts'
import type { CurveId } from './copy.ts'

export type PadMeta = {
  name: string
  slug: string
  brandURI: string
  kit: KitId
  custom?: CustomSkin
  chain: SupportedChain
  ownerFeeBps: number
  creatorFeeBps: number
  launchFeeWei: string
  curveId: CurveId
}

export function encodeBrandURI(meta: Pick<PadMeta, 'kit' | 'brandURI' | 'custom'>): string {
  if (meta.brandURI.startsWith('https://') || meta.brandURI.startsWith('ipfs://')) {
    return `${meta.brandURI}#${kitQuery(meta)}`
  }
  return meta.kit === 'custom' && meta.custom
    ? `kit:custom#${kitQuery(meta)}`
    : `kit:${meta.kit}`
}

function kitQuery(meta: Pick<PadMeta, 'kit' | 'custom'>): string {
  if (meta.kit !== 'custom' || !meta.custom) return `kit=${meta.kit}`
  const q = new URLSearchParams({
    kit: 'custom',
    a: meta.custom.accent.replace('#', ''),
    i: meta.custom.ink.replace('#', ''),
    p: meta.custom.paper.replace('#', ''),
    m: meta.custom.muted.replace('#', ''),
    s: meta.custom.stroke.replace('#', ''),
    r: meta.custom.radius.replace('px', ''),
  })
  return q.toString()
}

function kitToken(raw: string | null | undefined): KitId | null {
  if (!raw) return null
  const id = raw.trim().toLowerCase().split(/[#?&/\s]/)[0] || ''
  if (!id) return null
  return kitIdOrDefault(id)
}

/** Reads kit:bags, kit=bags, #kit=bags, or JSON { "kit": "bags" }. Empty URI is pons. */
export function kitFromBrandURI(uri: string): KitId {
  const text = (uri || '').trim()
  if (!text) return 'pons'
  if (text.startsWith('{') || text.startsWith('[')) {
    try {
      const json = JSON.parse(text) as { kit?: unknown }
      const fromJson = kitToken(typeof json.kit === 'string' ? json.kit : '')
      if (fromJson) return fromJson
    } catch {
      /* not JSON */
    }
  }
  const hash = text.includes('#') ? text.slice(text.indexOf('#') + 1) : ''
  const fromHash = kitToken(new URLSearchParams(hash).get('kit'))
  if (fromHash && hash) return fromHash
  const eq = text.match(/(?:^|[?#&])kit=([a-z0-9-]+)/i)
  if (eq?.[1]) return kitIdOrDefault(eq[1].toLowerCase())
  const colon = text.match(/kit:([a-z0-9-]+)/i)
  if (colon?.[1]) return kitIdOrDefault(colon[1].toLowerCase())
  return 'pons'
}

export function customFromBrandURI(uri: string): CustomSkin | null {
  if (kitFromBrandURI(uri) !== 'custom') return null
  const hash = uri.includes('#') ? uri.slice(uri.indexOf('#') + 1) : ''
  if (!hash) return parseCustom('')
  return parseCustom(hash)
}

export function padNameOnPons(tokenName: string, padName: string): string {
  const base = tokenName.trim()
  const suffix = ` by ${padName.trim()}`
  if (base.toLowerCase().endsWith(suffix.toLowerCase())) return base
  return `${base}${suffix}`
}
