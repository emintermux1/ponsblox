import { loadBank, saveBank } from './bank.ts'

export type Screen = 'title' | 'fight' | 'win' | 'lose'
export type Pad = 'left' | 'right' | 'cover' | 'pistol' | 'rifle' | 'rocket'
export type Weapon = 'pistol' | 'rifle' | 'rocket'
export type AiGun = 'plasma' | 'laser' | 'cannon'

type Floater = { x: number; y: number; text: string; life: number; tint: string }
type Spark = { x: number; y: number; vx: number; vy: number; life: number; color: string }
type Shot = {
  x: number
  y: number
  vx: number
  from: 'human' | 'ai'
  kind: Weapon | AiGun
  life: number
  dmg: number
  pay: number
  w: number
}

type Body = {
  x: number
  hp: number
  max: number
  vx: number
  cool: number
  hurt: number
  flash: number
  fire: number
}

type Ally = { x: number; fire: number }

export type GameHooks = {
  onBank: (n: number) => void
}

export class Fight {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  hooks: GameHooks
  screen: Screen = 'title'
  bank: number
  wave = 1
  coins = 0
  meter = 0
  human: Body
  ai: Body
  allies: Ally[] = []
  shots: Shot[] = []
  keys = { left: false, right: false, cover: false, pistol: false, rifle: false }
  pointer = { left: false, right: false, cover: false, pistol: false, rifle: false }
  floaters: Floater[] = []
  sparks: Spark[] = []
  last = 0
  frame = 0
  timer = 0
  shake = 0
  aiThink = 0
  aiTele = 0
  aiGun: AiGun = 'plasma'
  winHold = 0
  wonAt = 0
  beam = 0
  t = 0
  needFlash = 0

