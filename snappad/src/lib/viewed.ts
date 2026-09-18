const KEY = 'snappad.viewed.v2'

function load(): string[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as string[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function isViewed(id: string): boolean {
  return load().includes(id)
}

export function markViewed(id: string) {
  const next = [id, ...load().filter((x) => x !== id)].slice(0, 80)
  localStorage.setItem(KEY, JSON.stringify(next))
}
