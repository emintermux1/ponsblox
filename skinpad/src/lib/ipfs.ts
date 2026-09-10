export type IpfsStatus = {
  configured: boolean
  provider: 'pinata' | 'none'
  note: string
}

export type IpfsPin = {
  cid: string
  uri: string
  gateway: string
  provider: 'pinata'
}

export async function fetchIpfsStatus(): Promise<IpfsStatus> {
  const res = await fetch('/api/ipfs')
  const json = await res.json().catch(() => ({})) as IpfsStatus & { error?: string }
  if (!res.ok) throw new Error(json.error || 'Could not read IPFS status')
  return json
}

async function postPin(body: unknown): Promise<IpfsPin> {
  const res = await fetch('/api/ipfs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({})) as IpfsPin & { error?: string }
  if (!res.ok) throw new Error(json.error || 'IPFS upload failed')
  return json
}

export async function uploadFile(file: File): Promise<IpfsPin> {
  const data = await new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onerror = () => reject(new Error('Could not read file'))
    r.onload = () => resolve(String(r.result || ''))
    r.readAsDataURL(file)
  })
  return postPin({ kind: 'file', filename: file.name, contentType: file.type, data })
}

export async function uploadMetadata(json: unknown): Promise<IpfsPin> {
  return postPin({ kind: 'json', json })
}

/** Ask the server to pin the skin's real Steam CDN art; returns a real CID. */
export async function pinSkinArt(skinId: string): Promise<IpfsPin> {
  return postPin({ kind: 'skin', id: skinId })
}
