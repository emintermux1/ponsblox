export type RecentRepo = { owner: string; name: string; at: number }

const KEY = 'gitpad.recentRepos'

export function readRecentRepos(): RecentRepo[] {
  try {
    const raw = localStorage.getItem(KEY)
    const rows = raw ? JSON.parse(raw) as RecentRepo[] : []
    return Array.isArray(rows) ? rows.slice(0, 8) : []
  } catch {
    return []
  }
}

export function rememberRecentRepo(owner: string, name: string) {
  const next = [
    { owner, name, at: Date.now() },
    ...readRecentRepos().filter((r) => r.owner.toLowerCase() !== owner.toLowerCase() || r.name.toLowerCase() !== name.toLowerCase()),
  ].slice(0, 8)
  localStorage.setItem(KEY, JSON.stringify(next))
}
