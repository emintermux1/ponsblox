import { useEffect, useRef, useState } from 'react'
import { BIN_MS, TUNING_BINS } from './lore.ts'

export type CourtPhase = 'open' | 'rally' | 'juice'
export type Side = 'you' | 'pager'
export type EventKind = 'rally' | 'hold' | 'juice' | 'you' | 'pager' | 'reset'

export type CourtEvent = {
  t: number
  kind: EventKind
  text: string
}

export type SimRuntime = {
  playing: boolean
  speed: 1 | 2 | 4
  phase: CourtPhase
  t: number
  youY: number
  pagerY: number
  ballX: number
  ballY: number
  ballVx: number
  ballVy: number
  intentY: number
  confidence: number
  hold: number
  rallies: number
  juice: number
  youScore: number
  pagerScore: number
  hitSide: Side | null
  hitAge: number
  scoreSide: Side | null
  scoreAge: number
  pagerBias: number
  pagerDelay: number
  aimY: number
  aimClock: number
  bins: number[]
  events: CourtEvent[]
}

export type CourtInput = {
  up: boolean
  down: boolean
  pointer: boolean
  targetY: number
  /** Inner court width / height. Makes a circular ball match X and Y hitboxes. */
  aspect: number
}

/** Court is [-1, 1] on both axes. Draw and collide from these only. */
export const YOU_X = -0.86
export const PAGER_X = 0.86
export const BALL_R = 0.018
/** Half-height in normalized Y. Full paddle is ~20% of court height. */
export const PADDLE_H = 0.2
/** Visual height / width. Classic tall Pong racket, never a square. */
export const PADDLE_SLIM = 7
export const WALL_Y = 0.92

const MAX_EVENTS = 16
const PAD_LIM = WALL_Y - PADDLE_H

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n))
}

export function courtAspect(aspect: number) {
  return Math.max(0.45, aspect)
}

/** Normalized paddle width so the drawn racket stays ~1:7 on any court. */
export function paddleWidth(aspect: number) {
  return (2 * PADDLE_H) / (PADDLE_SLIM * courtAspect(aspect))
}

export function paddleFace(side: Side, aspect: number) {
  const w = paddleWidth(aspect)
  return side === 'you' ? YOU_X + w / 2 : PAGER_X - w / 2
}

export function paddleBack(side: Side, aspect: number) {
  const w = paddleWidth(aspect)
  return side === 'you' ? YOU_X - w / 2 : PAGER_X + w / 2
}

export function ballSpeed(rt: Pick<SimRuntime, 'ballVx' | 'ballVy'>) {
  return Math.hypot(rt.ballVx, rt.ballVy)
}

function phaseOf(rt: Pick<SimRuntime, 'juice' | 'rallies'>): CourtPhase {
  if (rt.juice > 0.22) return 'juice'
  if (rt.rallies > 0) return 'rally'
  return 'open'
}

function emptyBins() {
  return Array.from({ length: TUNING_BINS }, () => 0)
}

function seedRuntime(): SimRuntime {
  return {
    playing: true,
    speed: 1,
    phase: 'open',
    t: 0,
    youY: 0,
    pagerY: 0,
    ballX: 0,
    ballY: 0.06,
    ballVx: -0.58,
    ballVy: 0.24,
    intentY: 0,
    confidence: 0.42,
    hold: 0.2,
    rallies: 0,
    juice: 0,
    youScore: 0,
    pagerScore: 0,
    hitSide: null,
    hitAge: 99,
    scoreSide: null,
    scoreAge: 99,
    pagerBias: 0.08,
    pagerDelay: 0.16,
    aimY: 0,
    aimClock: 0,
    bins: emptyBins(),
    events: [{ t: 0, kind: 'reset', text: 'court armed · you vs Pager' }],
  }
}

function pushEvent(rt: SimRuntime, kind: EventKind, text: string) {
  rt.events = [{ t: rt.t, kind, text }, ...rt.events].slice(0, MAX_EVENTS)
}

function serve(rt: SimRuntime, towardYou: boolean) {
  const dir = towardYou ? -1 : 1
  rt.ballX = 0.08 * dir
  rt.ballY = (Math.random() * 2 - 1) * 0.28
  rt.ballVx = dir * (0.52 + Math.random() * 0.16)
  rt.ballVy = (Math.random() * 2 - 1) * 0.38
  rt.rallies = 0
  retunePager(rt, !towardYou)
}

function tuneBins(rt: SimRuntime): number[] {
  const angle = Math.atan2(rt.intentY, 0.35)
  const punch = Math.exp(-rt.hitAge * 7.5)
  const score = Math.exp(-rt.scoreAge * 2.8)
  const speed = Math.min(1, ballSpeed(rt) / 1.35)
  return Array.from({ length: TUNING_BINS }, (_, i) => {
    const pref = (i / TUNING_BINS) * Math.PI * 2 - Math.PI / 2
    const cos = Math.max(0, Math.cos(angle - pref))
    const left = i < TUNING_BINS / 2
    const hemi =
      rt.hitSide === 'you' ? (left ? 1 : 0.28) : rt.hitSide === 'pager' ? (left ? 0.28 : 1) : 0.7
    const lift =
      0.12 +
      cos * 0.58 +
      Math.max(0, 1 - Math.abs(rt.ballY - Math.sin(pref)) * 0.45) * 0.1 +
      punch * hemi * 0.55 +
      score * 0.35 +
      speed * 0.08
    return clamp(lift, 0, 1)
  })
}

