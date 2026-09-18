import type { SnapSource } from './snap.ts'

export async function fetchPublicSnap(raw: string): Promise<SnapSource | null> {
  const q = encodeURIComponent(raw.trim())
  const res = await fetch(`/api/resolve?q=${q}`)
  if (!res.ok) return null
  const data = await res.json() as {
    kind: SnapSource['kind']
    url: string
    account: string
    name: string
    caption: string
    image: string
    videoUrl?: string
    snapUrl?: string
  }
  return {
    kind: data.kind,
    url: data.url,
    account: data.account,
    caption: data.caption,
    hint: `${data.kind} · ${data.account}`,
    name: data.name,
    ticker: data.account.replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase(),
    image: data.image,
    videoUrl: data.videoUrl,
    snapUrl: data.snapUrl,
  }
}
