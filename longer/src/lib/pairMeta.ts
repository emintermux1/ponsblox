import type { Address } from 'viem'
import { ASSETS, getAsset, getAssetByAddress, type AssetId, type LeveragedAsset } from './assets'
import { SITE_URL } from './official'

const TAG = /\[LONGER:(NVDA3X|META3X|TSLA3X|AAPL3X|MSFT3X)\]/

export function encodePairDescription(description: string, pairId: AssetId): string {
  const tag = `[LONGER:${pairId}]`
  const body = description.replace(TAG, '').trim()
  return body ? `${body}\n${tag}` : tag
}

export function encodePairWebsite(website: string, pairId: AssetId, pairToken?: string): string {
  const v = website.trim()
  if (v) return v
  const url = new URL(SITE_URL)
  url.searchParams.set('pair', pairId)
  if (pairToken) url.searchParams.set('pairToken', pairToken)
  return url.toString()
}

export function pairTokenAddress(pairId: AssetId): Address | '' {
  return getAsset(pairId)?.address || getAsset('NVDA3X')?.address || ''
}

export function decodePairId(...texts: string[]): AssetId | null {
  for (const text of texts) {
    const hit = text.match(TAG)
    if (hit) return hit[1] as AssetId
    try {
      const url = new URL(text, SITE_URL)
      const q = url.searchParams.get('pair')
      if (q && getAsset(q)) return getAsset(q)!.id
    } catch {
      /* ignore */
    }
  }
  return null
}

export function displayPair(pairToken: Address | string, ...texts: string[]): LeveragedAsset | null {
  const byAddr = getAssetByAddress(pairToken)
  if (byAddr) return byAddr
  const tagged = decodePairId(...texts)
  if (tagged) return getAsset(tagged) ?? null
  return null
}

export function launchableAssets(list: LeveragedAsset[] = ASSETS): LeveragedAsset[] {
  return list.filter((a) => Boolean(a.address))
}
