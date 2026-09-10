export const PEG_PREFIX = 'SKINPAD:'

export type SkinPadMetadata = {
  name: string
  symbol: string
  description: string
  image: string
  external_url: string
  market_hash_name: string
  quote_usd: number | null
  quoted_at: string
  source: 'steam_median'
  skinpad: {
    factory: 'Pons V2'
    chainId: number
    ticker: 'SKINPAD'
  }
}

export function encodePegDescription(input: {
  marketHashName: string
  quoteUsd: number | null
  quotedAt: string
}): string {
  const quote = input.quoteUsd == null ? 'unavailable' : `$${input.quoteUsd.toFixed(2)}`
  return [
    `Pegged one to one to ${input.marketHashName}.`,
    `Steam median at launch: ${quote} (${input.quotedAt}).`,
    `${PEG_PREFIX}${input.marketHashName}`,
  ].join(' ')
}

export function parsePegHash(description: string): string | null {
  const text = (description || '').trim()
  if (!text) return null
  const idx = text.lastIndexOf(PEG_PREFIX)
  if (idx < 0) return null
  const name = text.slice(idx + PEG_PREFIX.length).trim()
  return name || null
}

export function validateMetadata(raw: unknown): { ok: true; value: SkinPadMetadata } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'Metadata must be an object' }
  const v = raw as Record<string, unknown>
  const name = String(v.name || '').trim()
  const symbol = String(v.symbol || '').trim()
  const description = String(v.description || '').trim()
  const image = String(v.image || '').trim()
  const external_url = String(v.external_url || '').trim()
  const market_hash_name = String(v.market_hash_name || '').trim()
  const quoted_at = String(v.quoted_at || '').trim()
  const quoteRaw = v.quote_usd
  const quote_usd = quoteRaw == null || quoteRaw === '' ? null : Number(quoteRaw)
  if (!name) return { ok: false, error: 'Metadata name is required' }
  if (!/^[A-Za-z0-9]{2,11}$/.test(symbol)) return { ok: false, error: 'Metadata symbol is invalid' }
  if (!market_hash_name) return { ok: false, error: 'Metadata must include market_hash_name' }
  if (quote_usd != null && !Number.isFinite(quote_usd)) return { ok: false, error: 'Metadata quote_usd is invalid' }
  if (image && !/^(https:\/\/|ipfs:\/\/)/i.test(image)) return { ok: false, error: 'Metadata image must be https or ipfs' }
  return {
    ok: true,
    value: {
      name,
      symbol: symbol.toUpperCase(),
      description,
      image,
      external_url,
      market_hash_name,
      quote_usd,
      quoted_at,
      source: 'steam_median',
      skinpad: { factory: 'Pons V2', chainId: 4663, ticker: 'SKINPAD' },
    },
  }
}