function pagerSkill(rt: SimRuntime) {
  const lead = rt.pagerScore - rt.youScore
  return clamp(0.78 - lead * 0.05, 0.52, 0.88)
}

function retunePager(rt: SimRuntime, incoming: boolean) {
  const skill = pagerSkill(rt)
  if (!incoming) {
    rt.pagerDelay = 0.03
    rt.pagerBias *= 0.35
    return
  }
  const whiff = Math.random() > 0.74 + skill * 0.1
  rt.pagerDelay = 0.055 + (1 - skill) * 0.1 + Math.random() * 0.05
  rt.pagerBias = (Math.random() * 2 - 1) * (whiff ? 0.3 : 0.07)
  if (whiff && Math.random() < 0.4) rt.pagerDelay += 0.1
}

function ballRy(aspect: number) {
  return BALL_R * courtAspect(aspect)
}

function yOverlap(ballY: number, paddleY: number, aspect: number) {
  return Math.abs(ballY - paddleY) <= PADDLE_H + ballRy(aspect)
}

/** Face-crossing or in-slab contact. No extra slack — edge of ball vs paddle face. */
function paddleContact(
  prevX: number,
  prevY: number,
  x: number,
  y: number,
  vx: number,
  side: Side,
  paddleY: number,
  aspect: number,
) {
  const toward = side === 'you' ? vx < 0 : vx > 0
  if (!toward) return false

  const face = paddleFace(side, aspect)
  const back = paddleBack(side, aspect)
  const prevEdge = side === 'you' ? prevX - BALL_R : prevX + BALL_R
  const edge = side === 'you' ? x - BALL_R : x + BALL_R
  const crossed =
    side === 'you' ? prevEdge > face && edge <= face : prevEdge < face && edge >= face
  const inSlab =
    side === 'you' ? x + BALL_R >= back && x - BALL_R <= face : x - BALL_R <= back && x + BALL_R >= face

  if (!crossed && !inSlab) return false

  let hitY = y
  if (crossed) {
    const span = prevEdge - edge
    const t = Math.abs(span) > 1e-8 ? (prevEdge - face) / span : 1
    hitY = prevY + (y - prevY) * t
  }
  return yOverlap(hitY, paddleY, aspect)
}

function bounce(rt: SimRuntime, side: Side, paddleY: number, spin: number, aspect: number) {
  const face = paddleFace(side, aspect)
  rt.ballX = side === 'you' ? face + BALL_R : face - BALL_R
  rt.ballVx = Math.abs(rt.ballVx) * (side === 'you' ? 1 : -1) * (1.02 + Math.random() * 0.03)
  rt.ballVy += (rt.ballY - paddleY) * 1.35 + spin
  rt.ballVy = clamp(rt.ballVy, -0.95, 0.95)
  rt.rallies += 1
  rt.hold = clamp(rt.hold + 0.1, 0, 1)
  rt.hitSide = side
  rt.hitAge = 0
  if (side === 'you') retunePager(rt, true)
  pushEvent(rt, 'rally', `exchange ${rt.rallies} · ${side === 'you' ? 'you' : 'Pager'} met the ball`)
  if (rt.rallies % 4 === 0) {
    pushEvent(rt, 'hold', `${rt.rallies} on the line · court stays open`)
  }
}