  constructor(canvas: HTMLCanvasElement, hooks: GameHooks) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('no canvas')
    this.canvas = canvas
    this.ctx = ctx
    this.hooks = hooks
    this.bank = loadBank()
    this.human = this.freshHuman()
    this.ai = this.freshAi()
    this.allies = this.freshAllies()
    this.fit()
    this.place()
    this.bind()
    this.timer = window.setInterval(() => {
      const now = performance.now()
      const dt = Math.min(0.04, this.last ? (now - this.last) / 1000 : 0.016)
      this.last = now
      this.tick(dt)
      this.draw()
    }, 16)
  }

  destroy() {
    cancelAnimationFrame(this.frame)
    window.clearInterval(this.timer)
    removeEventListener('resize', this.onResize)
    removeEventListener('keydown', this.onKeyDown)
    removeEventListener('keyup', this.onKeyUp)
    this.canvas.removeEventListener('click', this.onClick)
    this.canvas.removeEventListener('pointerdown', this.onDown)
    this.canvas.removeEventListener('pointermove', this.onMove)
    this.canvas.removeEventListener('pointerup', this.onUp)
    this.canvas.removeEventListener('pointercancel', this.onUp)
  }

  private onResize = () => this.fit()

  private onKeyDown = (ev: KeyboardEvent) => {
    if (ev.repeat) return
    switch (ev.key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        this.keys.left = true
        break
      case 'ArrowRight':
      case 'd':
      case 'D':
        this.keys.right = true
        break
      case 'ArrowDown':
      case 's':
      case 'S':
      case 'Shift':
        this.keys.cover = true
        break
      case ' ':
      case 'j':
      case 'J':
        ev.preventDefault()
        if (this.screen !== 'fight') this.advance()
        else {
          this.keys.pistol = true
          this.tryFire('pistol')
        }
        break
      case 'k':
      case 'K':
        if (this.screen !== 'fight') this.advance()
        else {
          this.keys.rifle = true
          this.tryFire('rifle')
        }
        break
      case 'l':
      case 'L':
        if (this.screen !== 'fight') this.advance()
        else this.tryFire('rocket')
        break
      case 'Enter':
        this.advance()
        break
      default:
        break
    }
  }

  private onKeyUp = (ev: KeyboardEvent) => {
    switch (ev.key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        this.keys.left = false
        break
      case 'ArrowRight':
      case 'd':
      case 'D':
        this.keys.right = false
        break
      case 'ArrowDown':
      case 's':
      case 'S':
      case 'Shift':
        this.keys.cover = false
        break
      case ' ':
      case 'j':
      case 'J':
        this.keys.pistol = false
        break
      case 'k':
      case 'K':
        this.keys.rifle = false
        break
      default:
        break
    }
  }

  private onDown = (ev: PointerEvent) => {
    try {
      this.canvas.setPointerCapture(ev.pointerId)
    } catch {
      /* ignore */
    }
    this.aim(ev.clientX, true)
    if (this.screen !== 'fight') {
      this.advance()
      return
    }
    if (!this.pointer.left && !this.pointer.right && !this.pointer.cover) this.tryFire('rifle')
  }

  private onMove = (ev: PointerEvent) => {
    if (ev.buttons === 0) return
    this.aim(ev.clientX, true)
  }

  private onClick = () => {
    if (this.screen === 'fight') this.tryFire('rifle')
    else this.advance()
  }

  private onUp = () => {
    this.pointer.left = false
    this.pointer.right = false
    this.pointer.cover = false
    this.pointer.pistol = false
    this.pointer.rifle = false
  }

  private bind() {
    addEventListener('resize', this.onResize)
    addEventListener('keydown', this.onKeyDown)
    addEventListener('keyup', this.onKeyUp)
    this.canvas.addEventListener('click', this.onClick)
    this.canvas.addEventListener('pointerdown', this.onDown)
    this.canvas.addEventListener('pointermove', this.onMove)
    this.canvas.addEventListener('pointerup', this.onUp)
    this.canvas.addEventListener('pointercancel', this.onUp)
  }

  fit() {
    const wrap = this.canvas.parentElement
    const w = Math.min(1100, wrap?.clientWidth ?? 960)
    const h = Math.min(520, Math.max(300, window.innerHeight - 230))
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    this.canvas.width = Math.floor(w * dpr)
    this.canvas.height = Math.floor(h * dpr)
    this.canvas.style.width = `${w}px`
    this.canvas.style.height = `${h}px`
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    if (this.screen === 'title') this.place()
  }

  private w() {
    return this.canvas.clientWidth
  }

  private h() {
    return this.canvas.clientHeight
  }

  private ground() {
    return this.h() * 0.78
  }

  private freshHuman(): Body {
    return { x: 180, hp: 100, max: 100, vx: 0, cool: 0, hurt: 0, flash: 0, fire: 0 }
  }

  private freshAi(): Body {
    const max = 70 + this.wave * 22
    return { x: 0, hp: max, max, vx: 0, cool: 0, hurt: 0, flash: 0, fire: 0 }
  }

  private freshAllies(): Ally[] {
    return [
      { x: 70, fire: 0 },
      { x: 118, fire: 0.4 },
      { x: 250, fire: 0.8 },
    ]
  }

  private place() {
    this.human.x = this.w() * 0.22
    this.ai.x = this.w() * 0.78
  }

  start() {
    this.screen = 'fight'
    this.coins = 0
    this.meter = 0.2
    this.human = this.freshHuman()
    this.ai = this.freshAi()
    this.allies = this.freshAllies()
    this.shots = []
    this.place()
    this.aiThink = 0.5
    this.aiTele = 0
    this.aiGun = 'plasma'
    this.winHold = 0
    this.beam = 0
    this.floaters = []
    this.sparks = []
  }

  nextWave() {
    this.wave += 1
    this.start()
  }

  advance() {
    switch (this.screen) {
      case 'title':
        this.wave = 1
        this.start()
        return
      case 'win':
        if (performance.now() - this.wonAt > 700) this.nextWave()
        return
      case 'lose':
        this.wave = 1
        this.start()
        return
      case 'fight':
        return
      default: {
        const _never: never = this.screen
        return _never
      }
    }
  }

  press(kind: Pad, down: boolean) {
    if (this.screen !== 'fight') {
      if (down) this.advance()
      return
    }
    switch (kind) {
      case 'left':
        this.pointer.left = down
        this.pointer.right = false
        return
      case 'right':
        this.pointer.right = down
        this.pointer.left = false
        return
      case 'cover':
        this.pointer.cover = down
        return
      case 'pistol':
        this.pointer.pistol = down
        if (down) this.tryFire('pistol')
        return
      case 'rifle':
        this.pointer.rifle = down
        if (down) this.tryFire('rifle')
        return
      case 'rocket':
        if (down) this.tryFire('rocket')
        return
      default: {
        const _never: never = kind
        return _never
      }
    }
  }

  private covering() {
    return this.keys.cover || this.pointer.cover
  }

  private aim(clientX: number, down: boolean) {
    const box = this.canvas.getBoundingClientRect()
    const x = clientX - box.left
    const w = box.width
    this.pointer.left = down && x < w * 0.22
    this.pointer.right = down && x > w * 0.78
    this.pointer.cover = down && x >= w * 0.22 && x < w * 0.38
  }

  tryFire(kind: Weapon) {
    if (this.screen !== 'fight') return
    if (this.covering()) return
    if (this.human.cool > 0 || this.human.hurt > 0.08) return
    if (kind === 'rocket' && this.meter < 1) {
      if (this.needFlash <= 0) {
        this.pop(this.human.x, this.ground() - 140, 'NEED ROCKET', '#7a8494')
        this.needFlash = 0.9
      }
      return
    }
    const g = this.ground()
    let shot: Shot
    switch (kind) {
      case 'pistol':
        this.human.cool = 0.12
        this.human.fire = 0.08
        shot = {
          x: this.human.x + 42,
          y: g - 78,
          vx: 920,
          from: 'human',
          kind,
          life: 0.7,
          dmg: 7 + this.wave,
          pay: 8 * this.wave,
          w: 10,
        }
        break
      case 'rifle':
        this.human.cool = 0.18
        this.human.fire = 0.1
        shot = {
          x: this.human.x + 52,
          y: g - 80,
          vx: 1100,
          from: 'human',
          kind,
          life: 0.8,
          dmg: 12 + this.wave * 2,
          pay: 14 * this.wave,
          w: 16,
        }
        break
      case 'rocket':
        this.human.cool = 0.45
        this.human.fire = 0.18
        this.meter = 0
        shot = {
          x: this.human.x + 48,
          y: g - 84,
          vx: 520,
          from: 'human',
          kind,
          life: 1.2,
          dmg: 32 + this.wave * 6,
          pay: 48 * this.wave,
          w: 22,
        }
        break
      default: {
        const _never: never = kind
        return _never
      }
    }
    this.human.vx = -90
    this.shots.push(shot)
    this.burst(shot.x, shot.y, '#ffc4a0', 5)
  }

  private hitAi(shot: Shot) {
    this.ai.hp = Math.max(0, this.ai.hp - shot.dmg)
    this.ai.hurt = 0.18
    this.ai.vx = shot.kind === 'rocket' ? 260 : 90
    this.shake = shot.kind === 'rocket' ? 16 : 6
    this.burst(this.ai.x - 18, this.ground() - 88, shot.kind === 'rocket' ? '#ffe08a' : '#ff6a4a')
    if (shot.pay > 0) {
      this.coins += shot.pay
      this.bank += shot.pay
      saveBank(this.bank)
      this.hooks.onBank(this.bank)
      this.meter = Math.min(1, this.meter + (shot.kind === 'rifle' ? 0.22 : 0.14))
      const tag = shot.kind === 'rocket' ? 'ROCKET' : `+${shot.pay} $HUMAN`
      this.pop(this.ai.x, this.ground() - 130, tag, shot.kind === 'rocket' ? '#ffe08a' : '#ffc4a0')
    }
    if (this.ai.hp <= 0) this.win()
  }

  private hitHuman(kind: AiGun, dmg: number) {
    if (this.covering()) {
      this.shake = 3
      this.meter = Math.min(1, this.meter + 0.08)
      this.pop(this.human.x, this.ground() - 118, 'COVER', '#eef2f6')
      return
    }
    this.human.hp = Math.max(0, this.human.hp - dmg)
    this.human.hurt = 0.26
    this.human.vx = -220
    this.shake = kind === 'cannon' ? 14 : 9
    let label = 'HIT'
    switch (kind) {
      case 'plasma':
        label = 'PLASMA'
        break
      case 'laser':
        label = 'LASER'
        break
      case 'cannon':
        label = 'CANNON'
        break
      default: {
        const _never: never = kind
        return _never
      }
    }
    this.pop(this.human.x, this.ground() - 110, label, '#6ae0ff')
    this.burst(this.human.x + 18, this.ground() - 80, '#6ae0ff')
    if (this.human.hp <= 0) this.lose()
  }

  private win() {
    this.screen = 'win'
    this.winHold = 0
    this.wonAt = performance.now()
    const jack = 150 * this.wave
    this.coins += jack
    this.bank += jack
    saveBank(this.bank)
    this.hooks.onBank(this.bank)
    this.pop(this.w() * 0.5, this.h() * 0.38, `WORLD SAVED +${jack} $HUMAN`, '#ffe08a')
  }

  private lose() {
    this.screen = 'lose'
  }

  private pop(x: number, y: number, text: string, tint: string) {
    this.floaters.push({ x, y, text, life: 1, tint })
  }

  private burst(x: number, y: number, color: string, n = 10) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      const s = 70 + Math.random() * 200
      this.sparks.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.28 + Math.random() * 0.22,
        color,
      })
    }
  }

  private tick(dt: number) {
    this.t += dt
    for (const f of this.floaters) {
      f.life -= dt
      f.y -= 48 * dt
    }
    this.floaters = this.floaters.filter((f) => f.life > 0)
    for (const s of this.sparks) {
      s.life -= dt
      s.x += s.vx * dt
      s.y += s.vy * dt
      s.vy += 380 * dt
    }
    this.sparks = this.sparks.filter((s) => s.life > 0)
    this.shake *= 0.86
    this.beam = Math.max(0, this.beam - dt)

    switch (this.screen) {
      case 'title':
        return
      case 'win':
        this.winHold += dt
        return
      case 'lose':
        return
      case 'fight':
        this.war(dt)
        return
      default: {
        const _never: never = this.screen
        return _never
      }
    }
  }

  private war(dt: number) {
    const w = this.w()
    const left = this.keys.left || this.pointer.left
    const right = this.keys.right || this.pointer.right
    const speed = this.covering() ? 90 : 240
    if (!this.covering()) {
      if (left) this.human.vx = -speed
      else if (right) this.human.vx = speed
      else this.human.vx *= 0.78
    } else this.human.vx *= 0.4

    this.human.x += this.human.vx * dt
    this.ai.x += this.ai.vx * dt
    this.human.vx *= 0.82
    this.ai.vx *= 0.84
    this.human.x = Math.max(70, Math.min(w * 0.55, this.human.x))
    this.ai.x = Math.max(this.human.x + 120, Math.min(w - 70, this.ai.x))

    this.human.cool = Math.max(0, this.human.cool - dt)
    this.human.hurt = Math.max(0, this.human.hurt - dt)
    this.human.fire = Math.max(0, this.human.fire - dt)
    this.ai.cool = Math.max(0, this.ai.cool - dt)
    this.ai.hurt = Math.max(0, this.ai.hurt - dt)
    this.ai.flash = Math.max(0, this.ai.flash - dt)
    this.ai.fire = Math.max(0, this.ai.fire - dt)
    this.needFlash = Math.max(0, this.needFlash - dt)

    if (this.keys.pistol || this.pointer.pistol) this.tryFire('pistol')
    if (this.keys.rifle || this.pointer.rifle) this.tryFire('rifle')

    for (const a of this.allies) {
      a.fire = Math.max(0, a.fire - dt)
      if (a.fire === 0 && this.ai.hp > 0) {
        a.fire = 0.7 + Math.random() * 0.6
        this.shots.push({
          x: a.x + 24,
          y: this.ground() - 70,
          vx: 700,
          from: 'human',
          kind: 'pistol',
          life: 0.5,
          dmg: 1,
          pay: 0,
          w: 8,
        })
      }
    }

    this.moveShots(dt)
    this.aiThink -= dt
    if (this.ai.hp <= 0 || this.human.hp <= 0) return

    const dist = this.ai.x - this.human.x
    const wasTele = this.aiTele > 0
    this.aiTele = Math.max(0, this.aiTele - dt)
    if (this.aiTele === 0 && this.ai.fire === 0) {
      if (dist > 320) this.ai.vx = -140 - this.wave * 10
      else if (dist < 200) this.ai.vx = 80
      else if (this.aiThink <= 0 && this.ai.cool <= 0 && !wasTele) this.windup()
    }
    if (wasTele && this.aiTele === 0) this.fireAi()
  }

  private moveShots(dt: number) {
    const g = this.ground()
    const live: Shot[] = []
    for (const s of this.shots) {
      s.life -= dt
      s.x += s.vx * dt
      if (s.life <= 0) continue
      if (s.from === 'human') {
        if (s.x >= this.ai.x - 28) {
          this.hitAi(s)
          continue
        }
        live.push(s)
        continue
      }
      if (s.x <= this.human.x + 22) {
        this.hitHuman(s.kind === 'pistol' || s.kind === 'rifle' || s.kind === 'rocket' ? 'plasma' : s.kind, s.dmg)
        this.burst(this.human.x + 10, g - 78, '#6ae0ff', 6)
        continue
      }
      live.push(s)
    }
    this.shots = live
  }

  private windup() {
    const roll = Math.random()
    let gun: AiGun
    if (roll > 0.7) gun = 'cannon'
    else if (roll > 0.4) gun = 'laser'
    else gun = 'plasma'
    this.aiGun = gun
    switch (gun) {
      case 'plasma':
        this.aiTele = Math.max(0.28, 0.48 - this.wave * 0.02)
        break
      case 'laser':
        this.aiTele = Math.max(0.36, 0.6 - this.wave * 0.02)
        break
      case 'cannon':
        this.aiTele = Math.max(0.42, 0.7 - this.wave * 0.02)
        break
      default: {
        const _never: never = gun
        return _never
      }
    }
    this.ai.flash = this.aiTele
    this.aiThink = 0.65 + Math.random() * 0.45
  }

  private fireAi() {
    const g = this.ground()
    this.ai.fire = 0.16
    switch (this.aiGun) {
      case 'plasma':
        this.ai.cool = 0.5
        this.shots.push({
          x: this.ai.x - 40,
          y: g - 88,
          vx: -780,
          from: 'ai',
          kind: 'plasma',
          life: 0.8,
          dmg: 8 + this.wave,
          pay: 0,
          w: 14,
        })
        return
      case 'laser':
        this.ai.cool = 0.62
        this.beam = 0.16
        this.hitHuman('laser', 12 + this.wave * 2)
        return
      case 'cannon':
        this.ai.cool = 0.78
        this.shots.push({
          x: this.ai.x - 44,
          y: g - 90,
          vx: -520,
          from: 'ai',
          kind: 'cannon',
          life: 1,
          dmg: 18 + this.wave * 2,
          pay: 0,
          w: 20,
        })
        return
      default: {
        const _never: never = this.aiGun
        return _never
      }
    }
  }

  private draw() {
    const ctx = this.ctx
    const w = this.w()
    const h = this.h()
    if (w < 8 || h < 8) return
    const g = this.ground()
    const sx = (Math.random() - 0.5) * this.shake
    const sy = (Math.random() - 0.5) * this.shake
    ctx.save()
    ctx.translate(sx, sy)

    ctx.fillStyle = '#0a0c10'
    ctx.fillRect(0, 0, w, h)
    this.drawWorld(w, g)
    ctx.fillStyle = '#12151c'
    ctx.fillRect(0, g, w, h - g)
    ctx.fillStyle = '#ff6a4a'
    ctx.fillRect(0, g, w, 3)
    ctx.fillStyle = '#3a2a22'
    ctx.fillRect(this.human.x - 36, g - 18, 52, 18)

    if (this.beam > 0) {
      ctx.strokeStyle = `rgba(106,224,255,${0.4 + this.beam})`
      ctx.lineWidth = 5
      ctx.beginPath()
      ctx.moveTo(this.ai.x - 48, g - 88)
      ctx.lineTo(this.human.x + 16, g - (this.covering() ? 40 : 78))
      ctx.stroke()
    }

    switch (this.screen) {
      case 'title':
        this.place()
        this.drawField(g)
        this.banner(w, h, 'SAVE THE WORLD', 'HUMANS vs AI', 'TAP TO FIGHT · humans own $HUMAN')
        break
      case 'fight':
        this.bars(w)
        this.drawField(g)
        this.hint(w, h)
        break
      case 'win':
        this.drawField(g)
        this.banner(w, h, 'WORLD SAVED', `+${this.coins} $HUMAN`, 'THE COIN BELONGS TO HUMANS')
        break
      case 'lose':
        this.drawField(g)
        this.banner(w, h, 'THE WORLD FELL', 'reload · humans still fight for earth', 'TAP TO FIGHT AGAIN')
        break
      default: {
        const _never: never = this.screen
        return _never
      }
    }

    for (const s of this.sparks) {
      ctx.globalAlpha = Math.max(0, s.life * 2)
      ctx.fillStyle = s.color
      ctx.fillRect(s.x, s.y, 4, 4)
    }
    ctx.globalAlpha = 1
    ctx.font = '700 15px "IBM Plex Mono", monospace'
    ctx.textAlign = 'center'
    for (const f of this.floaters) {
      ctx.globalAlpha = Math.max(0, f.life)
      ctx.fillStyle = f.tint
      ctx.fillText(f.text, f.x, f.y)
    }
    ctx.globalAlpha = 1
    ctx.restore()
  }

  private earthLife() {
    switch (this.screen) {
      case 'title':
        return 0.52
      case 'win':
        return 1
      case 'lose':
        return 0.1
      case 'fight': {
        const hurt = this.ai.max > 0 ? 1 - this.ai.hp / this.ai.max : 0.4
        const live = this.human.max > 0 ? this.human.hp / this.human.max : 0.4
        return Math.max(0.18, Math.min(1, 0.32 + hurt * 0.45 + live * 0.23))
      }
      default: {
        const _never: never = this.screen
        return _never
      }
    }
  }

  private drawWorld(w: number, g: number) {
    const ctx = this.ctx
    const life = this.earthLife()
    const sky = ctx.createLinearGradient(0, 0, w, 0)
    sky.addColorStop(0, `rgb(${36 + life * 70}, ${18 + life * 28}, 16)`)
    sky.addColorStop(0.5, '#141018')
    sky.addColorStop(1, '#06141c')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, w, g)

    const dawn = ctx.createRadialGradient(70, Math.max(20, g - 10), 10, 80, Math.max(20, g), Math.max(40, w * 0.55))
    dawn.addColorStop(0, `rgba(255,150,80,${0.16 + life * 0.28})`)
    dawn.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = dawn
    ctx.fillRect(0, 0, w, g)

    const ex = w * 0.5
    const ey = this.screen === 'fight' ? 108 : Math.max(52, g * 0.24)
    const r = Math.min(this.screen === 'fight' ? 36 : 46, g * 0.15)
    ctx.beginPath()
    ctx.arc(ex, ey, r + 12, 0, Math.PI * 2)
    ctx.fillStyle = this.screen === 'win' ? 'rgba(255,224,138,0.32)' : `rgba(90,170,200,${0.1 + life * 0.18})`
    ctx.fill()
    ctx.beginPath()
    ctx.arc(ex, ey, r, 0, Math.PI * 2)
    ctx.fillStyle = life > 0.45 ? '#1a5a78' : '#0c2834'
    ctx.fill()
    ctx.fillStyle = life > 0.45 ? '#3d9a5c' : '#2a5044'
    ctx.beginPath()
    ctx.ellipse(ex - 12, ey - 2, 7, 14, 0.25, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(ex + 8, ey - 8, 12, 7, -0.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(ex + 6, ey + 8, 6, 10, 0.15, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.18)'
    ctx.beginPath()
    ctx.ellipse(ex - 10, ey - 10, 8, 5, 0.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.save()
    ctx.beginPath()
    ctx.arc(ex, ey, r, 0, Math.PI * 2)
    ctx.clip()
    ctx.fillStyle = `rgba(6,16,24,${1 - life})`
    ctx.fillRect(ex, ey - r, r + 4, r * 2)
    ctx.restore()
    ctx.strokeStyle = this.screen === 'win' || life > 0.75 ? '#ffe08a' : '#6ae0ff'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.arc(ex, ey, r, 0, Math.PI * 2)
    ctx.stroke()

    if (this.screen === 'win') {
      ctx.strokeStyle = 'rgba(255,224,138,0.5)'
      ctx.lineWidth = 2
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + this.t * 0.6
        ctx.beginPath()
        ctx.moveTo(ex + Math.cos(a) * (r + 6), ey + Math.sin(a) * (r + 6))
        ctx.lineTo(ex + Math.cos(a) * (r + 22), ey + Math.sin(a) * (r + 22))
        ctx.stroke()
      }
    }

    ctx.fillStyle = '#7a8494'
    ctx.font = '700 10px "IBM Plex Mono", monospace'
    ctx.textAlign = 'center'
    ctx.fillText(this.screen === 'win' ? 'EARTH LIVES' : 'EARTH', ex, ey + r + 16)

    ctx.fillStyle = '#2a1c14'
    for (let i = 0; i < 6; i++) {
      const bx = ((i * 190 + this.t * 8) % (w + 80)) - 40
      ctx.fillRect(bx, g - 90 - (i % 3) * 18, 48, 90 + (i % 3) * 18)
    }
  }

  private drawField(g: number) {
    for (const a of this.allies) this.allyFig(a.x, g, a)
    this.humanFig(this.human.x, g)
    this.aiFig(this.ai.x, g)
    this.drawShots()
  }

  private drawShots() {
    const ctx = this.ctx
    for (const s of this.shots) {
      switch (s.kind) {
        case 'pistol':
          ctx.fillStyle = '#ffe8d2'
          ctx.fillRect(s.x, s.y, s.w, 3)
          break
        case 'rifle':
          ctx.fillStyle = '#ffb08a'
          ctx.fillRect(s.x, s.y, s.w, 4)
          break
        case 'rocket':
          ctx.fillStyle = '#ffe08a'
          ctx.fillRect(s.x, s.y - 3, s.w, 8)
          ctx.fillStyle = '#ff6a4a'
          ctx.fillRect(s.x - 8, s.y - 1, 8, 4)
          break
        case 'plasma':
          ctx.fillStyle = '#6ae0ff'
          ctx.fillRect(s.x, s.y, s.w, 5)
          break
        case 'laser':
          ctx.fillStyle = '#fff'
          ctx.fillRect(s.x, s.y, s.w, 3)
          break
        case 'cannon':
          ctx.fillStyle = '#9be8ff'
          ctx.fillRect(s.x, s.y - 4, s.w, 10)
          break
        default: {
          const _never: never = s.kind
          return _never
        }
      }
    }
  }

  private bars(w: number) {
    const ctx = this.ctx
    ctx.font = '700 12px "IBM Plex Mono", monospace'
    ctx.fillStyle = '#ff6a4a'
    ctx.textAlign = 'left'
    ctx.fillText('HUMANS', 24, 28)
    ctx.fillStyle = '#6ae0ff'
    ctx.textAlign = 'right'
    ctx.fillText('AI', w - 24, 28)
    ctx.textAlign = 'center'
    ctx.fillStyle = '#ffc4a0'
    ctx.fillText(`BATTLE ${this.wave}   SAVE THE EARTH   ${this.coins} $HUMAN`, w / 2, 28)

    this.hp(24, 40, 220, this.human.hp / this.human.max, '#ff6a4a')
    this.hp(w - 244, 40, 220, this.ai.hp / this.ai.max, '#6ae0ff')

    ctx.fillStyle = '#1a1f28'
    ctx.fillRect(w / 2 - 90, 44, 180, 8)
    ctx.fillStyle = this.meter >= 1 ? '#ffe08a' : '#ff6a4a'
    ctx.fillRect(w / 2 - 90, 44, 180 * this.meter, 8)
    ctx.fillStyle = this.meter >= 1 ? '#ffe08a' : '#7a8494'
    ctx.font = '700 10px "IBM Plex Mono", monospace'
    ctx.fillText(this.meter >= 1 ? 'ROCKET READY' : 'ROCKET', w / 2, 66)
  }

  private hp(x: number, y: number, width: number, t: number, color: string) {
    const ctx = this.ctx
    ctx.fillStyle = '#1a1f28'
    ctx.fillRect(x, y, width, 12)
    ctx.fillStyle = color
    ctx.fillRect(x, y, Math.max(0, width * t), 12)
  }

  private hint(w: number, h: number) {
    const ctx = this.ctx
    ctx.fillStyle = '#7a8494'
    ctx.font = '12px "IBM Plex Mono", monospace'
    ctx.textAlign = 'center'
    ctx.fillText('J PISTOL   K RIFLE   S COVER   L ROCKET', w / 2, h - 18)
  }

  private banner(w: number, h: number, title: string, sub: string, foot: string) {
    const ctx = this.ctx
    ctx.fillStyle = 'rgba(7,8,12,0.58)'
    ctx.fillRect(0, h * 0.26, w, h * 0.34)
    ctx.fillStyle = '#eef2f6'
    ctx.font = '700 56px "Bebas Neue", "Arial Black", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(title, w / 2, h * 0.4)
    ctx.fillStyle = '#ff6a4a'
    ctx.font = '700 20px "IBM Plex Mono", monospace'
    ctx.fillText(sub, w / 2, h * 0.48)
    ctx.fillStyle = '#ffc4a0'
    ctx.font = '14px "IBM Plex Mono", monospace'
    ctx.fillText(foot, w / 2, h * 0.55)
  }

  private allyFig(x: number, g: number, a: Ally) {
    const ctx = this.ctx
    ctx.save()
    ctx.translate(x, g)
    ctx.globalAlpha = 0.55
    ctx.fillStyle = '#c9b0a0'
    ctx.beginPath()
    ctx.ellipse(0, -72, 10, 12, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#6a4030'
    ctx.fillRect(-8, -60, 16, 28)
    ctx.fillStyle = '#2a2a28'
    ctx.fillRect(6, -58, 22, 5)
    if (a.fire > 0.55) {
      ctx.fillStyle = '#ffc4a0'
      ctx.fillRect(28, -59, 8, 3)
    }
    ctx.fillRect(-6, -32, 6, 32)
    ctx.fillRect(2, -32, 6, 32)
    ctx.restore()
  }

  private humanFig(x: number, g: number) {
    const ctx = this.ctx
    const duck = this.covering() && this.screen === 'fight'
    const hurt = this.human.hurt > 0
    ctx.save()
    ctx.translate(x, g + (duck ? 18 : 0))
    ctx.scale(1.3, 1.3)
    if (hurt) ctx.rotate(-0.06)
    ctx.fillStyle = '#3a2a22'
    ctx.fillRect(-14, -102, 22, 10)
    ctx.fillStyle = hurt ? '#fff' : '#f4d6c8'
    ctx.beginPath()
    ctx.ellipse(0, -90, 13, 14, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#6b3a28'
    ctx.fillRect(-12, -76, 24, 36)
    ctx.fillStyle = '#2a2a28'
    ctx.fillRect(8, -72, 36, 6)
    ctx.fillRect(40, -74, 10, 4)
    if (this.human.fire > 0) {
      ctx.fillStyle = '#ffe08a'
      ctx.beginPath()
      ctx.arc(52, -72, 8, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = '#f4d6c8'
    ctx.fillRect(-16, -70, 10, 7)
    ctx.fillStyle = '#3a2a22'
    ctx.fillRect(-10, -40, 8, 40)
    ctx.fillRect(2, -40, 8, 40)
    ctx.restore()
  }

  private aiFig(x: number, g: number) {
    const ctx = this.ctx
    const tele = this.ai.flash > 0
    const hurt = this.ai.hurt > 0
    ctx.save()
    ctx.translate(x, g)
    ctx.scale(1.35, 1.35)
    ctx.strokeStyle = tele ? '#fff' : '#6ae0ff'
    ctx.lineWidth = 2
    ctx.fillStyle = hurt ? '#2a3140' : tele ? '#14303a' : '#0c141c'
    ctx.fillRect(-40, -108, 72, 78)
    ctx.strokeRect(-40, -108, 72, 78)
    ctx.fillRect(-48, -70, 28, 10)
    ctx.strokeRect(-48, -70, 28, 10)
    ctx.beginPath()
    ctx.moveTo(-22, -108)
    ctx.lineTo(-22, -30)
    ctx.moveTo(4, -108)
    ctx.lineTo(4, -30)
    ctx.stroke()
    ctx.fillStyle = tele ? '#fff' : '#6ae0ff'
    ctx.fillRect(-18, -92, 16, 8)
    if (this.ai.fire > 0) {
      ctx.fillStyle = '#9be8ff'
      ctx.fillRect(-62, -72, 16, 6)
    }
    ctx.fillRect(-16, -30, 12, 30)
    ctx.fillRect(8, -30, 12, 30)
    ctx.restore()
  }
}
