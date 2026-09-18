export const SNAP_TTL_MS = 24 * 60 * 60 * 1000

export type SnapClock = {
  remaining: number
  expired: boolean
  hours: number
  minutes: number
  seconds: number
  ratio: number
}

export function snapClock(createdAt: number, now = Date.now()): SnapClock {
  const remaining = Math.max(0, createdAt + SNAP_TTL_MS - now)
  const expired = remaining <= 0
  const hours = Math.floor(remaining / 3_600_000)
  const minutes = Math.floor((remaining % 3_600_000) / 60_000)
  const seconds = Math.floor((remaining % 60_000) / 1000)
  return {
    remaining,
    expired,
    hours,
    minutes,
    seconds,
    ratio: expired ? 0 : remaining / SNAP_TTL_MS,
  }
}

export function clockLabel(clock: SnapClock): string {
  if (clock.expired) return 'Snap gone'
  const hh = String(clock.hours).padStart(2, '0')
  const mm = String(clock.minutes).padStart(2, '0')
  const ss = String(clock.seconds).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}
