/** Published Roblox place. Set VITE_ROBLOX_PLACE_ID in `.env` once the experience is live. */
export const ROBLOX_PLACE_ID = (import.meta.env.VITE_ROBLOX_PLACE_ID as string | undefined) || ''

export function playUrl(): string {
  if (ROBLOX_PLACE_ID) return `https://www.roblox.com/games/${ROBLOX_PLACE_ID}/Ponsblox`
  return 'https://www.roblox.com/'
}

export function bouncePaths(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, '') || '/'
  return p === '/launch' || p === '/explore' || p === '/link' || p.startsWith('/token/')
}
