import type { Costume } from './hunt.ts'

export type Biome = 'farm' | 'desert' | 'night'

export function biomeOf(level: number): Biome {
  const slot = ((level - 1) % 4) as 0 | 1 | 2 | 3
  switch (slot) {
    case 0:
      return 'farm'
    case 1:
      return 'night'
    case 2:
      return 'farm'
    case 3:
      return 'desert'
    default: {
      const _never: never = slot
      return _never
    }
  }
}

function snap(ctx: CanvasRenderingContext2D) {
  ctx.imageSmoothingEnabled = false
}

function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color
  ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)))
}

function blit(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  map: string[],
  pal: Record<string, string>,
  scale = 3,
) {
  for (let r = 0; r < map.length; r++) {
    for (let c = 0; c < map[r].length; c++) {
      const ch = map[r][c]
      const color = pal[ch]
      if (!color) continue
      px(ctx, x + c * scale, y + r * scale, scale, scale, color)
    }
  }
}

export function world(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, biome: Biome, scroll: number) {
  snap(ctx)
  switch (biome) {
    case 'farm':
      farmWorld(ctx, w, h, t, scroll)
      break
    case 'desert':
      desertWorld(ctx, w, h, t, scroll)
      break
    case 'night':
      nightWorld(ctx, w, h, t, scroll)
      break
    default: {
      const _never: never = biome
      return _never
    }
  }
}

function farmWorld(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, scroll: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, '#9ec4ee')
  sky.addColorStop(0.42, '#c9dcf0')
  sky.addColorStop(0.7, '#f3d7b0')
  sky.addColorStop(1, '#f0c27a')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)

  ctx.fillStyle = '#fff8dc'
  ctx.beginPath()
  ctx.arc(w * 0.5, h * 0.4, 58, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.beginPath()
  ctx.arc(w * 0.5, h * 0.4, 88, 0, Math.PI * 2)
  ctx.fill()

  clouds(ctx, w, h, scroll)
  hill(ctx, w, h * 0.54, 18, '#d7c07a', scroll * 0.12)
  hill(ctx, w, h * 0.6, 14, '#c4b05e', scroll * 0.18)
  hill(ctx, w, h * 0.66, 16, '#86c25a', scroll * 0.28)
  farmRow(ctx, w, h * 0.56, scroll * 0.28)
  hill(ctx, w, h * 0.76, 12, '#4f9a30', scroll * 0.42)

  const gy = h - 56
  px(ctx, 0, gy, w, 56, '#2f7a1c')
  px(ctx, 0, gy, w, 10, '#4aa028')
  const grass = -Math.round((scroll * 0.95) % 16)
  for (let x = grass; x < w; x += 16) {
    px(ctx, x + 2, gy - 4, 2, 6, '#2a6a18')
    px(ctx, x + 8, gy - 6, 2, 8, '#34801e')
    const kind = Math.abs(Math.floor((x + scroll) / 16)) % 6
    if (kind === 0) px(ctx, x + 4, gy + 6, 3, 3, '#f2d24a')
    if (kind === 1) px(ctx, x + 10, gy + 8, 3, 3, '#ff8ec8')
    if (kind === 2) px(ctx, x + 6, gy + 10, 3, 3, '#fff')
  }

  for (let i = 0; i < 10; i++) {
    const fx = ((t * 40 + i * 90) % (w + 40)) - 20
    const fy = gy + 8 + ((i * 13) % 18)
    px(ctx, fx, fy, 2, 2, '#111')
  }
}

function desertWorld(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, scroll: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, '#2a1548')
  sky.addColorStop(0.35, '#c4453a')
  sky.addColorStop(0.7, '#f0a040')
  sky.addColorStop(1, '#efc36a')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)

  ctx.fillStyle = '#ffe08a'
  ctx.beginPath()
  ctx.arc(w * 0.5, h * 0.38, 64, 0, Math.PI * 2)
  ctx.fill()
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = 'rgba(255,255,255,0.1)'
    ctx.fillRect(((i * 110 - scroll * 0.05) % w + w) % w, 36 + (i % 3) * 16, 48, 2)
  }

  hill(ctx, w, h * 0.54, 22, '#c9a36a', scroll * 0.14)
  pixelSphinx(ctx, wrap(scroll * 0.2, w + 420) - 80, h * 0.48)
  pixelPalms(ctx, wrap(scroll * 0.26 + 180, w + 380) - 40, h * 0.46)
  hill(ctx, w, h * 0.66, 16, '#d8b05a', scroll * 0.26)
  hill(ctx, w, h * 0.76, 12, '#c4923a', scroll * 0.4)
  px(ctx, 0, h - 50, w, 50, '#b8863a')
  px(ctx, 0, h - 50, w, 8, '#e0b45a')
}

