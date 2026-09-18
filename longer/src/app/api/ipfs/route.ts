import { NextResponse } from 'next/server'
import { validateMetadata } from '@/lib/metadata'

export const runtime = 'nodejs'

type IpfsPin = {
  cid: string
  uri: string
  gateway: string
  provider: 'pinata'
}

function pinRecord(cid: string): IpfsPin {
  const hash = cid.trim()
  if (!hash) throw new Error('Pinata returned no CID')
  return {
    cid: hash,
    uri: `ipfs://${hash}`,
    gateway: `https://gateway.pinata.cloud/ipfs/${hash}`,
    provider: 'pinata',
  }
}

function b64ToBytes(data: string): Uint8Array {
  const raw = data.includes(',') ? data.slice(data.indexOf(',') + 1) : data
  return Uint8Array.from(Buffer.from(raw, 'base64'))
}

async function pinBytes(bytes: Uint8Array, filename: string, contentType: string): Promise<IpfsPin> {
  const jwt = process.env.PINATA_JWT?.trim()
  if (!jwt) throw new Error('IPFS is not configured. Set PINATA_JWT on the server.')
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
  if (!res.ok) throw new Error(`Pinata: ${text.slice(0, 180)}`)
  const json = JSON.parse(text) as { IpfsHash?: string }
  return pinRecord(json.IpfsHash || '')
}

async function handleBody(body: unknown): Promise<IpfsPin> {
  const b = (body || {}) as {
    kind?: string
    filename?: string
    contentType?: string
    data?: string
    json?: unknown
  }
  if (b.kind === 'json' || b.json !== undefined) {
    const raw = b.json ?? {}
    const checked = raw && typeof raw === 'object' && 'pair' in (raw as object)
      ? validateMetadata(raw)
      : { ok: true as const, value: raw }
    if (!checked.ok) throw new Error(checked.error)
    const bytes = new TextEncoder().encode(JSON.stringify(checked.value, null, 2))
    return pinBytes(bytes, 'metadata.json', 'application/json')
  }
  if (!b.data) throw new Error('Missing file data')
  return pinBytes(b64ToBytes(b.data), b.filename || 'image', b.contentType || 'application/octet-stream')
}

export async function GET() {
  const jwt = Boolean(process.env.PINATA_JWT?.trim())
  return NextResponse.json({
    configured: jwt,
    provider: jwt ? 'pinata' : 'none',
    note: jwt ? 'Pinata pinFileToIPFS' : 'Set PINATA_JWT to enable uploads.',
  })
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const pin = await handleBody(body)
    return NextResponse.json(pin)
  } catch (e) {
    const message = (e as Error).message || 'IPFS upload failed'
    const status = /not configured/i.test(message) ? 503 : 502
    return NextResponse.json({ error: message }, { status })
  }
}
