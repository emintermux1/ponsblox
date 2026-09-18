import {
  ROUND_THRESHOLD_M,
  WAGGLE_FAR_M,
  WAGGLE_FAR_S,
  WAGGLE_NEAR_M,
  WAGGLE_NEAR_S,
} from './lore.ts'

export type DanceKind = 'round' | 'waggle'

export type Scout = {
  id: number
  name: string
  kind: DanceKind
  meters: number
  bearingDeg: number
  waggleS: number
}

function waggleSeconds(meters: number) {
  if (meters <= WAGGLE_NEAR_M) return WAGGLE_NEAR_S
  const t = (meters - WAGGLE_NEAR_M) / (WAGGLE_FAR_M - WAGGLE_NEAR_M)
  return WAGGLE_NEAR_S + t * (WAGGLE_FAR_S - WAGGLE_NEAR_S)
}

function scout(id: number, meters: number, bearingDeg: number): Scout {
  const kind: DanceKind = meters < ROUND_THRESHOLD_M ? 'round' : 'waggle'
  return {
    id,
    name: `scout ${id}`,
    kind,
    meters,
    bearingDeg,
    waggleS: kind === 'round' ? 0 : waggleSeconds(meters),
  }
}

/** Encoding points on von Frisch’s published 200–4500 m curve, plus one round dance. */
export const SCOUTS: Scout[] = [
  scout(1, 25, 0),
  scout(2, 200, 0),
  scout(3, 500, 45),
  scout(4, 1000, 90),
  scout(5, 1500, 135),
  scout(6, 2000, 180),
  scout(7, 3000, 225),
  scout(8, 4500, 270),
]

export function scoutById(id: number) {
  return SCOUTS.find((row) => row.id === id) ?? SCOUTS[0]
}

export function danceLabel(row: Scout) {
  if (row.kind === 'round') return `round · ${row.meters} m`
  return `waggle · ${row.meters} m · ${row.bearingDeg}°`
}