function nightWorld(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, scroll: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, '#0b1024')
  sky.addColorStop(0.55, '#1a2a58')
  sky.addColorStop(1, '#3a2a68')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#f4f0c8'
  ctx.beginPath()
  ctx.arc(w * 0.78, h * 0.2, 28, 0, Math.PI * 2)
  ctx.fill()
  for (let i = 0; i < 40; i++) {
    const sx = ((i * 73 - scroll * 0.04) % w + w) % w
    const sy = 12 + ((i * 37) % Math.floor(h * 0.4))
    px(ctx, sx, sy, 2, 2, i % 5 === 0 ? '#fff' : '#c8d4ff')
  }
  ctx.fillStyle = '#12182e'
  for (let i = 0; i < 8; i++) {
    const bx = wrap(scroll * 0.16 + i * 140, w + 160) - 20
    const bh = 70 + (i % 4) * 28
    px(ctx, bx, h * 0.52 - bh + 80, 36 + (i % 3) * 10, bh, '#141a32')
    for (let wy = 0; wy < 5; wy++) {
      px(ctx, bx + 6, h * 0.52 - bh + 92 + wy * 14, 6, 6, wy % 2 === i % 2 ? '#ffd36a' : '#2a3050')
    }
  }
  hill(ctx, w, h * 0.7, 14, '#1c2438', scroll * 0.3)
  px(ctx, 0, h - 52, w, 52, '#0e1424')
}

function clouds(ctx: CanvasRenderingContext2D, w: number, h: number, scroll: number) {
  ctx.fillStyle = 'rgba(255,255,255,0.78)'
  for (let i = 0; i < 4; i++) {
    const x = wrap(scroll * 0.08 + i * 260, w + 220) - 40
    const y = 40 + i * 28
    ctx.beginPath()
    ctx.arc(x, y, 18, 0, Math.PI * 2)
    ctx.arc(x + 22, y - 6, 16, 0, Math.PI * 2)
    ctx.arc(x + 40, y + 2, 18, 0, Math.PI * 2)
    ctx.fill()
  }
}

function hill(ctx: CanvasRenderingContext2D, w: number, base: number, amp: number, color: string, shift: number) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(0, ctx.canvas.height)
  for (let x = 0; x <= w; x += 6) {
    ctx.lineTo(x, base + Math.sin((x + shift) / 120) * amp + Math.sin((x + shift) / 40) * (amp * 0.25))
  }
  ctx.lineTo(w, ctx.canvas.height)
  ctx.closePath()
  ctx.fill()
}


function wrap(scroll: number, period: number) {
  return ((-scroll) % period + period) % period
}

function farmRow(ctx: CanvasRenderingContext2D, w: number, y: number, scroll: number) {
  const gap = 240
  const period = w + gap
  for (let i = 0; i < 6; i++) {
    const x = wrap(scroll - i * gap, period) - 50
    const kind = (i % 5) as 0 | 1 | 2 | 3 | 4
    switch (kind) {
      case 0:
        blit(ctx, x, y, HOUSE, BUILD, 5)
        break
      case 1:
        blit(ctx, x, y - 10, BARN, BUILD, 5)
        break
      case 2:
        blit(ctx, x, y + 22, SHEEP, CRITTER, 4)
        blit(ctx, x + 36, y + 26, SHEEP, CRITTER, 4)
        blit(ctx, x + 68, y + 8, PINE, BUILD, 5)
        break
      case 3:
        blit(ctx, x, y - 14, MILL, BUILD, 5)
        break
      case 4:
        blit(ctx, x + 8, y + 6, HOUSE, BUILD, 5)
        blit(ctx, x + 70, y + 4, PINE, BUILD, 5)
        break
      default: {
        const _never: never = kind
        return _never
      }
    }
  }
}

const HOUSE = [
  '....RRRR....',
  '...RRRRRR...',
  '..RRRRRRRR..',
  '.WWWWWWWWWW.',
  '.W..B...D.W.',
  '.W..B...D.W.',
  '.WWWWWWWWWW.',
]

const BARN = [
  '..RRRRRRRRRR..',
  '.RRRRRRRRRRRR.',
  'DDDDDDDDDDDDDD',
  'R....KK....RR',
  'R....KK....RR',
  'R....KK....RR',
  'RRRRRRRRRRRRRR',
]

const MILL = [
  '....W....',
  '..W.T.W..',
  '....T....',
  '..W.T.W..',
  '....T....',
  '....T....',
  '....T....',
]

const PINE = [
  '...G...',
  '..GGG..',
  '.GGGGG.',
  '..GGG..',
  '.GGGGG.',
  'GGGGGGG',
  '...T...',
]

const SHEEP = [
  '.www.',
  'wwKww',
  '.www.',
]

const BUILD: Record<string, string> = {
  R: '#c0392b',
  W: '#f4efe4',
  B: '#6aa8d8',
  D: '#4a3220',
  K: '#2c1c10',
  T: '#6a4a22',
  G: '#1f7a32',
}

