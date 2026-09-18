/** Hodgkin–Huxley 1952 squid giant axon, modern polarity (rest ≈ −65 mV). */

export type HhState = {
  v: number
  m: number
  h: number
  n: number
}

export type HhCurrents = {
  ina: number
  ik: number
  il: number
  imem: number
}

export type AxonParams = {
  gNa: number
  gK: number
  gL: number
  eNa: number
  eK: number
  eL: number
  cm: number
}

export const STANDARD: AxonParams = {
  gNa: 120,
  gK: 36,
  gL: 0.3,
  eNa: 50,
  eK: -77,
  eL: -54.387,
  cm: 1,
}

const THRESHOLD = -20

function vtrap(x: number, y: number) {
  if (Math.abs(x / y) < 1e-6) return y * (1 - x / y / 2)
  return x / (Math.exp(x / y) - 1)
}

function gates(v: number) {
  const am = 0.1 * vtrap(-(v + 40), 10)
  const bm = 4 * Math.exp(-(v + 65) / 18)
  const ah = 0.07 * Math.exp(-(v + 65) / 20)
  const bh = 1 / (Math.exp(-(v + 35) / 10) + 1)
  const an = 0.01 * vtrap(-(v + 55), 10)
  const bn = 0.125 * Math.exp(-(v + 65) / 80)
  return { am, bm, ah, bh, an, bn }
}

export function restState(p: AxonParams = STANDARD): HhState {
  const v = -65
  const { am, bm, ah, bh, an, bn } = gates(v)
  return {
    v,
    m: am / (am + bm),
    h: ah / (ah + bh),
    n: an / (an + bn),
  }
}

export function currents(s: HhState, p: AxonParams = STANDARD): HhCurrents {
  const ina = p.gNa * s.m ** 3 * s.h * (s.v - p.eNa)
  const ik = p.gK * s.n ** 4 * (s.v - p.eK)
  const il = p.gL * (s.v - p.eL)
  return { ina, ik, il, imem: ina + ik + il }
}

export function step(s: HhState, iStim: number, dt: number, p: AxonParams = STANDARD): HhState {
  const { am, bm, ah, bh, an, bn } = gates(s.v)
  const { imem } = currents(s, p)
  return {
    v: s.v + (dt * (iStim - imem)) / p.cm,
    m: s.m + dt * (am * (1 - s.m) - bm * s.m),
    h: s.h + dt * (ah * (1 - s.h) - bh * s.h),
    n: s.n + dt * (an * (1 - s.n) - bn * s.n),
  }
}

export function crossed(prev: number, next: number) {
  return prev < THRESHOLD && next >= THRESHOLD
}

export function axonParams(index: number): AxonParams {
  const jitter = ((index * 17 + 3) % 11) / 220
  return {
    ...STANDARD,
    gNa: STANDARD.gNa * (1 + jitter),
    gK: STANDARD.gK * (1 - jitter * 0.6),
  }
}

export function pulseI(tMs: number, start: number, width: number, amp: number) {
  return tMs >= start && tMs < start + width ? amp : 0
}

export function pscI(tMs: number, seed: number, amp: number) {
  const x = Math.sin(tMs * 0.37 + seed * 1.7) + Math.sin(tMs * 1.13 + seed * 0.4) * 0.55
  const burst = Math.max(0, Math.sin(tMs * 0.021 + seed))
  const noise = frac(Math.sin((tMs + seed * 99) * 12.9898) * 43758.5453) - 0.5
  return Math.max(0, amp * (0.22 + 0.55 * burst) + x * 2.4 + noise * 4.2)
}

function frac(n: number) {
  return n - Math.floor(n)
}
