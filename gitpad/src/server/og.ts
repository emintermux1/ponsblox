function esc(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export type OgLayout = 'launch' | 'trending' | 'minimal' | 'daily' | 'square' | 'og' | 'home'

export function shareCardSvg(input: {
  title: string
  repo?: string
  stars?: string
  ticker?: string
  contract?: string
  rank?: string
  layout?: string
}): string {
  const layout = (['launch', 'trending', 'minimal', 'daily', 'square', 'og', 'home'].includes(input.layout || '')
    ? input.layout
    : 'launch') as OgLayout
  const title = esc(input.title || 'GitPad')
  const repo = esc(input.repo || '')
  const stars = esc(input.stars || '')
  const ticker = esc(input.ticker || '')
  const contract = esc(input.contract || '')
  const rank = esc(input.rank || '')

  switch (layout) {
    case 'launch':
      return card(`
  <text x="72" y="108" fill="#c6ef3a" font-family="IBM Plex Mono, monospace" font-size="20" letter-spacing="6">NOW LIVE ON GITPAD</text>
  <text x="72" y="220" fill="#f3efe4" font-family="IBM Plex Sans, sans-serif" font-size="58" font-weight="700">${title}</text>
  <text x="72" y="290" fill="#c6ef3a" font-family="IBM Plex Mono, monospace" font-size="34">${ticker}</text>
  <text x="72" y="380" fill="#e7e1d2" font-family="IBM Plex Mono, monospace" font-size="26">${repo}  ${stars}</text>
  <text x="72" y="460" fill="#8a867a" font-family="IBM Plex Mono, monospace" font-size="20">CA ${contract}</text>
  <text x="72" y="540" fill="#8a867a" font-family="IBM Plex Mono, monospace" font-size="16">Not affiliated with GitLab, GitHub, maintainers, or Robinhood.</text>
`)
    case 'trending':
      return card(`
  <text x="72" y="108" fill="#c6ef3a" font-family="IBM Plex Mono, monospace" font-size="20" letter-spacing="6">#${rank || '—'} TRENDING ON GITHUB</text>
  <text x="72" y="230" fill="#f3efe4" font-family="IBM Plex Sans, sans-serif" font-size="56" font-weight="700">${repo || title}</text>
  <text x="72" y="320" fill="#e7e1d2" font-family="IBM Plex Mono, monospace" font-size="28">${stars}</text>
  <text x="72" y="410" fill="#c6ef3a" font-family="IBM Plex Mono, monospace" font-size="32">${ticker} LIVE ON GITPAD</text>
  <text x="72" y="540" fill="#8a867a" font-family="IBM Plex Mono, monospace" font-size="16">Repository momentum. Not financial advice.</text>
`)
    case 'minimal':
      return card(`
  <text x="72" y="250" fill="#f3efe4" font-family="IBM Plex Sans, sans-serif" font-size="52" font-weight="700">${repo || title}  →  ${ticker}</text>
  <text x="72" y="360" fill="#c6ef3a" font-family="IBM Plex Mono, monospace" font-size="28" letter-spacing="8">GITPAD</text>
  <text x="72" y="540" fill="#8a867a" font-family="IBM Plex Mono, monospace" font-size="16">Code → repository → token.</text>
`)
    case 'daily':
      return card(`
  <text x="72" y="108" fill="#c6ef3a" font-family="IBM Plex Mono, monospace" font-size="20" letter-spacing="6">GITPAD DAILY</text>
  <text x="72" y="230" fill="#f3efe4" font-family="IBM Plex Sans, sans-serif" font-size="64" font-weight="700">${title}</text>
  <text x="72" y="330" fill="#e7e1d2" font-family="IBM Plex Mono, monospace" font-size="26">${stars || 'Indexed from GitHub + GitPad'}</text>
  <text x="72" y="540" fill="#8a867a" font-family="IBM Plex Mono, monospace" font-size="16">What is trending. Has it been tokenized. Can I launch it.</text>
`)
    case 'home':
      return card(`
  <text x="72" y="160" fill="#c6ef3a" font-family="IBM Plex Mono, monospace" font-size="22" letter-spacing="8">GITPAD</text>
  <text x="72" y="280" fill="#f3efe4" font-family="IBM Plex Sans, sans-serif" font-size="44" font-weight="700">Launch tokens paired with</text>
  <text x="72" y="340" fill="#f3efe4" font-family="IBM Plex Sans, sans-serif" font-size="44" font-weight="700">trending GitHub repositories.</text>
  <text x="72" y="520" fill="#8a867a" font-family="IBM Plex Mono, monospace" font-size="20">CODE  →  REPOSITORY  →  TOKEN</text>
`)
    case 'og':
      return card(`
  <text x="72" y="100" fill="#c6ef3a" font-family="IBM Plex Mono, monospace" font-size="18" letter-spacing="6">NOW LIVE ON GITPAD</text>
  <text x="72" y="210" fill="#f3efe4" font-family="IBM Plex Sans, sans-serif" font-size="54" font-weight="700">${title}</text>
  <text x="72" y="278" fill="#c6ef3a" font-family="IBM Plex Mono, monospace" font-size="32">${ticker}</text>
  <text x="72" y="370" fill="#e7e1d2" font-family="IBM Plex Mono, monospace" font-size="24">${repo}</text>
  <text x="72" y="420" fill="#8a867a" font-family="IBM Plex Mono, monospace" font-size="20">${stars}</text>
  <text x="72" y="500" fill="#8a867a" font-family="IBM Plex Mono, monospace" font-size="20">CA ${contract}</text>
  <text x="72" y="560" fill="#8a867a" font-family="IBM Plex Mono, monospace" font-size="14">Not affiliated with GitLab, GitHub, maintainers, or Robinhood.</text>
`)
    case 'square':
      return card(`
  <text x="72" y="140" fill="#c6ef3a" font-family="IBM Plex Mono, monospace" font-size="22" letter-spacing="6">NOW LIVE ON GITPAD</text>
  <text x="72" y="340" fill="#f3efe4" font-family="IBM Plex Sans, sans-serif" font-size="64" font-weight="700">${title}</text>
  <text x="72" y="440" fill="#c6ef3a" font-family="IBM Plex Mono, monospace" font-size="40">${ticker}</text>
  <text x="72" y="560" fill="#e7e1d2" font-family="IBM Plex Mono, monospace" font-size="28">${repo}</text>
  <text x="72" y="640" fill="#8a867a" font-family="IBM Plex Mono, monospace" font-size="24">${stars}</text>
  <text x="72" y="900" fill="#8a867a" font-family="IBM Plex Mono, monospace" font-size="22">CA ${contract}</text>
  <text x="72" y="1080" fill="#8a867a" font-family="IBM Plex Mono, monospace" font-size="16">Not affiliated with GitLab, GitHub, maintainers, or Robinhood.</text>
`, 1200, 1200)
    default: {
      const _e: never = layout
      return _e
    }
  }
}

function card(inner: string, width = 1200, height = 630) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#000"/>
  <rect x="28" y="28" width="${width - 56}" height="${height - 56}" fill="#0b0b0b" stroke="#c6ef3a" stroke-width="2"/>
  <rect x="28" y="28" width="18" height="${height - 56}" fill="#c6ef3a"/>
  ${inner}
</svg>`
}