function step(rt: SimRuntime, dt: number, input: CourtInput) {
  rt.t += dt
  rt.hitAge += dt
  rt.scoreAge += dt
  rt.juice *= Math.exp(-dt * 1.35)

  if (input.up || input.down) {
    rt.youY += ((input.up ? 1 : 0) - (input.down ? 1 : 0)) * 2.15 * dt
  } else if (input.pointer) {
    rt.youY += (input.targetY - rt.youY) * Math.min(1, 16 * dt)
  }
  rt.youY = clamp(rt.youY, -PAD_LIM, PAD_LIM)

  const incoming = rt.ballVx > 0
  const skill = pagerSkill(rt)
  rt.pagerDelay = Math.max(0, rt.pagerDelay - dt)
  rt.aimClock += dt
  if (rt.aimClock > 0.028) {
    rt.aimClock = 0
    const look = incoming && rt.pagerDelay <= 0
    const predict = look ? rt.ballY + rt.ballVy * 0.22 : 0
    rt.aimY = predict + rt.pagerBias + (Math.random() - 0.5) * 0.05
  }
  if (incoming && rt.ballX > 0.45 && Math.random() < dt * 0.16) {
    rt.pagerBias += (Math.random() - 0.5) * 0.08
  }
  const close = incoming && rt.ballX > 0.58
  const maxSpd = 1.45 + skill * 0.4 + (close ? 0.25 : 0)
  const react = rt.pagerDelay > 0 ? 0.3 : close ? 2.15 : incoming ? 1.85 : 0.7
  rt.intentY += (rt.aimY - rt.pagerY) * react * dt
  rt.intentY *= Math.exp(-dt * 2.2)
  rt.intentY = clamp(rt.intentY, -maxSpd, maxSpd)
  rt.pagerY = clamp(rt.pagerY + rt.intentY * dt, -PAD_LIM, PAD_LIM)

  const lock = 1 - Math.min(1, Math.abs(rt.pagerY - rt.ballY) / 0.55)
  const targetConf = incoming && rt.pagerDelay <= 0 ? 0.22 + lock * 0.62 : rt.confidence * 0.86
  rt.confidence += (targetConf - rt.confidence) * Math.min(1, 3.2 * dt)

  const aspect = courtAspect(input.aspect)
  const ry = ballRy(aspect)
  const prevX = rt.ballX
  const prevY = rt.ballY
  rt.ballX += rt.ballVx * dt
  rt.ballY += rt.ballVy * dt
  if (rt.ballY > WALL_Y - ry || rt.ballY < -WALL_Y + ry) {
    rt.ballY = clamp(rt.ballY, -WALL_Y + ry, WALL_Y - ry)
    rt.ballVy *= -1
  }

  if (paddleContact(prevX, prevY, rt.ballX, rt.ballY, rt.ballVx, 'you', rt.youY, aspect)) {
    bounce(rt, 'you', rt.youY, 0, aspect)
  } else if (paddleContact(prevX, prevY, rt.ballX, rt.ballY, rt.ballVx, 'pager', rt.pagerY, aspect)) {
    bounce(rt, 'pager', rt.pagerY, rt.intentY * 0.1, aspect)
  }

  const missLine = 1.08
  if (rt.ballX < -missLine) {
    rt.pagerScore += 1
    rt.juice = 1
    rt.hold = clamp(rt.hold - 0.2, 0, 1)
    rt.scoreSide = 'pager'
    rt.scoreAge = 0
    pushEvent(rt, 'pager', `Pager ${rt.pagerScore} · smoothie window`)
    pushEvent(rt, 'juice', 'banana smoothie')
    serve(rt, true)
  } else if (rt.ballX > missLine) {
    rt.youScore += 1
    rt.juice = clamp(rt.juice * 0.2, 0, 1)
    rt.hold = clamp(rt.hold + 0.06, 0, 1)
    rt.scoreSide = 'you'
    rt.scoreAge = 0
    pushEvent(rt, 'you', `you ${rt.youScore} · Pager missed the line`)
    serve(rt, false)
  }

  rt.hold = clamp(rt.hold - dt * 0.05, 0, 1)
  rt.bins = tuneBins(rt)
  rt.phase = phaseOf(rt)
}

export function binRead(runtime: SimRuntime) {
  return runtime.bins.reduce((s, n) => s + n, 0) / runtime.bins.length
}

export function exportAudit(runtime: SimRuntime) {
  return {
    kind: 'pager-court',
    t: runtime.t,
    phase: runtime.phase,
    youY: runtime.youY,
    pagerY: runtime.pagerY,
    intentY: runtime.intentY,
    confidence: runtime.confidence,
    youScore: runtime.youScore,
    pagerScore: runtime.pagerScore,
    rallies: runtime.rallies,
    hitSide: runtime.hitSide,
    scoreSide: runtime.scoreSide,
    events: runtime.events,
  }
}

export function usePagerSim() {
  const live = useRef<SimRuntime>(seedRuntime())
  const [runtime, setRuntime] = useState<SimRuntime>(live.current)
  const input = useRef<CourtInput>({ up: false, down: false, pointer: false, targetY: 0, aspect: 2.2 })

  useEffect(() => {
    function onKey(ev: KeyboardEvent, down: boolean) {
      const tag = (ev.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return
      switch (ev.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          input.current.up = down
          ev.preventDefault()
          break
        case 'ArrowDown':
        case 's':
        case 'S':
          input.current.down = down
          ev.preventDefault()
          break
        default:
          break
      }
    }
    const down = (ev: KeyboardEvent) => onKey(ev, true)
    const up = (ev: KeyboardEvent) => onKey(ev, false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)

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
      step(next, raw * next.speed, input.current)
      live.current = next
      if (now - uiAt > BIN_MS) {
        uiAt = now
        setRuntime(next)
      }
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  function aim(y: number, on: boolean) {
    input.current.pointer = on
    input.current.targetY = clamp(y, -PAD_LIM, PAD_LIM)
  }

  function setAspect(aspect: number) {
    input.current.aspect = Math.max(0.35, aspect)
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
    next.speed = live.current.speed
    live.current = next
    setRuntime(next)
  }

  function setSpeed(speed: 1 | 2 | 4) {
    setRuntime((rt) => {
      const next = { ...rt, speed }
      live.current = next
      return next
    })
  }

  return { runtime, live, aim, setAspect, toggle, reset, setSpeed }
}
