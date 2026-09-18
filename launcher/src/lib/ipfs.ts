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
  if (!res.ok) {
    return { configured: false, provider: 'none', note: json.error || 'IPFS is not configured.' }
  }
  return json
}

export async function uploadLogo(file: File): Promise<string> {
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read file.'))
    reader.onload = () => resolve(String(reader.result || ''))
    reader.readAsDataURL(file)
  })
  const pin = await postPin({
    kind: 'file',
    filename: file.name,
    contentType: file.type,
    data,
  })
  return pin.gateway || pin.uri
}

export async function pinMetadata(meta: {
  name: string
  symbol: string
  description: string
  image: string
}): Promise<IpfsPin> {
  return postPin({
    kind: 'json',
    json: {
      name: meta.name,
      symbol: meta.symbol,
      description: meta.description,
      image: meta.image,
    },
  })
}

async function postPin(body: Record<string, unknown>): Promise<IpfsPin> {
  const res = await fetch('/api/ipfs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({})) as IpfsPin & { error?: string }
  if (!res.ok) throw new Error(json.error || 'Upload failed. Use a public URL instead.')
  if (!json.cid) throw new Error('Pinata returned no CID.')
  return {
    cid: json.cid,
    uri: json.uri || `ipfs://${json.cid}`,
    gateway: json.gateway || `https://gateway.pinata.cloud/ipfs/${json.cid}`,
    provider: 'pinata',
  }
}
