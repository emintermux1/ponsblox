import { useEffect, useRef, useState } from 'react'
import { AL_IDS, COLLAR_IDS, LIP_IDS, MB_IDS, NEUROPILS, TRACTS } from './brain.ts'
import { danceLabel, scoutById, SCOUTS, type Scout } from './dances.ts'
import { RULE_DIGEST, RULE_SEALED, RULE_TEXT } from './lore.ts'

export type LaunchPhase = 'running' | 'armed' | 'signing' | 'launched'

export type EventKind = 'waggle' | 'round' | 'tract' | 'scout' | 'rule' | 'sign'

export type LabEvent = {
  t: number
  kind: EventKind
  text: string
}

export type SimRuntime = {
  playing: boolean
  speed: 1 | 2 | 4
  scout: number
  site: Scout
  tMs: number
  angle: number
  waggle: number
  runs: number[]
  runTimes: number[]
  traces: number[][]
  angleTrace: number[]
  glomeruli: number[]
  lobes: Record<string, number>
  comb: number[]
  score: number
  windows: number[]
  phase: LaunchPhase
  events: LabEvent[]
  hash: string
  signedAt: string
  lastRunMs: number
}

const TRACE = 240
const GLOM_N = 163
const COMB_N = 96
const WINDOW = 700
const SCORE_LINE = 0.82

function emptyLobes() {
  const lobes: Record<string, number> = {}
  for (const row of NEUROPILS) lobes[row.id] = 0
  return lobes
}

function pushEvent(rt: SimRuntime, kind: EventKind, text: string) {
  rt.events = [{ t: rt.tMs, kind, text }, ...rt.events].slice(0, 48)
}

function dancePhase(rt: SimRuntime) {
  const site = rt.site
  switch (site.kind) {
    case 'round': {
      const period = 620
      const local = rt.tMs % period
      rt.angle = (local / period) * Math.PI * 2
      rt.waggle = 0.12 + 0.08 * Math.sin(rt.tMs * 0.02)
      if (local < 16 && rt.tMs - rt.lastRunMs > 400) {
        rt.lastRunMs = rt.tMs
        rt.runs[rt.scout - 1] += 1
        injectRun(rt)
        pushEvent(rt, 'round', `${site.name}  round  ${site.meters} m`)
      }
      return
    }
    case 'waggle': {
      const cycle = 420 + site.waggleS * 380
      const local = rt.tMs % cycle
      const wagMs = site.waggleS * 1000
      const inWaggle = local < wagMs
      const bearing = (site.bearingDeg * Math.PI) / 180
      if (inWaggle) {
        rt.angle = bearing + Math.sin(rt.tMs * 0.08) * 0.08
        rt.waggle = 0.55 + 0.45 * Math.abs(Math.sin(rt.tMs * 0.11))
        if (local < 18 && rt.tMs - rt.lastRunMs > wagMs * 0.7) {
          rt.lastRunMs = rt.tMs
          rt.runs[rt.scout - 1] += 1
          rt.runTimes.push(rt.tMs)
          if (rt.runTimes.length > 64) rt.runTimes.shift()
          injectRun(rt)
          pushEvent(rt, 'waggle', `${site.name}  ${site.waggleS.toFixed(2)} s  ${site.bearingDeg}°`)
        }
      } else {
        const loop = (local - wagMs) / Math.max(80, cycle - wagMs)
        const side = Math.floor(rt.tMs / cycle) % 2 === 0 ? 1 : -1
        rt.angle = bearing + side * loop * Math.PI
        rt.waggle *= 0.92
      }
      return
    }
    default: {
      const _never: never = site.kind
      return _never
    }
  }
}

function meanIds(rt: SimRuntime, ids: readonly string[]) {
  return ids.reduce((sum, id) => sum + (rt.lobes[id] ?? 0), 0) / ids.length
}