const CRITTER: Record<string, string> = {
  w: '#ffffff',
  K: '#222222',
}

function pixelSphinx(ctx: CanvasRenderingContext2D, x: number, y: number) {
  blit(ctx, x, y, [
    '................HHHH',
    '................H..H',
    'HHHHHHHHHHHHHHHHHHHH',
    'HHHHHHHHHHHHHHHHHHHH',
    'HH..............HHHH',
  ], { H: '#c9a36a', '.': '' }, 4)
}

function pixelPalms(ctx: CanvasRenderingContext2D, x: number, y: number) {
  blit(ctx, x, y, [
    '..G.G.G..',
    '.GGGGGGG.',
    '....T....',
    '....T....',
    '....T....',
    '....T....',
  ], { G: '#2f8f3a', T: '#6a4a20' }, 4)
}

export function penisBird(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rot: number,
  flap: number,
  costume: Costume,
  stretch: number,
) {
  snap(ctx)
  ctx.save()
  ctx.translate(Math.round(x), Math.round(y))
  ctx.rotate(rot)
  ctx.scale(stretch, 1)

  for (let i = 6; i >= 1; i--) {
    px(ctx, -78 - i * 12, -2, 14 + i * 2, 8, `rgba(255,255,255,${0.08 * i})`)
  }

  pixelWing(ctx, -18, -42 - Math.round(flap * 5), costume)

  const body = bodyColors(costume)
  px(ctx, -70, -8, 110, 22, body.mid)
  px(ctx, -66, -14, 96, 10, body.hi)
  px(ctx, -66, 10, 96, 8, body.lo)
  px(ctx, 36, -16, 40, 32, body.glans)
  px(ctx, 44, -20, 28, 10, 'rgba(255,255,255,0.28)')
  px(ctx, 64, -2, 10, 5, body.slit)

  ctx.restore()
}

function bodyColors(costume: Costume) {
  switch (costume) {
    case 'classic':
      return { hi: '#f3c7a8', mid: '#e0a07a', lo: '#c47a58', glans: '#d48978', slit: '#8a4038' }
    case 'gold':
      return { hi: '#ffe08a', mid: '#f0c24a', lo: '#c99220', glans: '#ffd36a', slit: '#8a5a10' }
    case 'night':
      return { hi: '#c8b8ff', mid: '#8a74e0', lo: '#4a3898', glans: '#b49cff', slit: '#2a1860' }
    case 'rewards':
      return { hi: '#b8f0c4', mid: '#4ecf7a', lo: '#1a8a3a', glans: '#7ae08a', slit: '#0d4a20' }
    default: {
      const _never: never = costume
      return _never
    }
  }
}

function pixelWing(ctx: CanvasRenderingContext2D, x: number, y: number, costume: Costume) {
  const map = [
    '      #######     ',
    '    ###########   ',
    '  ############### ',
    ' #################',
    '##################',
    ' ################ ',
    '  ##############  ',
    '    ##########    ',
    '      ######      ',
  ]
  const pal = wingPalette(costume)
  blit(ctx, x, y, map, { '#': pal.lo }, 5)
  blit(ctx, x + 20, y + 5, ['####', '####'], { '#': pal.hi }, 5)
}

function wingPalette(costume: Costume) {
  switch (costume) {
    case 'classic':
      return { hi: '#e09cff', lo: '#6a2aad' }
    case 'gold':
      return { hi: '#ffe27a', lo: '#c9a020' }
    case 'night':
      return { hi: '#8ec8ff', lo: '#204080' }
    case 'rewards':
      return { hi: '#ffffff', lo: '#8aa0b8' }
    default: {
      const _never: never = costume
      return _never
    }
  }
}

export function worm(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  snap(ctx)
  blit(ctx, x - 12, y - 6 + Math.sin(t * 6) * 2, [
    '.nnnn.',
    'nnnKnn',
  ], { n: '#8a5a28', K: '#3a2010' }, 3)
}

export function caterpillar(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  snap(ctx)
  blit(ctx, x - 16, y - 8 + Math.sin(t * 5) * 3, [
    '.gggggg.',
    'gggWKggg',
    '.gggggg.',
  ], { g: '#3dcf4a', W: '#fff', K: '#111' }, 3)
}

export function hawk(ctx: CanvasRenderingContext2D, x: number, y: number, flap: number) {
  snap(ctx)
  const lift = Math.round(flap * 3)
  blit(ctx, x - 22, y - 10 - lift, [
    '..BB..BB..',
    '.BBBBBBBB.',
    'BBBYYBBBBB',
    '..BBKKBB..',
  ], { B: '#5a3a22', Y: '#f0b020', K: '#111' }, 3)
}

