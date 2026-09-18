import {
  biomeOf,
  cat,
  caterpillar,
  hawk,
  hud,
  msTile,
  penisBird,
  plane,
  pops,
  scanlines,
  snake,
  world,
  worm,
  type Biome,
} from './draw.ts'
import {
  addPoints,
  awardQuest,
  claimPoints,
  loadHunt,
  saveHunt,
  stampMedal,
  unlockFromRun,
  type Costume,
  type HuntSave,
} from './hunt.ts'

export type Screen = 'title' | 'play' | 'dead' | 'hunt'

type Kind = 'worm' | 'caterpillar' | 'hawk' | 'cat' | 'snake' | 'plane' | 'ms'

type Pop = { x: number; y: number; text: string; life: number }

type Thing = {
  kind: Kind
  x: number
  y: number
  hit: boolean
}

const GRAVITY = 1180
const FLAP = -430
const SPEED = 220
const CROP_MAX = 12
const NEST_LEN = 4200

export class Game {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  screen: Screen = 'title'
  hunt: HuntSave
  onHunt?: () => void
  holding = false
  paused = false
  stretch = 1
  y = 220
  vy = 0
  t = 0
  scroll = 0
  score = 0
  worms = 0
  crop = 0
  nest = 0
  lives = 4
  level = 1
  nests = 0
  skim = 0
  scratched = false
  invuln = 0
  flash = 0
  earned = 0
  things: Thing[] = []
  spawn = 0
  msSpawn = 0
  last = 0
  picked = 0
  ms = 0
  combo = 1
  floaters: Pop[] = []

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('no canvas')
    this.canvas = canvas
    this.ctx = ctx
    this.hunt = loadHunt()
    this.fit()
    addEventListener('resize', () => this.fit())
  }

  get biome(): Biome {
    return biomeOf(this.level)
  }

  fit() {
    const wrap = this.canvas.parentElement
    const maxW = Math.min(1100, wrap?.clientWidth ?? 960)
    const maxH = Math.min(560, Math.max(320, (wrap?.clientHeight ?? 520) - 4))
    let w = maxW
    let h = Math.round(w * 9 / 16)
    if (h > maxH) {
      h = maxH
      w = Math.round(h * 16 / 9)
    }
    this.canvas.width = Math.max(640, w)
    this.canvas.height = Math.max(360, h)
  }

  setCostume(costume: Costume) {
    if (!this.hunt.unlocked.includes(costume)) return
    this.hunt.costume = costume
    saveHunt(this.hunt)
    this.onHunt?.()
  }

  claim() {
    const n = claimPoints(this.hunt)
    if (n) saveHunt(this.hunt)
    this.onHunt?.()
    return n
  }

  tapDown() {
    switch (this.screen) {
      case 'title':
      case 'dead':
        this.start()
        this.flap()
        break
      case 'play':
        this.flap()
        break
      case 'hunt':
        break
      default: {
        const _never: never = this.screen
        return _never
      }
    }
  }

  tapUp() {
    this.holding = false
  }

  flap() {
    this.vy = FLAP
    this.stretch = 2.15
    beep(540, 0.04)
  }

  start() {
    this.screen = 'play'
    this.y = this.canvas.height * 0.42
    this.vy = FLAP
    this.stretch = 2.15
    this.t = 0
    this.scroll = 0
    this.score = 0
    this.picked = 0
    this.worms = 0
    this.crop = 0
    this.nest = 0
    this.lives = 4
    this.level = 1
    this.nests = 0
    this.skim = 0
    this.scratched = false
    this.invuln = 0.6
    this.flash = 0
    this.earned = 0
    this.things = []
    this.spawn = 0
    this.msSpawn = 0
    this.ms = 0
    this.combo = 1
    this.floaters = []
  }

  hurt() {
    if (this.invuln > 0 || this.screen !== 'play') return
    this.lives -= 1
    this.invuln = 1.2
    this.flash = 0.45
    beep(160, 0.12)
    if (this.lives <= 0) this.over()
  }

  over() {
    if (this.screen !== 'play') return
    this.screen = 'dead'
    this.holding = false
    this.flash = 1
    beep(120, 0.2)
    unlockFromRun(this.hunt, this.score, this.worms, this.nests, this.level)
    this.earned += awardQuest(this.hunt, 'play', 1)
    this.earned += awardQuest(this.hunt, 'worms', this.worms)
    this.earned += awardQuest(this.hunt, 'crop', this.crop >= CROP_MAX ? 1 : 0)
    this.earned += awardQuest(this.hunt, 'nest', this.nests)
    this.earned += awardQuest(this.hunt, 'ms', this.ms)
    if (this.skim >= 3) stampMedal(this.hunt, 'Limbo Legend')
    if (this.y < 80) stampMedal(this.hunt, 'Medulla Oblongata')
    if (this.scratched) stampMedal(this.hunt, 'Cat Scratch Fever')
    if (this.level >= 4) stampMedal(this.hunt, 'To Completion')
    saveHunt(this.hunt)
    this.onHunt?.()
  }

  tick(now: number) {
    const dt = Math.min(0.032, this.last ? (now - this.last) / 1000 : 0.016)
    this.last = now
    this.t += dt
    this.flash = Math.max(0, this.flash - dt * 3)
    this.invuln = Math.max(0, this.invuln - dt)
    if (this.screen === 'play' && !this.paused) this.step(dt)
    this.paint()
    requestAnimationFrame((n) => this.tick(n))
  }

  step(dt: number) {
    this.stretch += (1 - this.stretch) * Math.min(1, 7 * dt)
    this.vy += GRAVITY * dt
    this.vy = Math.max(-520, Math.min(560, this.vy))
    this.y += this.vy * dt
    const floor = this.canvas.height - 70
    const ceil = 70
    if (this.y > floor) {
      this.y = floor
      this.vy = Math.min(0, this.vy)
    }
    if (this.y < ceil) {
      this.y = ceil
      this.vy = 40
    }

    const pace = SPEED + Math.min(140, this.level * 18 + this.scroll / 80)
    this.scroll += pace * dt
    this.nest = Math.min(1, this.nest + (pace * dt) / NEST_LEN)
    this.score = this.picked + Math.floor(this.scroll / 5)

    if (this.nest >= 1) this.clearNest()

    this.spawn += dt
    this.msSpawn += dt
    if (this.spawn > 0.9) {
      this.spawn = 0
      this.spawnThing()
    }
    if (this.msSpawn > 1.35) {
      this.msSpawn = 0
      this.spawnMsRoad()
    }
    for (const p of this.floaters) {
      p.y -= 40 * dt
      p.life -= dt
    }
    this.floaters = this.floaters.filter((p) => p.life > 0)

    const px = 190
    for (const e of this.things) {
      e.x -= pace * dt
      if (e.kind === 'hawk') e.y += Math.sin(this.t * 5 + e.x * 0.02) * 50 * dt
      if (e.kind === 'plane') e.y += Math.sin(this.t * 3) * 20 * dt
      if (e.hit) continue
      const d = Math.hypot(px - e.x, this.y - e.y)
      if (d < hitRadius(e.kind) + 16) {
        e.hit = true
        this.touch(e)
      } else if (!e.hit && isHazard(e.kind) && e.x < px - 10 && d < 48) {
        e.hit = true
        this.skim += 1
      }
    }
    this.things = this.things.filter((e) => e.x > -80)
  }

  clearNest() {
    this.nests += 1
    const dump = this.crop * 80
    this.picked += 400 + dump
    this.score = this.picked + Math.floor(this.scroll / 5)
    this.crop = 0
    this.nest = 0
    this.level += 1
    this.invuln = 1
    this.flash = 0.4
    beep(880, 0.1)
    this.earned += awardQuest(this.hunt, 'nest', this.nests)
    saveHunt(this.hunt)
    this.onHunt?.()
  }

  spawnThing() {
    const roll = Math.random()
    const air = 90 + Math.random() * (this.canvas.height - 180)
    const x = this.canvas.width + 40
    if (roll < 0.42) {
      this.things.push({ kind: 'worm', x, y: air, hit: false })
      return
    }
    if (roll < 0.58) {
      this.things.push({ kind: 'caterpillar', x, y: air, hit: false })
      return
    }
    if (roll < 0.78) {
      this.things.push({ kind: 'hawk', x, y: 80 + Math.random() * 180, hit: false })
      return
    }
    if (roll < 0.86) {
      this.things.push({ kind: 'plane', x, y: air, hit: false })
      return
    }
    if (roll < 0.93) {
      this.things.push({ kind: 'cat', x, y: this.canvas.height - 78, hit: false })
      return
    }
    this.things.push({ kind: 'snake', x, y: this.canvas.height - 70, hit: false })
  }

  spawnMsRoad() {
    const base = 110 + Math.random() * (this.canvas.height - 220)
    const wave = 28 + Math.random() * 24
    const start = this.canvas.width + 30
    for (let i = 0; i < 7; i++) {
      this.things.push({
        kind: 'ms',
        x: start + i * 38,
        y: base + Math.sin(i * 0.9) * wave,
        hit: false,
      })
    }
  }

  touch(e: Thing) {
    switch (e.kind) {
      case 'ms':
        this.grabMs()
        break
      case 'worm':
        this.eat(100)
        beep(760, 0.05)
        break
      case 'caterpillar':
        this.eat(250)
        beep(900, 0.06)
        break
      case 'hawk':
      case 'snake':
      case 'plane':
        this.combo = 1
        this.hurt()
        break
      case 'cat':
        this.combo = 1
        this.scratched = true
        this.hurt()
        break
      default: {
        const _never: never = e.kind
        return _never
      }
    }
  }

  grabMs() {
    this.ms += 1
    this.combo = Math.min(8, this.combo + 1)
    const gain = 5 * this.combo
    addPoints(this.hunt, gain)
    this.earned += awardQuest(this.hunt, 'ms', this.ms)
    this.picked += 40
    this.score = this.picked + Math.floor(this.scroll / 5)
    this.floaters.push({ x: 210, y: this.y - 20, text: `+${gain}`, life: 0.7 })
    saveHunt(this.hunt)
    this.onHunt?.()
    beep(820 + this.combo * 40, 0.05)
  }

  eat(pts: number) {
    this.combo = 1
    this.worms += 1
    this.crop = Math.min(CROP_MAX, this.crop + 1)
    this.picked += pts
    this.score = this.picked + Math.floor(this.scroll / 5)
    if (this.crop >= CROP_MAX) {
      this.earned += awardQuest(this.hunt, 'crop', 1)
      saveHunt(this.hunt)
      this.onHunt?.()
    }
  }

  paint() {
    const { ctx, canvas } = this
    const w = canvas.width
    const h = canvas.height
    this.canvas.dataset.screen = this.screen
    ctx.imageSmoothingEnabled = false
    world(ctx, w, h, this.t, this.screen === 'title' ? 'farm' : this.biome, this.scroll + this.t * 30)

    for (const e of this.things) drawThing(ctx, e, this.t)
    pops(ctx, this.floaters)

    const rot = Math.max(-0.4, Math.min(0.5, this.vy / 760))
    const by = this.screen === 'title' ? h * 0.46 + Math.sin(this.t * 2.4) * 12 : this.y
    const blink = this.invuln > 0 && Math.floor(this.t * 16) % 2 === 0
    const stretch = this.screen === 'play' ? this.stretch : 1 + Math.sin(this.t * 3) * 0.04
    if (!blink || this.screen !== 'play') {
      penisBird(ctx, 190, by, this.screen === 'title' ? -0.12 : rot, Math.sin(this.t * 10), this.hunt.costume, stretch)
    }

    if (this.screen === 'play' || this.screen === 'dead') {
      hud(ctx, w, {
        level: this.level,
        score: this.score,
        high: Math.max(this.hunt.best, this.score),
        worms: this.worms,
        ms: this.ms,
        lives: this.lives,
        crop: this.crop / CROP_MAX,
        nest: this.nest,
        bank: this.hunt.points,
      })
    }

    if (this.screen === 'title') {
      hawk(ctx, w * 0.62, 110 + Math.sin(this.t * 2) * 8, Math.sin(this.t * 10))
      hawk(ctx, w * 0.78, 160 + Math.cos(this.t * 1.6) * 10, Math.sin(this.t * 9))
      cat(ctx, 90, h - 78, this.t)
      for (let i = 0; i < 5; i++) msTile(ctx, w * 0.42 + i * 42, 200 + Math.sin(this.t * 3 + i) * 16, this.t)
    }

    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,80,80,${this.flash * 0.35})`
      ctx.fillRect(0, 0, w, h)
    }
    scanlines(ctx, w, h)
  }
}

function drawThing(ctx: CanvasRenderingContext2D, e: Thing, t: number) {
  if (e.hit && isFood(e.kind)) return
  switch (e.kind) {
    case 'ms':
      msTile(ctx, e.x, e.y, t)
      break
    case 'worm':
      worm(ctx, e.x, e.y, t)
      break
    case 'caterpillar':
      caterpillar(ctx, e.x, e.y, t)
      break
    case 'hawk':
      hawk(ctx, e.x, e.y, Math.sin(t * 12))
      break
    case 'cat':
      cat(ctx, e.x, e.y, t)
      break
    case 'snake':
      snake(ctx, e.x, e.y, t)
      break
    case 'plane':
      plane(ctx, e.x, e.y)
      break
    default: {
      const _never: never = e.kind
      return _never
    }
  }
}

function hitRadius(kind: Kind) {
  switch (kind) {
    case 'ms':
      return 18
    case 'worm':
      return 12
    case 'caterpillar':
      return 16
    case 'hawk':
      return 22
    case 'cat':
      return 26
    case 'snake':
      return 20
    case 'plane':
      return 14
    default: {
      const _never: never = kind
      return _never
    }
  }
}

function isFood(kind: Kind) {
  switch (kind) {
    case 'ms':
    case 'worm':
    case 'caterpillar':
      return true
    case 'hawk':
    case 'cat':
    case 'snake':
    case 'plane':
      return false
    default: {
      const _never: never = kind
      return _never
    }
  }
}

function isHazard(kind: Kind) {
  return !isFood(kind)
}

let audio: AudioContext | null = null

function beep(freq: number, seconds: number) {
  try {
    audio ??= new AudioContext()
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    osc.frequency.value = freq
    osc.type = 'square'
    gain.gain.value = 0.035
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + seconds)
    osc.connect(gain)
    gain.connect(audio.destination)
    osc.start()
    osc.stop(audio.currentTime + seconds)
  } catch {
    return
  }
}
