export const ease = [0.22, 1, 0.36, 1] as const

export const spring = { type: 'spring' as const, stiffness: 420, damping: 32, mass: 0.7 }

export function stagger(i: number, cap = 12, step = 0.035) {
  return Math.min(i, cap) * step
}