export function cat(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  snap(ctx)
  blit(ctx, x - 20, y - 18, [
    '.O...O....',
    'OOOOOOOOO.',
    'O.W.W.OOOO',
    'OOOOOOOOO.',
    '.OOOOOOO..',
  ], { O: '#e67a28', W: '#fff' }, 3)
  px(ctx, x - 28, y + 2 + Math.sin(t * 8) * 3, 10, 3, '#c45a10')
}

export function snake(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  snap(ctx)
  blit(ctx, x - 16, y - 12 + Math.sin(t * 6), [
    '...SSSS',
    '.SSSS..',
    'SSRSSSS',
    '.SSSS..',
  ], { S: '#8a5a22', R: '#d02020' }, 3)
}

export function msTile(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  const bob = Math.sin(t * 7 + x * 0.03) * 4
  const s = 9
  ctx.save()
  ctx.translate(Math.round(x), Math.round(y + bob))
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.beginPath()
  ctx.arc(s, s, 18, 0, Math.PI * 2)
  ctx.fill()
  px(ctx, 0, 0, s, s, '#f25022')
  px(ctx, s + 2, 0, s, s, '#7fba00')
  px(ctx, 0, s + 2, s, s, '#00a4ef')
  px(ctx, s + 2, s + 2, s, s, '#ffb900')
  ctx.restore()
}

export function pops(ctx: CanvasRenderingContext2D, items: { x: number; y: number; text: string; life: number }[]) {
  ctx.save()
  ctx.textAlign = 'center'
  ctx.font = '800 16px "Segoe UI", sans-serif'
  for (const p of items) {
    ctx.globalAlpha = Math.max(0, p.life)
    ctx.fillStyle = '#107c10'
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 3
    ctx.strokeText(p.text, p.x, p.y)
    ctx.fillText(p.text, p.x, p.y)
  }
  ctx.restore()
}

export function plane(ctx: CanvasRenderingContext2D, x: number, y: number) {
  snap(ctx)
  blit(ctx, x - 14, y - 6, [
    'P........',
    'PPPPPPPP.',
    'P..PP....',
  ], { P: '#f4f4f4' }, 3)
}

export function hud(
  ctx: CanvasRenderingContext2D,
  w: number,
  info: {
    level: number
    score: number
    high: number
    worms: number
    ms: number
    lives: number
    crop: number
    nest: number
    bank: number
  },
) {
  ctx.save()
  ctx.imageSmoothingEnabled = false
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillStyle = '#fff'
  ctx.strokeStyle = 'rgba(20,20,20,0.55)'
  ctx.lineWidth = 3
  ctx.font = '700 14px "Press Start 2P", "Courier New", monospace'
  const lines = [
    `LEVEL ${info.level}`,
    `SCORE ${info.score}`,
    `HIGH  ${info.high}`,
    `WORMS ${info.worms}`,
    `MS    ${info.ms}`,
  ]
  lines.forEach((line, i) => {
    ctx.strokeText(line, 12, 10 + i * 18)
    ctx.fillText(line, 12, 10 + i * 18)
  })
  ctx.font = '700 13px "Segoe UI", sans-serif'
  ctx.fillText('LIVES', 12, 104)
  for (let i = 0; i < 4; i++) heart(ctx, 64 + i * 20, 108, i < info.lives)
  ctx.fillText('CROP', 12, 130)
  bar(ctx, 12, 146, 160, 10, info.crop, '#7ec8ff')
  ctx.textAlign = 'right'
  ctx.fillText('NEST', w - 12, 12)
  bar(ctx, w - 174, 28, 160, 12, info.nest, '#5ad46a')
  ctx.fillText(`${Math.floor(info.nest * 100)}%`, w - 12, 44)
  ctx.fillStyle = '#0078d4'
  ctx.fillText(`${info.bank} pts`, w - 12, 66)
  ctx.restore()
}

function heart(ctx: CanvasRenderingContext2D, x: number, y: number, on: boolean) {
  px(ctx, x, y, 6, 6, on ? '#e03131' : '#3d3d3d')
  px(ctx, x + 6, y, 6, 6, on ? '#e03131' : '#3d3d3d')
  px(ctx, x + 2, y + 4, 8, 8, on ? '#c41e1e' : '#2a2a2a')
}

function bar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, t: number, fill: string) {
  px(ctx, x, y, w, h, '#111')
  px(ctx, x + 2, y + 2, Math.max(0, (w - 4) * Math.min(1, t)), h - 4, fill)
  ctx.strokeStyle = '#fff'
  ctx.strokeRect(x, y, w, h)
}

export function scanlines(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.save()
  ctx.fillStyle = 'rgba(0,0,0,0.06)'
  for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1)
  ctx.fillStyle = 'rgba(255,255,255,0.03)'
  ctx.fillRect(0, 0, w, h * 0.35)
  ctx.restore()
}
