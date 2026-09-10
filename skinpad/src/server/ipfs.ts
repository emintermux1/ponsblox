import { validateMetadata } from '../lib/metadata.ts'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export type IpfsPin = {
  cid: string
  uri: string
  gateway: string
  provider: 'pinata'
}

export function ipfsConfigured(): boolean {
  return Boolean(process.env.PINATA_JWT?.trim())
}

export function ipfsStatus() {
  return {
    configured: ipfsConfigured(),
    provider: ipfsConfigured() ? 'pinata' as const : 'none' as const,
    note: ipfsConfigured()
      ? 'Pinata pinFileToIPFS'
      : 'Set PINATA_JWT to enable uploads.',
  }
}

export function pinRecord(cid: string): IpfsPin {
  const hash = cid.trim()
  if (!hash) throw new ApiError(502, 'Pinata returned no CID')
  return {
    cid: hash,
    uri: `ipfs://${hash}`,
    gateway: `https://gateway.pinata.cloud/ipfs/${hash}`,
    provider: 'pinata',
  }
}

export async function pinBytes(bytes: Uint8Array, filename: string, contentType: string): Promise<IpfsPin> {
  const jwt = process.env.PINATA_JWT?.trim()
  if (!jwt) throw new ApiError(503, 'IPFS is not configured. Set PINATA_JWT on the server.')
  const form = new FormData()
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  form.append('file', new Blob([copy], { type: contentType || 'application/octet-stream' }), filename || 'file')
  const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}` },
    body: form,
  })
  const text = await res.text()
  if (!res.ok) throw new ApiError(res.status === 401 ? 503 : 502, `Pinata: ${text.slice(0, 180)}`)
  const json = JSON.parse(text) as { IpfsHash?: string }
  return pinRecord(json.IpfsHash || '')
}

const imagePinCache = new Map<string, IpfsPin>()

/** Pin a real remote image (e.g. the skin's Steam CDN art) and cache the CID per key. */
export async function pinImageUrl(key: string, url: string): Promise<IpfsPin> {
  const cached = imagePinCache.get(key)
  if (cached) return cached
  if (!/^https:\/\//i.test(url)) throw new ApiError(400, 'No https image to pin')
  const res = await fetch(url)
  if (!res.ok) throw new ApiError(502, `Image fetch failed (${res.status})`)
  const bytes = new Uint8Array(await res.arrayBuffer())
  if (!bytes.byteLength) throw new ApiError(502, 'Image fetch returned no bytes')
  const contentType = res.headers.get('content-type') || 'image/png'
  const pin = await pinBytes(bytes, `${key}.png`, contentType)
  imagePinCache.set(key, pin)
  return pin
}

export async function pinJson(value: unknown): Promise<IpfsPin> {
  if (value && typeof value === 'object' && 'market_hash_name' in (value as object)) {
    const checked = validateMetadata(value)
    if (!checked.ok) throw new ApiError(400, checked.error)
    value = checked.value
  }
  const body = new TextEncoder().encode(JSON.stringify(value, null, 2))
  return pinBytes(body, 'metadata.json', 'application/json')
}

function b64ToBytes(data: string): Uint8Array {
  const raw = data.includes(',') ? data.slice(data.indexOf(',') + 1) : data
  const buf = Buffer.from(raw, 'base64')
  return new Uint8Array(buf)
}

export async function handleIpfsBody(body: unknown): Promise<IpfsPin> {
  const b = (body || {}) as {
    kind?: string
    filename?: string
    contentType?: string
    data?: string
    json?: unknown
  }
  if (b.kind === 'json' || b.json !== undefined) {
    return pinJson(b.json ?? {})
  }
  if (!b.data) throw new ApiError(400, 'Missing file data')
  return pinBytes(b64ToBytes(b.data), b.filename || 'image', b.contentType || 'application/octet-stream')
}
