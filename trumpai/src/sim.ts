import { useEffect, useRef, useState } from 'react'
import { BIN_MS, TUNING_BINS, type Phase } from './lore.ts'

export type EventKind = 'listen' | 'retrieve' | 'decide' | 'speak' | 'hold' | 'reset'

export type DeskEvent = {
  t: number
  kind: EventKind
  text: string
}

export type SimRuntime = {
  playing: boolean
  t: number
  phase: Phase
  phaseAge: number
  speech: number
  decision: number
  attention: number
  memory: number
  briefing: number
  lock: number
  cadence: number
  bins: number[]
  events: DeskEvent[]
  briefCount: number
}

const MAX_EVENTS = 18

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n))
}

function emptyBins() {
  return Array.from({ length: TUNING_BINS }, () => 0)
}

function seedRuntime(): SimRuntime {
  return {
    playing: true,
    t: 0,
    phase: 'hold',
    phaseAge: 0,
    speech: 0.22,
    decision: 0.34,
    attention: 0.4,
    memory: 0.28,
    briefing: 0.16,
    lock: 0.38,
    cadence: 0,
    bins: emptyBins(),
    events: [{ t: 0, kind: 'hold', text: 'Trump AI on desk · DJT' }],
    briefCount: 0,
  }
}

function pushEvent(rt: SimRuntime, kind: EventKind, text: string) {
  rt.events = [{ t: rt.t, kind, text }, ...rt.events].slice(0, MAX_EVENTS)
}

function eventKind(phase: Phase): EventKind {
  switch (phase) {
    case 'listen':
      return 'listen'
    case 'retrieve':
      return 'retrieve'
    case 'decide':
      return 'decide'
    case 'speak':
      return 'speak'
    case 'hold':
      return 'hold'
    default: {
      const _never: never = phase
      return _never
    }
  }
}

function nextPhase(phase: Phase): Phase {
  switch (phase) {
    case 'listen':
      return 'retrieve'
    case 'retrieve':
      return 'decide'
    case 'decide':
      return 'speak'
    case 'speak':
      return 'hold'
    case 'hold':
      return 'hold'
    default: {
      const _never: never = phase
      return _never
    }
  }
}

function phaseHold(phase: Phase) {
  switch (phase) {
    case 'listen':
      return 0.72
    case 'retrieve':
      return 0.9
    case 'decide':
      return 1.05
    case 'speak':
      return 2.4
    case 'hold':
      return 99
    default: {
      const _never: never = phase
      return _never
    }
  }
}

function targets(phase: Phase, t: number) {
  const drift = 0.5 + 0.5 * Math.sin(t * 0.55)
  const pulse = 0.5 + 0.5 * Math.sin(t * 1.35)
  switch (phase) {
    case 'listen':
      return { speech: 0.18, decision: 0.28, attention: 0.82, memory: 0.34, briefing: 0.88, lock: 0.44 }
    case 'retrieve':
      return { speech: 0.2, decision: 0.4, attention: 0.7, memory: 0.92, briefing: 0.62, lock: 0.5 }
    case 'decide':
      return { speech: 0.28, decision: 0.94, attention: 0.76, memory: 0.55, briefing: 0.4, lock: 0.9 }
    case 'speak':
      return { speech: 0.72 + pulse * 0.26, decision: 0.7, attention: 0.64, memory: 0.42, briefing: 0.3, lock: 0.78 }
    case 'hold':
      return {
        speech: 0.16 + drift * 0.1,
        decision: 0.3 + pulse * 0.08,
        attention: 0.34 + drift * 0.18,
        memory: 0.22 + pulse * 0.12,
        briefing: 0.12 + drift * 0.08,
        lock: 0.36 + drift * 0.08,
      }
    default: {
      const _never: never = phase
      return _never
    }
  }
}

function tuneBins(rt: SimRuntime): number[] {
  return Array.from({ length: TUNING_BINS }, (_, i) => {
    const wave = 0.5 + 0.5 * Math.sin(rt.t * 2.1 + i * 0.7)
    const lobe =
      i < 3
        ? rt.briefing
        : i < 6
          ? rt.memory
          : i < 9
            ? rt.decision
            : rt.speech
    return clamp(0.08 + lobe * 0.62 + wave * rt.attention * 0.28, 0, 1)
  })
}

function step(rt: SimRuntime, dt: number) {
  rt.t += dt
  rt.phaseAge += dt

  if (rt.phase !== 'hold' && rt.phaseAge >= phaseHold(rt.phase)) {
    const next = nextPhase(rt.phase)
    rt.phase = next
    rt.phaseAge = 0
    if (next !== 'hold') {
      pushEvent(rt, eventKind(next), phaseNote(next))
    } else {
      pushEvent(rt, 'hold', 'Returned to desk')
    }
  }

  const goal = targets(rt.phase, rt.t)
  const ease = Math.min(1, 3.4 * dt)
  rt.speech += (goal.speech - rt.speech) * ease
  rt.decision += (goal.decision - rt.decision) * ease
  rt.attention += (goal.attention - rt.attention) * ease
  rt.memory += (goal.memory - rt.memory) * ease
  rt.briefing += (goal.briefing - rt.briefing) * ease
  rt.lock += (goal.lock - rt.lock) * ease
  rt.cadence = rt.phase === 'speak' ? 0.5 + 0.5 * Math.sin(rt.t * 7.2) : rt.cadence * Math.exp(-dt * 3)
  rt.bins = tuneBins(rt)
}

function phaseNote(phase: Phase) {
  switch (phase) {
    case 'listen':
      return 'Brief on the desk'
    case 'retrieve':
      return 'Pulling the file'
    case 'decide':
      return 'Locking the position'
    case 'speak':
      return 'Speaking the line'
    case 'hold':
      return 'On desk'
    default: {
      const _never: never = phase
      return _never
    }
  }
}

export function useTrumpSim() {
  const live = useRef<SimRuntime>(seedRuntime())
  const [runtime, setRuntime] = useState<SimRuntime>(live.current)

  useEffect(() => {
    let last = performance.now()
    let frame = 0
    let uiAt = 0
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick)
      if (document.visibilityState !== 'visible') {
        last = now
        return
      }
      const raw = Math.min(0.05, (now - last) / 1000)
      last = now
      const rt = live.current
      if (!rt.playing) return
      const next: SimRuntime = {
        ...rt,
        bins: rt.bins.slice(),
        events: rt.events.slice(),
      }
      step(next, raw)
      live.current = next
      if (now - uiAt > BIN_MS) {
        uiAt = now
        setRuntime(next)
      }
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  function openBrief(line: string) {
    setRuntime((rt) => {
      const next: SimRuntime = {
        ...rt,
        bins: rt.bins.slice(),
        events: rt.events.slice(),
        playing: true,
        phase: 'listen',
        phaseAge: 0,
        briefCount: rt.briefCount + 1,
      }
      pushEvent(next, 'listen', line.trim().slice(0, 72) || 'Brief on the desk')
      live.current = next
      return next
    })
  }

  function toggle() {
    setRuntime((rt) => {
      const next = { ...rt, playing: !rt.playing }
      live.current = next
      return next
    })
  }

  function reset() {
    const next = seedRuntime()
    live.current = next
    setRuntime(next)
  }

  return { runtime, live, openBrief, toggle, reset }
}
