import type { AssetId } from './assets'
import { byLongerName } from './naming'
import { isPublicImage, publicTokenImage, SITE_URL } from './official'

export type LongerMetadata = {
  name: string
  symbol: string
  description: string
  image: string
  external_url: string
  pair: AssetId
  pairToken: string
  longer: {
    factory: 'Pons V2'
    chainId: number
    suffix: 'by LONGER'
  }
}

export function buildLongerMetadata(input: {
  name: string
  symbol: string
  description: string
  image: string
  website: string
  pairId: AssetId
  pairToken: string
}): LongerMetadata {
  const name = byLongerName(input.name)
  const symbol = input.symbol.trim().toUpperCase()
  const image = publicTokenImage(input.image)
  const external_url = input.website.trim() || SITE_URL
  return {
    name,
    symbol,
    description: input.description.trim(),
    image,
    external_url,
    pair: input.pairId,
    pairToken: input.pairToken,
    longer: { factory: 'Pons V2', chainId: 4663, suffix: 'by LONGER' },
  }
}

export function validateMetadata(raw: unknown): { ok: true; value: LongerMetadata } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'Metadata must be an object' }
  const v = raw as Record<string, unknown>
  const name = String(v.name || '').trim()
  const symbol = String(v.symbol || '').trim()
  const image = String(v.image || '').trim()
  const pair = String(v.pair || '').trim() as AssetId
  const pairToken = String(v.pairToken || '').trim()
  if (!name) return { ok: false, error: 'Metadata name is required' }
  if (!/ by LONGER$/i.test(name)) return { ok: false, error: 'Metadata name must end with by LONGER' }
  if (!/^[A-Za-z0-9]{2,11}$/.test(symbol)) return { ok: false, error: 'Metadata symbol is invalid' }
  if (image && !isPublicImage(image)) return { ok: false, error: 'Metadata image must be https or ipfs' }
  if (!pair) return { ok: false, error: 'Metadata pair is required' }
  if (pairToken && !/^0x[a-fA-F0-9]{40}$/.test(pairToken)) return { ok: false, error: 'Metadata pairToken is not a CA' }
  return {
    ok: true,
    value: buildLongerMetadata({
      name,
      symbol,
      description: String(v.description || ''),
      image,
      website: String(v.external_url || ''),
      pairId: pair,
      pairToken,
    }),
  }
}