function injectRun(rt: SimRuntime) {
  rt.lobes.AL_L = Math.min(1, rt.lobes.AL_L + 0.48)
  rt.lobes.AL_R = Math.min(1, rt.lobes.AL_R + 0.48)
  rt.lobes.La_L = Math.min(1, rt.lobes.La_L + 0.22)
  rt.lobes.La_R = Math.min(1, rt.lobes.La_R + 0.22)
  rt.lobes.LoP_L = Math.min(1, (rt.lobes.LoP_L ?? 0) + 0.16)
  rt.lobes.LoP_R = Math.min(1, (rt.lobes.LoP_R ?? 0) + 0.16)
  for (const edge of TRACTS) {
    if (rt.lobes[edge.from] < 0.18) continue
    rt.lobes[edge.to] = Math.min(1, rt.lobes[edge.to] + rt.lobes[edge.from] * 0.08)
  }
}

function decay(rt: SimRuntime) {
  for (const id of Object.keys(rt.lobes)) rt.lobes[id] *= 0.968
}

function paintGlomeruli(rt: SimRuntime) {
  const al = (rt.lobes.AL_L + rt.lobes.AL_R) * 0.5
  for (let i = 0; i < GLOM_N; i++) {
    const feature = i % 11 < 4
    const target = feature ? 0.2 + al * 0.8 + rt.waggle * 0.2 : 0.05 + al * 0.28
    rt.glomeruli[i] += (target - rt.glomeruli[i]) * 0.14
  }
}

function paintComb(rt: SimRuntime) {
  for (let i = 0; i < COMB_N; i++) {
    const ring = Math.floor(i / 12)
    const target = 0.08 + rt.score * 0.5 + rt.waggle * 0.25 * ((ring % 3) + 1) * 0.28
    rt.comb[i] += (target - rt.comb[i]) * 0.1
  }
}

function mbScore(rt: SimRuntime) {
  return meanIds(rt, MB_IDS)
}

function alScore(rt: SimRuntime) {
  return meanIds(rt, AL_IDS)
}

function scoreWindow(rt: SimRuntime) {
  const mb = mbScore(rt)
  const rate = rt.runs[rt.scout - 1] / Math.max(1, rt.tMs / 1000)
  rt.score = Math.min(1, mb * 0.62 + alScore(rt) * 0.18 + Math.min(rate / 3.2, 1) * 0.2)

  const bucket = Math.floor(rt.tMs / WINDOW)
  if (rt.windows.length <= bucket) {
    rt.windows.push(rt.score)
    if (rt.windows.length >= 3) {
      const last = rt.windows.slice(-3)
      const armed = last.every((n) => n > SCORE_LINE) && rt.runs[rt.scout - 1] > 0
      if (armed && rt.phase === 'running') {
        rt.phase = 'armed'
        pushEvent(rt, 'rule', `quorum ${rt.score.toFixed(3)}  three windows  sealed ${RULE_DIGEST}`)
      }
      if (armed && (rt.phase === 'armed' || rt.phase === 'running')) {
        rt.phase = 'signing'
        pushEvent(rt, 'sign', 'the hive is signing')
        void seal(rt)
      }
    }
  }
}

async function seal(rt: SimRuntime) {
  const payload = {
    scout: rt.site.name,
    site: danceLabel(rt.site),
    rule: RULE_TEXT,
    digest: RULE_DIGEST,
    sealed: RULE_SEALED,
    readings: rt.windows.slice(-3).map((n) => Number(n.toFixed(4))),
    runs: rt.runTimes.slice(-8).map((n) => Number(n.toFixed(3))),
  }
  const buf = new TextEncoder().encode(JSON.stringify(payload))
  const dig = await crypto.subtle.digest('SHA-256', buf)
  rt.hash = [...new Uint8Array(dig)].map((b) => b.toString(16).padStart(2, '0')).join('')
  rt.signedAt = new Date().toISOString()
  rt.phase = 'launched'
  pushEvent(rt, 'sign', `mint  ${rt.hash.slice(0, 16)}…`)
}

