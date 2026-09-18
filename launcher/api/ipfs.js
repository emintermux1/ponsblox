function pinRecord(cid) {
  const hash = String(cid || '').trim()
  if (!hash) {
    const err = new Error('Pinata returned no CID')
    err.status = 502
    throw err
  }
  return {
    cid: hash,
    uri: `ipfs://${hash}`,
    gateway: `https://gateway.pinata.cloud/ipfs/${hash}`,
    provider: 'pinata',
  }
}

function configured() {
  return Boolean(process.env.PINATA_JWT?.trim())
}

function b64ToBytes(data) {
  const raw = data.includes(',') ? data.slice(data.indexOf(',') + 1) : data
  return Buffer.from(raw, 'base64')
}

async function pinBytes(bytes, filename, contentType) {
  const jwt = process.env.PINATA_JWT?.trim()
  if (!jwt) {
    const err = new Error('IPFS is not configured. Set PINATA_JWT.')
    err.status = 503
    throw err
  }
  const form = new FormData()
  form.append('file', new Blob([bytes], { type: contentType || 'application/octet-stream' }), filename || 'file')
  const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}` },
    body: form,
  })
  const text = await res.text()
  if (!res.ok) {
    const err = new Error(`Pinata: ${text.slice(0, 180)}`)
    err.status = res.status === 401 ? 503 : 502
    throw err
  }
  const json = JSON.parse(text)
  return pinRecord(json.IpfsHash || '')
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    res.status(200).json({
      configured: configured(),
      provider: configured() ? 'pinata' : 'none',
      note: configured() ? 'Pinata pinFileToIPFS' : 'Set PINATA_JWT to enable uploads.',
    })
    return
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    const body = req.body || {}
    if (body.kind === 'json' || body.json !== undefined) {
      const bytes = Buffer.from(JSON.stringify(body.json ?? {}, null, 2))
      res.status(200).json(await pinBytes(bytes, 'metadata.json', 'application/json'))
      return
    }
    const bytes = b64ToBytes(String(body.data || ''))
    res.status(200).json(await pinBytes(bytes, body.filename || 'logo.png', body.contentType || 'image/png'))
  } catch (e) {
    const status = e && typeof e === 'object' && 'status' in e ? Number(e.status) : 500
    res.status(status || 500).json({ error: e instanceof Error ? e.message : 'Upload failed' })
  }
}
