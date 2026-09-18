import { useEffect, useRef, useState } from 'react'
import { CHROMA_IDS, LOBES, PATHWAYS } from './connectome.ts'
import { axonParams, crossed, pscI, pulseI, restState, step, type HhState } from './hh.ts'
import { RULE_DIGEST, RULE_SEALED, RULE_TEXT } from './lore.ts'
import { trialById, trialsFor, type Trial } from './trials.ts'

export type LaunchPhase = 'running' | 'armed' | 'signing' | 'launched'

export type EventKind = 'spike' | 'chroma' | 'lobe' | 'trial' | 'rule' | 'sign'

export type LabEvent = {
  t: number
  kind: EventKind
  text: string
}

export type SimRuntime = {
  playing: boolean
  speed: 1 | 2 | 4
  axon: number
  trial: Trial
  tMs: number
  axons: HhState[]
  traces: number[][]
  stimTrace: number[]
  iStim: number
  spikes: number[]
  spikeTimes: number[]
  lobes: Record<string, number>
  chroma: number[]
  score: number
  windows: number[]
  phase: LaunchPhase
  events: LabEvent[]
  hash: string
  signedAt: string
  spikesTotal: number
  lastSpikeMs: number
  refractory: number[]
}

const TRACE = 280
const CHROMA_N = 420
const DT = 0.025
const WINDOW = 700
const SCORE_LINE = 0.82

function seedChroma() {
  return Array.from({ length: CHROMA_N }, () => 0.08)
}

function emptyLobes() {
  const lobes: Record<string, number> = {}
  for (const row of LOBES) lobes[row.id] = 0
  return lobes
}

function pushEvent(rt: SimRuntime, kind: EventKind, text: string) {
  rt.events = [{ t: rt.tMs, kind, text }, ...rt.events].slice(0, 48)
}

function stimulus(rt: SimRuntime) {
  const seed = rt.trial.axon * 31 + rt.trial.trial
  if (rt.trial.stimulus === 'pulse') {
    const period = 38
    const local = rt.tMs % period
    return pulseI(local, 6, 2.2, 14 + (seed % 5))
  }
  return pscI(rt.tMs, seed, 9 + (seed % 4))
}

function integrate(rt: SimRuntime, wallDt: number) {
  const simMs = Math.min(24, wallDt) * rt.speed
  const steps = Math.max(1, Math.round((simMs / DT) * 0.45))
  const iStim = stimulus(rt)
  rt.iStim = iStim
  const selected = rt.axon - 1

  for (let s = 0; s < steps; s++) {
    rt.tMs += DT
    for (let a = 0; a < 8; a++) {
      const drive = a === selected ? iStim : iStim * 0.18 + (a + 1) * 0.15
      const prev = rt.axons[a].v
      rt.axons[a] = step(rt.axons[a], drive, DT, axonParams(a + 1))
      if (crossed(prev, rt.axons[a].v) && rt.tMs - rt.refractory[a] > 3.2) {
        rt.refractory[a] = rt.tMs
        rt.spikes[a] += 1
        rt.spikesTotal += 1
        rt.lastSpikeMs = rt.tMs
        if (a === selected) {
          rt.spikeTimes.push(rt.tMs)
          if (rt.spikeTimes.length > 64) rt.spikeTimes.shift()
          injectSpike(rt)
          pushEvent(rt, 'spike', `${rt.trial.id}  spike  ${rt.axons[a].v.toFixed(1)} mV`)
        }
      }
    }
  }

  for (let a = 0; a < 8; a++) {
    const trace = rt.traces[a]
    trace.push(rt.axons[a].v)
    if (trace.length > TRACE) trace.shift()
  }
  rt.stimTrace.push(iStim)
  if (rt.stimTrace.length > TRACE) rt.stimTrace.shift()

  decayLobes(rt)
  paintChroma(rt)
  scoreWindow(rt)
}

function injectSpike(rt: SimRuntime) {
  rt.lobes.Op_L = Math.min(1, rt.lobes.Op_L + 0.55)
  rt.lobes.Op_R = Math.min(1, rt.lobes.Op_R + 0.55)
  for (const edge of PATHWAYS) {
    if (rt.lobes[edge.from] < 0.2) continue
    const gain = edge.kind === 'novel' ? 0.09 : 0.07
    rt.lobes[edge.to] = Math.min(1, rt.lobes[edge.to] + rt.lobes[edge.from] * gain)
  }
}

function decayLobes(rt: SimRuntime) {
  for (const id of Object.keys(rt.lobes)) {
    rt.lobes[id] *= 0.965
  }
}

function paintChroma(rt: SimRuntime) {
  const motor =
    CHROMA_IDS.reduce((sum, id) => sum + rt.lobes[id], 0) / CHROMA_IDS.length
  const v = (rt.axons[rt.axon - 1].v + 80) / 140
  for (let i = 0; i < CHROMA_N; i++) {
    const feature = i % 17 < 7
    const target = feature ? 0.25 + motor * 0.85 + v * 0.2 : 0.06 + motor * 0.35
    rt.chroma[i] += (target - rt.chroma[i]) * 0.12
  }
}