function integrate(rt: SimRuntime, wallDt: number) {
  const simMs = Math.min(24, wallDt) * rt.speed
  rt.tMs += simMs
  dancePhase(rt)
  decay(rt)
  paintGlomeruli(rt)
  paintComb(rt)
  scoreWindow(rt)

  const selected = rt.scout - 1
  for (let i = 0; i < 8; i++) {
    const drive = i === selected ? rt.waggle : rt.waggle * 0.2
    const trace = rt.traces[i]
    trace.push(drive)
    if (trace.length > TRACE) trace.shift()
  }
  rt.angleTrace.push(rt.angle)
  if (rt.angleTrace.length > TRACE) rt.angleTrace.shift()
}

export function createRuntime(): SimRuntime {
  const site = SCOUTS[0]
  return {
    playing: true,
    speed: 1,
    scout: 1,
    site,
    tMs: 0,
    angle: 0,
    waggle: 0,
    runs: Array.from({ length: 8 }, () => 0),
    runTimes: [],
    traces: Array.from({ length: 8 }, () => [] as number[]),
    angleTrace: [],
    glomeruli: Array.from({ length: GLOM_N }, () => 0.06),
    lobes: emptyLobes(),
    comb: Array.from({ length: COMB_N }, () => 0.08),
    score: 0,
    windows: [],
    phase: 'running',
    events: [{ t: 0, kind: 'scout', text: `${site.name}  ${danceLabel(site)}  von Frisch` }],
    hash: '',
    signedAt: '',
    lastRunMs: -999,
  }
}

export function resetRuntime(rt: SimRuntime, site: Scout, scout: number) {
  const next = createRuntime()
  next.playing = rt.playing
  next.speed = rt.speed
  next.scout = scout
  next.site = site
  next.events = [{ t: 0, kind: 'scout', text: `${site.name}  ${danceLabel(site)}  von Frisch` }]
  Object.assign(rt, next)
}

export function exportAudit(rt: SimRuntime) {
  return {
    specimen: 'BEEBRAIN',
    site: rt.site,
    rule: RULE_TEXT,
    digest: RULE_DIGEST,
    sealed: RULE_SEALED,
    score: rt.score,
    windows: rt.windows.slice(-6),
    runs: rt.runs,
    hash: rt.hash,
    signedAt: rt.signedAt,
    phase: rt.phase,
    tMs: rt.tMs,
  }
}

export function useBeeSim() {
  const runtime = useRef<SimRuntime>(createRuntime())
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let frame = 0
    let last = performance.now()
    let ui = 0
    const loop = (now: number) => {
      const dt = now - last
      last = now
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
    setScout(n: number) {
      resetRuntime(runtime.current, scoutById(n), n)
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
      resetRuntime(runtime.current, runtime.current.site, runtime.current.scout)
      setTick((x) => x + 1)
    },
  }
}

export function waggleHz(rt: SimRuntime) {
  switch (rt.site.kind) {
    case 'round':
      return 1.6
    case 'waggle':
      return 1 / Math.max(0.35, rt.site.waggleS + 0.42)
    default: {
      const _never: never = rt.site.kind
      return _never
    }
  }
}

export function runRate(rt: SimRuntime) {
  return rt.runs[rt.scout - 1] / Math.max(0.2, rt.tMs / 1000)
}

export function mbRead(rt: SimRuntime) {
  return mbScore(rt)
}

export function alRead(rt: SimRuntime) {
  return alScore(rt)
}

export function lipRead(rt: SimRuntime) {
  return meanIds(rt, LIP_IDS)
}

export function collarRead(rt: SimRuntime) {
  return meanIds(rt, COLLAR_IDS)
}

export function quorumWindows(rt: SimRuntime) {
  return rt.windows.slice(-3).filter((n) => n > SCORE_LINE).length
}
