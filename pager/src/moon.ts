/** Public lunar timing: synodic month and a published new-moon epoch (Meeus). */

export const SYNODIC_DAYS = 29.530588853
const NEW_MOON_JD = 2451550.26

export type MoonPhase =
  | 'New'
  | 'Waxing crescent'
  | 'First quarter'
  | 'Waxing gibbous'
  | 'Full'
  | 'Waning gibbous'
  | 'Last quarter'
  | 'Waning crescent'

export type MoonReading = {
  ageDays: number
  illumination: number
  phase: MoonPhase
  nextPhase: MoonPhase
  nextInDays: number
  waxing: boolean
}

function julianDate(date: Date) {
  return date.getTime() / 86_400_000 + 2_440_587.5
}

function wrap(n: number, period: number) {
  return ((n % period) + period) % period
}

export function phaseLabel(phase: MoonPhase) {
  switch (phase) {
    case 'New':
      return 'New'
    case 'Waxing crescent':
      return 'Waxing crescent'
    case 'First quarter':
      return 'First quarter'
    case 'Waxing gibbous':
      return 'Waxing gibbous'
    case 'Full':
      return 'Full'
    case 'Waning gibbous':
      return 'Waning gibbous'
    case 'Last quarter':
      return 'Last quarter'
    case 'Waning crescent':
      return 'Waning crescent'
    default: {
      const _never: never = phase
      return _never
    }
  }
}

function phaseAt(age: number): MoonPhase {
  const t = SYNODIC_DAYS / 16
  if (age < t) return 'New'
  if (age < t * 3) return 'Waxing crescent'
  if (age < t * 5) return 'First quarter'
  if (age < t * 7) return 'Waxing gibbous'
  if (age < t * 9) return 'Full'
  if (age < t * 11) return 'Waning gibbous'
  if (age < t * 13) return 'Last quarter'
  if (age < t * 15) return 'Waning crescent'
  return 'New'
}

const PHASE_ORDER: MoonPhase[] = [
  'New',
  'Waxing crescent',
  'First quarter',
  'Waxing gibbous',
  'Full',
  'Waning gibbous',
  'Last quarter',
  'Waning crescent',
]

function nextBoundary(age: number) {
  const step = SYNODIC_DAYS / 8
  const idx = Math.floor(age / step)
  const nextAge = (idx + 1) * step
  const remain = nextAge - age
  const next = PHASE_ORDER[(idx + 1) % PHASE_ORDER.length]
  return { next, remain }
}

export function readMoon(date = new Date()): MoonReading {
  const ageDays = wrap(julianDate(date) - NEW_MOON_JD, SYNODIC_DAYS)
  const angle = (ageDays / SYNODIC_DAYS) * Math.PI * 2
  const illumination = (1 - Math.cos(angle)) / 2
  const phase = phaseAt(ageDays)
  const { next, remain } = nextBoundary(ageDays)
  return {
    ageDays,
    illumination,
    phase,
    nextPhase: next,
    nextInDays: remain,
    waxing: ageDays < SYNODIC_DAYS / 2,
  }
}

/** Sun direction for a camera on +Z looking at the origin. New = far side lit. */
export function sunDirection(ageDays: number): [number, number, number] {
  const a = (ageDays / SYNODIC_DAYS) * Math.PI * 2
  return [-Math.sin(a), 0.12, -Math.cos(a)]
}
