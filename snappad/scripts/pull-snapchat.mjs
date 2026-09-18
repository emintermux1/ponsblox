import { mkdir, writeFile } from 'node:fs/promises'
import { createWriteStream } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'

const USERS = [
  'espn-snap',
  'daviddobrik',
  'nba',
  'nasa',
  'nytimes',
  'mrbeast',
  'lakers',
  'nfl',
  'teamsnapchat',
  'cnn',
  'netflix',
  'spotify',
  'nhl',
  'mlb',
  'marvel',
  'disney',
  'wwe',
  'bleacherreport',
  'sportscenter',
  'nationalgeographic',
  'mtv',
  'people',
  'billboard',
  'xbox',
  'playstation',
]

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

async function save(url, dest) {
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 SnappadBot' } })
  if (!res.ok || !res.body) throw new Error(`${url} ${res.status}`)
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest))
}

function slug(user) {
  return user.replace(/[^a-z0-9]/gi, '').toLowerCase()
}

const dir = new URL('../public/live/', import.meta.url)
const ava = new URL('../public/live/ava/', import.meta.url)
await mkdir(dir, { recursive: true })
await mkdir(ava, { recursive: true })
const catalog = []

for (const user of USERS) {
  const url = `https://www.snapchat.com/@${user}`
  const res = await fetch(url, {
    headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  })
  if (!res.ok) {
    console.error('skip', user, res.status)
    continue
  }
  const html = await res.text()
  const ld = pickJsonLd(html)
  const profile = ld.find((x) => x['@type'] === 'ProfilePage')?.mainEntity
    || ld.find((x) => x['@type'] === 'Organization' || x['@type'] === 'Person')
  const videos = ld.filter((x) => x['@type'] === 'VideoObject')
  const name = profile?.name || meta(html, 'og:title').replace(/ Snapchat.*$/, '') || user
  const caption = profile?.description || meta(html, 'og:description') || ''
  const avatar = profile?.image || ''
  const square = `https://www.snapchat.com/web-capture/www.snapchat.com/@${user}/preview/square.jpeg`
  try {
    await save(square, new URL(`${user}.jpg`, ava))
  } catch {
    if (avatar) {
      try { await save(avatar, new URL(`${user}.jpg`, ava)) } catch { /* keep old */ }
    }
  }

  const thumbs = []
  for (const video of videos.slice(0, 5)) {
    const videoUrl = String(video.contentUrl || video.contentURL || video.embedUrl || '')
    const snapUrl = String(video.url || video.mainEntityOfPage?.['@id'] || '')
    if (video.thumbnailUrl || videoUrl) {
      thumbs.push({
        src: video.thumbnailUrl || meta(html, 'og:image') || avatar,
        title: video.name || '',
        videoUrl,
        snapUrl,
      })
    }
  }
  if (thumbs.length === 0) {
    const og = meta(html, 'og:image') || avatar
    const ogVideo = meta(html, 'og:video:secure_url') || meta(html, 'og:video:url') || meta(html, 'og:video')
    if (og || ogVideo) thumbs.push({ src: og, title: '', videoUrl: ogVideo, snapUrl: url })
  }

  let saved = 0
  for (const [i, thumb] of thumbs.entries()) {
    const file = i === 0 ? `${user}.jpg` : `${user}-${i}.jpg`
    if (thumb.src) {
      try {
        await save(thumb.src, new URL(file, dir))
      } catch (e) {
        console.error('download', user, i, e.message)
      }
    }
    catalog.push({
      id: i === 0 ? slug(user) : `${slug(user)}-${i}`,
      name,
      ticker: slug(user).slice(0, 8).toUpperCase(),
      account: `@${user}`,
      caption: String(caption).slice(0, 80),
      sourceUrl: thumb.snapUrl || url,
      kind: videos[0] ? 'spotlight' : 'story',
      image: `/live/${file}`,
      videoTitle: thumb.title,
      videoUrl: thumb.videoUrl || '',
      snapUrl: thumb.snapUrl || url,
    })
    saved += 1
  }
  console.log(saved ? `ok ${user} ${name} x${saved}` : `no image ${user}`)
}

if (catalog.length === 0) {
  console.error('pull produced nothing; leaving liveCatalog.json')
  process.exit(1)
}

await writeFile(new URL('../src/lib/liveCatalog.json', import.meta.url), JSON.stringify(catalog, null, 2))
console.log('wrote', catalog.length)
