const ALLOWED = new Set([
  'a', 'img', 'p', 'br', 'hr',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'u',
  'code', 'pre', 'blockquote',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  'div', 'span', 'sup', 'sub',
  'details', 'summary', 'picture', 'source',
])

const VOID = new Set(['img', 'br', 'hr', 'source'])
const SKIP = new Set(['script', 'style', 'iframe', 'object', 'embed', 'link', 'meta'])

const ATTRS: Record<string, ReadonlySet<string>> = {
  a: new Set(['href', 'title']),
  img: new Set(['src', 'alt', 'width', 'height', 'title', 'align']),
  source: new Set(['type', 'media']),
  td: new Set(['align', 'colspan', 'rowspan']),
  th: new Set(['align', 'colspan', 'rowspan']),
}

function attrsFor(tag: string): ReadonlySet<string> {
  return ATTRS[tag] ?? new Set(['align', 'title'])
}

function escapeText(s: string): string {
  return s
    .replace(/&(?!#?\w+;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeAttr(s: string): string {
  return s
    .replace(/&(?!#?\w+;)/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
}

function resolveUrl(raw: string, kind: 'href' | 'src', assets?: string): string | null {
  const v = raw.trim()
  if (!v || /^(javascript|data|vbscript):/i.test(v)) return null
  if (/^(https?:\/\/|\/\/)/i.test(v)) return v
  if (kind === 'href' && /^(#|mailto:)/i.test(v)) return v
  if (kind === 'href' && v.startsWith('/')) return v
  if (!assets) return null
  try {
    return new URL(v.replace(/^\//, ''), assets).href
  } catch {
    return null
  }
}

export function githubReadmeAssets(owner: string, name: string): string {
  return `https://raw.githubusercontent.com/${owner}/${name}/HEAD/`
}

function sanitizeTag(raw: string, assets?: string): string {
  const m = raw.match(/^<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)\/?>$/)
  if (!m) return ''
  const tag = m[1].toLowerCase()
  if (!ALLOWED.has(tag)) return ''
  if (raw.startsWith('</')) return `</${tag}>`
  const allowed = attrsFor(tag)
  let attrs = ''
  const body = m[2] || ''
  const re = /([a-zA-Z_:][a-zA-Z0-9:._-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g
  for (const hit of body.matchAll(re)) {
    const name = hit[1].toLowerCase()
    if (name.startsWith('on') || !allowed.has(name)) continue
    const value = hit[2] ?? hit[3] ?? hit[4] ?? ''
    if (name === 'href' || name === 'src') {
      const resolved = resolveUrl(value, name, assets)
      if (!resolved) continue
      attrs += ` ${name}="${escapeAttr(resolved)}"`
      continue
    }
    if ((name === 'width' || name === 'height' || name === 'colspan' || name === 'rowspan') && !/^\d{1,4}$/.test(value)) continue
    attrs += ` ${name}="${escapeAttr(value)}"`
  }
  if (tag === 'a') attrs += ' target="_blank" rel="noreferrer noopener"'
  const close = VOID.has(tag) ? ' />' : '>'
  return `<${tag}${attrs}${close}`
}

function keepSafeHtml(src: string, assets?: string): string {
  let out = ''
  let i = 0
  while (i < src.length) {
    if (src.startsWith('<!--', i)) {
      const end = src.indexOf('-->', i + 4)
      i = end === -1 ? src.length : end + 3
      continue
    }
    if (src[i] !== '<') {
      const next = src.indexOf('<', i)
      const chunk = next === -1 ? src.slice(i) : src.slice(i, next)
      out += escapeText(chunk)
      i = next === -1 ? src.length : next
      continue
    }
    const end = src.indexOf('>', i)
    if (end === -1) {
      out += escapeText(src.slice(i))
      break
    }
    const raw = src.slice(i, end + 1)
    const name = raw.match(/^<\/?([a-zA-Z][a-zA-Z0-9]*)/)?.[1]?.toLowerCase() || ''
    if (SKIP.has(name) && !raw.startsWith('</')) {
      const rest = src.slice(end + 1)
      const close = rest.search(new RegExp(`<\\/${name}\\b[^>]*>`, 'i'))
      if (close === -1) {
        i = src.length
        continue
      }
      i = end + 1 + rest.indexOf('>', close) + 1
      continue
    }
    out += sanitizeTag(raw, assets)
    i = end + 1
  }
  return out
}

function inline(s: string, assets?: string): string {
  return s
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt: string, href: string) => {
      const src = resolveUrl(href, 'src', assets)
      return src ? `<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" />` : ''
    })
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
}

export function renderReadme(markdown: string, assets?: string): string {
  const escaped = keepSafeHtml(markdown.replace(/\r\n/g, '\n'), assets).slice(0, 40_000)
  return escaped.split(/\n{2,}/).map((block) => {
    const t = block.trim()
    if (!t) return ''
    if (/^</.test(t)) return t
    if (/^```/.test(t)) {
      const inner = t.replace(/^```[a-zA-Z0-9_+-]*\n?/, '').replace(/\n?```$/, '')
      return `<pre><code>${inner}</code></pre>`
    }
    if (/^#{1,6} /.test(t)) {
      const level = Math.min(t.match(/^#+/)?.[0].length ?? 1, 4)
      const tag = level <= 2 ? 'h3' : 'h4'
      return `<${tag}>${inline(t.replace(/^#{1,6} /, ''), assets)}</${tag}>`
    }
    if (/^[-*] /.test(t)) {
      const items = t.split('\n').filter((l) => /^[-*] /.test(l)).map((l) => `<li>${inline(l.replace(/^[-*] /, ''), assets)}</li>`).join('')
      return `<ul>${items}</ul>`
    }
    return `<p>${t.split('\n').map((line) => inline(line, assets)).join('<br/>')}</p>`
  }).join('')
}

export function Readme({ markdown, assets }: { markdown: string; assets?: string }) {
  if (!markdown.trim()) return <p className="muted">No README on this repository.</p>
  return <div className="readme" dangerouslySetInnerHTML={{ __html: renderReadme(markdown, assets) }} />
}
