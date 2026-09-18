export type CustomSkin = {
  accent: string
  ink: string
  paper: string
  muted: string
  stroke: string
  radius: string
  font: string
}

export const CUSTOM_DEFAULT: CustomSkin = {
  accent: '#111111',
  ink: '#111111',
  paper: '#ffffff',
  muted: '#6b6b6b',
  stroke: '#e7e7e7',
  radius: '16px',
  font: 'Inter, system-ui, sans-serif',
}

function hex(raw: string, fallback: string): string {
  const v = raw.replace('#', '').toLowerCase()
  return /^[0-9a-f]{6}$/.test(v) ? `#${v}` : fallback
}

export function encodeCustom(skin: CustomSkin): string {
  const q = new URLSearchParams({
    a: skin.accent.replace('#', ''),
    i: skin.ink.replace('#', ''),
    p: skin.paper.replace('#', ''),
    m: skin.muted.replace('#', ''),
    s: skin.stroke.replace('#', ''),
    r: skin.radius.replace('px', ''),
  })
  return q.toString()
}

export function parseCustom(raw: string): CustomSkin {
  const q = new URLSearchParams(raw.startsWith('#') || raw.startsWith('?') ? raw.slice(1) : raw)
  const d = CUSTOM_DEFAULT
  const radius = Number(q.get('r') || '14')
  return {
    accent: hex(q.get('a') || '', d.accent),
    ink: hex(q.get('i') || '', d.ink),
    paper: hex(q.get('p') || '', d.paper),
    muted: hex(q.get('m') || '', d.muted),
    stroke: hex(q.get('s') || '', d.stroke),
    radius: `${Number.isFinite(radius) ? Math.min(40, Math.max(0, radius)) : 14}px`,
    font: d.font,
  }
}