function scoreWindow(rt: SimRuntime) {
  const motor = CHROMA_IDS.reduce((sum, id) => sum + rt.lobes[id], 0) / CHROMA_IDS.length
  const rate = rt.spikes[rt.axon - 1] / Math.max(1, rt.tMs / 1000)
  rt.score = Math.min(1, motor * 0.72 + Math.min(rate / 18, 1) * 0.28)

  const bucket = Math.floor(rt.tMs / WINDOW)
  if (rt.windows.length <= bucket) {
    rt.windows.push(rt.score)
    if (rt.windows.length >= 3) {
      const last = rt.windows.slice(-3)
      const armed = last.every((n) => n > SCORE_LINE) && rt.spikes[rt.axon - 1] > 0
      if (armed && rt.phase === 'running') {
        rt.phase = 'armed'
        pushEvent(rt, 'rule', `score ${rt.score.toFixed(3)}  three windows  sealed ${RULE_DIGEST}`)
      }
      if (armed && (rt.phase === 'armed' || rt.phase === 'running')) {
        rt.phase = 'signing'
        pushEvent(rt, 'sign', 'the squid is signing')
        void seal(rt)
      }
    }
  }
}

async function seal(rt: SimRuntime) {
  const payload = {
    seed: rt.trial.id,
    rule: RULE_TEXT,
    digest: RULE_DIGEST,
    sealed: RULE_SEALED,
    readings: rt.windows.slice(-3).map((n) => Number(n.toFixed(4))),
    spikes: rt.spikeTimes.slice(-8).map((n) => Number(n.toFixed(3))),
  }
  const buf = new TextEncoder().encode(JSON.stringify(payload))
  const dig = await crypto.subtle.digest('SHA-256', buf)
  rt.hash = [...new Uint8Array(dig)].map((b) => b.toString(16).padStart(2, '0')).join('')
  rt.signedAt = new Date().toISOString()
  rt.phase = 'launched'
  pushEvent(rt, 'sign', `mint  ${rt.hash.slice(0, 16)}…`)
}

export function createRuntime(): SimRuntime {
  const trial = trialsFor(1)[0]
  return {
    playing: true,
    speed: 1,
    axon: 1,
    trial,
    tMs: 0,
    axons: Array.from({ length: 8 }, (_, i) => restState(axonParams(i + 1))),
    traces: Array.from({ length: 8 }, () => [] as number[]),
    stimTrace: [],
    iStim: 0,
    spikes: Array.from({ length: 8 }, () => 0),
    spikeTimes: [],
    lobes: emptyLobes(),
    chroma: seedChroma(),
    score: 0,
    windows: [],
    phase: 'running',
    events: [{ t: 0, kind: 'trial', text: `${trial.id}  ${trial.stimulus}  SGAMP` }],
    hash: '',
    signedAt: '',
    spikesTotal: 0,
    lastSpikeMs: -999,
    refractory: Array.from({ length: 8 }, () => -99),
  }
}

export function resetRuntime(rt: SimRuntime, trial: Trial, axon: number) {
  const next = createRuntime()
  next.playing = rt.playing
  next.speed = rt.speed
  next.axon = axon
  next.trial = trial
  next.events = [{ t: 0, kind: 'trial', text: `${trial.id}  ${trial.stimulus}  SGAMP` }]
  Object.assign(rt, next)
}

export function exportAudit(rt: SimRuntime) {
  return {
    specimen: 'SQUIDMIND',
    trial: rt.trial,
    rule: RULE_TEXT,
    digest: RULE_DIGEST,
    sealed: RULE_SEALED,
    score: rt.score,
    windows: rt.windows.slice(-6),
    spikes: rt.spikes,
    hash: rt.hash,
    signedAt: rt.signedAt,
    phase: rt.phase,
    tMs: rt.tMs,
  }
}

export function useSquidSim() {
  const runtime = useRef<SimRuntime>(createRuntime())
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let frame = 0
    let last = performance.now()
    let ui = 0
    const loop = (now: number) => {
      const dt = now - last
      last = now
      if (document.visibilityState !== 'visible') {
        frame = requestAnimationFrame(loop)
        return
      }
      const rt = runtime.current
      if (rt.playing) integrate(rt, dt)
      if (now - ui > 90) {
        ui = now
        setTick((n) => n + 1)
      }
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [])

  return {
    runtime: runtime.current,
    tick,
    setAxon(n: number) {
      const trial = trialsFor(n)[0]
      resetRuntime(runtime.current, trial, n)
      setTick((x) => x + 1)
    },
    setTrial(id: string) {
      const trial = trialById(id)
      resetRuntime(runtime.current, trial, trial.axon)
      setTick((x) => x + 1)
    },
    toggle() {
      runtime.current.playing = !runtime.current.playing
      setTick((x) => x + 1)
    },
    setSpeed(speed: 1 | 2 | 4) {
      runtime.current.speed = speed
      setTick((x) => x + 1)
    },
    reset() {
      resetRuntime(runtime.current, runtime.current.trial, runtime.current.axon)
      setTick((x) => x + 1)
    },
  }
}

export function chromaHz(rt: SimRuntime) {
  return 2.1 + rt.score * 4.8
}

export function firing(rt: SimRuntime) {
  return rt.spikes[rt.axon - 1] / Math.max(0.2, rt.tMs / 1000)
}
