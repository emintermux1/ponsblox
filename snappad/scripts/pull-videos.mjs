import { readFile, writeFile } from 'node:fs/promises'

function pickJsonLd(html) {
  const blocks = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)]
  const out = []
  for (const block of blocks) {
    try {
      out.push(JSON.parse(block[1].replace(/&quot;/g, '"')))
    } catch {
      /* skip */
    }
  }
  return out
}

function meta(html, prop) {
  const re = new RegExp(`property="${prop}" content="([^"]+)"`, 'i')
  const m = html.match(re)
  return m?.[1] ? m[1].replace(/&#x27;/g, "'") : ''
}

function handleOf(account) {
  return String(account || '').replace(/^@/, '')
}

const catalogPath = new URL('../src/lib/liveCatalog.json', import.meta.url)
const catalog = JSON.parse(await readFile(catalogPath, 'utf8'))
const byUser = new Map()
for (const row of catalog) {
  const user = handleOf(row.account)
  if (!byUser.has(user)) byUser.set(user, [])
  byUser.get(user).push(row)
}

let withVideo = 0
for (const [user, rows] of byUser) {
  const url = `https://www.snapchat.com/@${user}`
  const res = await fetch(url, {
    headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  })
  if (!res.ok) {
    console.error('skip', user, res.status)
    continue
  }
  const html = await res.text()
  const videos = pickJsonLd(html).filter((x) => x['@type'] === 'VideoObject')
  const ogVideo = meta(html, 'og:video:secure_url') || meta(html, 'og:video:url') || meta(html, 'og:video')
  for (const [i, row] of rows.entries()) {
    const video = videos[i] || videos[0]
    const videoUrl = String(video?.contentUrl || video?.contentURL || video?.embedUrl || ogVideo || '')
    const snapUrl = String(video?.url || video?.mainEntityOfPage?.['@id'] || row.sourceUrl || url)
    row.videoUrl = videoUrl
    row.snapUrl = snapUrl
    if (video?.name && video.name !== 'Spotlight Snap') row.videoTitle = video.name
    if (videoUrl) withVideo += 1
  }
  console.log(user, `${rows.filter((r) => r.videoUrl).length}/${rows.length}`)
}

await writeFile(catalogPath, JSON.stringify(catalog, null, 2))
console.log('wrote', catalog.length, 'withVideo', withVideo)
