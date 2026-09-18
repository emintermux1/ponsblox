import { chainLabel, type SupportedChain } from './chain.ts'
import type { PadBuild } from './write.ts'

/** Each step is a real stage of Create: build request, spec reveal, wallet, receipt. */
export type BuildStepId = 'reading' | 'naming' | 'template' | 'fees' | 'wallet' | 'confirming' | 'live'

export const BUILD_STEPS: readonly BuildStepId[] = [
  'reading',
  'naming',
  'template',
  'fees',
  'wallet',
  'confirming',
  'live',
]

/** Minimum time a step stays on screen so the build reads as work, not a flicker. */
export const MIN_STEP_MS = 1100

export type BuildPhase =
  | { kind: 'idle' }
  | { kind: 'reading' }
  | { kind: 'naming'; spec: PadBuild }
  | { kind: 'template'; spec: PadBuild }
  | { kind: 'fees'; spec: PadBuild }
  | { kind: 'wallet'; spec: PadBuild }
  | { kind: 'confirming'; spec: PadBuild; hash: `0x${string}` }
  | { kind: 'pending'; spec: PadBuild; hash: `0x${string}` }
  | { kind: 'live'; spec: PadBuild; hash: `0x${string}`; owner: `0x${string}` }
  | { kind: 'failed'; at: BuildStepId; spec: PadBuild | null; error: string; hash?: `0x${string}` }

export type StepState = 'todo' | 'active' | 'done' | 'failed' | 'pending'

export function stepIndex(step: BuildStepId): number {
  return BUILD_STEPS.indexOf(step)
}

/** The step a phase is currently on; idle has none. */
export function phaseStep(phase: BuildPhase): BuildStepId | null {
  switch (phase.kind) {
    case 'idle':
      return null
    case 'reading':
    case 'naming':
    case 'template':
    case 'fees':
    case 'wallet':
    case 'confirming':
    case 'live':
      return phase.kind
    case 'pending':
      return 'confirming'
    case 'failed':
      return phase.at
    default: {
      const _n: never = phase
      return _n
    }
  }
}

export function phaseSpec(phase: BuildPhase): PadBuild | null {
  switch (phase.kind) {
    case 'idle':
    case 'reading':
      return null
    case 'naming':
    case 'template':
    case 'fees':
    case 'wallet':
    case 'confirming':
    case 'pending':
    case 'live':
    case 'failed':
      return phase.spec
    default: {
      const _n: never = phase
      return _n
    }
  }
}

export function isBuilding(phase: BuildPhase): boolean {
  switch (phase.kind) {
    case 'idle':
    case 'live':
    case 'failed':
    case 'pending':
      return false
    case 'reading':
    case 'naming':
    case 'template':
    case 'fees':
    case 'wallet':
    case 'confirming':
      return true
    default: {
      const _n: never = phase
      return _n
    }
  }
}

export function stepState(step: BuildStepId, phase: BuildPhase): StepState {
  const current = phaseStep(phase)
  if (current === null) return 'todo'
  const at = stepIndex(current)
  const mine = stepIndex(step)
  if (mine < at) return 'done'
  if (mine > at) return 'todo'
  if (phase.kind === 'failed') return 'failed'
  if (phase.kind === 'pending' && step === 'confirming') return 'pending'
  if (phase.kind === 'live') return 'done'
  return 'active'
}

export function stepLabel(step: BuildStepId, chain: SupportedChain | null): string {
  switch (step) {
    case 'reading':
      return 'Reading your prompt'
    case 'naming':
      return 'Naming the pad'
    case 'template':
      return 'Picking the template'
    case 'fees':
      return 'Setting fees'
    case 'wallet':
      return 'Waiting for wallet'
    case 'confirming':
      return chain ? `Confirming on ${chainLabel(chain)}` : 'Confirming'
    case 'live':
      return 'Live'
    default: {
      const _n: never = step
      return _n
    }
  }
}

/** Marks the current step as failed, keeping whatever spec was already revealed. */
export function failAt(phase: BuildPhase, error: string): BuildPhase {
  const at = phaseStep(phase) ?? 'reading'
  const hash = phase.kind === 'confirming' || phase.kind === 'live' || phase.kind === 'pending'
    ? phase.hash
    : undefined
  return hash
    ? { kind: 'failed', at, spec: phaseSpec(phase), error, hash }
    : { kind: 'failed', at, spec: phaseSpec(phase), error }
}

export type Pacer = {
  /** Shows the next phase, first waiting until the current one has been visible for the minimum. */
  to: (phase: BuildPhase) => Promise<void>
  /** Replaces the phase at once, no dwell (errors). */
  now: (phase: BuildPhase) => void
  current: () => BuildPhase
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export function createPacer(
  show: (phase: BuildPhase) => void,
  minMs = MIN_STEP_MS,
  clock: () => number = () => Date.now(),
  wait: (ms: number) => Promise<void> = sleep,
): Pacer {
  let phase: BuildPhase = { kind: 'idle' }
  let shownAt = 0
  const set = (next: BuildPhase) => {
    phase = next
    shownAt = clock()
    show(next)
  }
  return {
    async to(next) {
      const skipDwell = next.kind === 'live'
      if (phase.kind !== 'idle' && !skipDwell) {
        const left = minMs - (clock() - shownAt)
        if (left > 0) await wait(left)
      }
      set(next)
    },
    now(next) {
      set(next)
    },
    current: () => phase,
  }
}
