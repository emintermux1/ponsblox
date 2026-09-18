export const PEG_PREFIX = 'ROBLOXPAD:'

export type RobloxPadMetadata = {
  name: string
  symbol: string
  description: string
  image: string
  external_url: string
  universe_id: string
  robloxpad: {
    factory: 'Pons V2'
    chainId: number
    ticker: 'ROBLOXPAD'
  }
}

export function encodePegDescription(input: {
  name: string
  universeId: string
  playing: number
}): string {
  return [
    `Paired to ${input.name} on Roblox.`,
    `${input.playing.toLocaleString('en-US')} playing at launch.`,
    `${PEG_PREFIX}${input.universeId}`,
  ].join(' ')
}

export function parsePegHash(description: string): string | null {
  const text = (description || '').trim()
  if (!text) return null
  const idx = text.lastIndexOf(PEG_PREFIX)
  if (idx < 0) return null
  const id = text.slice(idx + PEG_PREFIX.length).trim()
  return /^\d+$/.test(id) ? id : null
}

export function validateMetadata(raw: unknown): { ok: true; value: RobloxPadMetadata } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'Metadata must be an object' }
  const v = raw as Record<string, unknown>
  const name = String(v.name || '').trim()
  const symbol = String(v.symbol || '').trim()
  const description = String(v.description || '').trim()
  const image = String(v.image || '').trim()
  const external_url = String(v.external_url || '').trim()
  const universe_id = String(v.universe_id || '').trim()
  if (!name) return { ok: false, error: 'Metadata name is required' }
  if (!/^[A-Za-z0-9]{2,11}$/.test(symbol)) return { ok: false, error: 'Metadata symbol is invalid' }
  if (!/^\d+$/.test(universe_id)) return { ok: false, error: 'Metadata must include universe_id' }
  if (image && !/^(https:\/\/|ipfs:\/\/)/i.test(image)) return { ok: false, error: 'Metadata image must be https or ipfs' }
  return {
    ok: true,
    value: {
      name,
      symbol: symbol.toUpperCase(),
      description,
      image,
      external_url,
      universe_id,
      robloxpad: { factory: 'Pons V2', chainId: 4663, ticker: 'ROBLOXPAD' },
    },
  }
}
