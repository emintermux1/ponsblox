import type { KitId } from './kits.ts'

export const KIT_SHOT: Partial<Record<KitId, string>> = {
  pons: '/kits/pons.jpg',
  pumpfun: '/kits/pumpfun.jpg',
  bags: '/kits/bags.jpg',
  app: '/kits/app.jpg',
  flap: '/kits/flap.jpg',
  four: '/kits/four.jpg',
  long: '/kits/long.jpg',
}

export function kitShot(id: KitId): string | null {
  return KIT_SHOT[id] ?? null
}
