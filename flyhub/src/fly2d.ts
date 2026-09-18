/** Side-view Musca domestica. Fat thorax, huge red eyes, short abdomen, 6 legs, hanging proboscis. */

export type FlyPose = 'female' | 'male' | 'hover'

export function drawHouseFly(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  heading: number,
  t: number,
  pose: FlyPose,
) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(heading)
  const s = scale
  const buzz = pose === 'hover' ? Math.sin(t * 54) : Math.sin(t * 38)
  const rock = pose === 'male' ? Math.sin(t * 14) * 0.16 : Math.sin(t * 6) * 0.025
  const thrust = pose === 'male' ? Math.sin(t * 14) * s * 0.06 : 0
  ctx.translate(thrust, 0)
  ctx.rotate(rock)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  // Wings — over the back, buzzing.
  ctx.save()
  ctx.translate(-s * 0.02, -s * 0.1)
  ctx.rotate(-0.35 + buzz * (pose === 'male' || pose === 'hover' ? 0.28 : 0.1))
  ctx.globalAlpha = 0.42 + Math.abs(buzz) * 0.18
  ctx.fillStyle = '#f0d090'
  ctx.strokeStyle = 'rgba(255, 176, 64, 0.9)'
  ctx.lineWidth = Math.max(1, s * 0.028)
  ctx.beginPath()
  ctx.ellipse(-s * 0.08, -s * 0.22, s * 0.58, s * 0.2, -0.7, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(s * 0.08, 0)
  ctx.lineTo(-s * 0.42, -s * 0.32)
  ctx.moveTo(s * 0.04, s * 0.02)
  ctx.lineTo(-s * 0.28, -s * 0.18)
  ctx.stroke()
  ctx.restore()

  ctx.save()
  ctx.globalAlpha = 0.28
  ctx.fillStyle = '#e8c070'
  ctx.beginPath()
  ctx.ellipse(-s * 0.06, -s * 0.16, s * 0.42, s * 0.12, -0.5 + buzz * 0.08, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // Six legs planted under the body (3 pairs).
  ctx.strokeStyle = '#141210'
  const kick = pose === 'female' ? Math.sin(t * 5) * s * 0.02 : Math.sin(t * 12) * s * 0.035
  const pairs: [number, number, number][] = [
    [s * 0.16, s * 0.28 + kick, s * 0.22],
    [s * 0.02, s * 0.34, s * 0.08],
    [-s * 0.16, s * 0.3 - kick, -s * 0.12],
  ]
  for (const [hip, toeX, midX] of pairs) {
    ctx.lineWidth = Math.max(1.8, s * 0.055)
    ctx.beginPath()
    ctx.moveTo(hip, s * 0.06)
    ctx.lineTo(midX, s * 0.2)
    ctx.lineTo(toeX, s * 0.38)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(hip - s * 0.03, s * 0.04)
    ctx.lineTo(midX - s * 0.1, s * 0.18)
    ctx.lineTo(toeX - s * 0.1, s * 0.34)
    ctx.stroke()
    ctx.fillStyle = '#1c1814'
    ctx.beginPath()
    ctx.ellipse(toeX, s * 0.39, s * 0.04, s * 0.018, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(toeX - s * 0.1, s * 0.35, s * 0.035, s * 0.016, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  // Short abdomen. Male curls it down onto the female.
  ctx.save()
  ctx.translate(-s * 0.16, s * 0.04)
  ctx.rotate(pose === 'male' ? 0.7 + Math.sin(t * 14) * 0.1 : 0.18)
  ctx.fillStyle = '#4e4840'
  ctx.beginPath()
  ctx.ellipse(-s * 0.28, 0, s * 0.36, s * 0.18, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#2a2622'
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(-s * (0.44 - i * 0.075), -s * 0.1, s * 0.03, s * 0.2)
  }
  if (pose === 'male') {
    ctx.fillStyle = '#1a1612'
    ctx.beginPath()
    ctx.ellipse(-s * 0.58, s * 0.08, s * 0.09, s * 0.055, 0.3, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()

  // Fat bristled thorax + four Musca stripes.
  ctx.fillStyle = '#323028'
  ctx.beginPath()
  ctx.ellipse(0, 0, s * 0.3, s * 0.22, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#161410'
  for (const oy of [-0.08, -0.025, 0.025, 0.08]) {
    ctx.fillRect(-s * 0.18, s * oy, s * 0.36, s * 0.028)
  }
  ctx.strokeStyle = 'rgba(220, 210, 196, 0.5)'
  ctx.lineWidth = Math.max(0.8, s * 0.022)
  for (let i = 0; i < 8; i++) {
    const a = -0.8 + i * 0.22
    ctx.beginPath()
    ctx.moveTo(Math.cos(a) * s * 0.14, Math.sin(a) * s * 0.1)
    ctx.lineTo(Math.cos(a) * s * 0.32, Math.sin(a) * s * 0.2)
    ctx.stroke()
  }

  // Head.
  ctx.fillStyle = '#1e1c1a'
  ctx.beginPath()
  ctx.ellipse(s * 0.28, s * 0.02, s * 0.14, s * 0.12, 0, 0, Math.PI * 2)
  ctx.fill()

  // Huge compound eye (side view — one giant red dome).
  ctx.fillStyle = '#c8321c'
  ctx.beginPath()
  ctx.ellipse(s * 0.32, -s * 0.02, s * 0.2, s * 0.2, -0.15, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#7a180e'
  ctx.beginPath()
  ctx.ellipse(s * 0.36, 0, s * 0.08, s * 0.08, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255, 210, 170, 0.4)'
  ctx.beginPath()
  ctx.ellipse(s * 0.24, -s * 0.1, s * 0.055, s * 0.04, 0, 0, Math.PI * 2)
  ctx.fill()

  // Far-side eye peeking.
  ctx.fillStyle = '#a02816'
  ctx.beginPath()
  ctx.ellipse(s * 0.3, s * 0.14, s * 0.1, s * 0.08, 0.2, 0, Math.PI * 2)
  ctx.fill()

  // Aristate antennae.
  ctx.strokeStyle = '#e8ddd0'
  ctx.lineWidth = Math.max(1.2, s * 0.04)
  ctx.beginPath()
  ctx.moveTo(s * 0.38, -s * 0.08)
  ctx.lineTo(s * 0.5, -s * 0.2)
  ctx.lineTo(s * 0.46, -s * 0.28)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(s * 0.36, s * 0.08)
  ctx.lineTo(s * 0.46, s * 0.16)
  ctx.stroke()

  // Hanging sponging proboscis + labellum.
  ctx.strokeStyle = '#c4a070'
  ctx.lineWidth = Math.max(1.8, s * 0.062)
  ctx.beginPath()
  ctx.moveTo(s * 0.36, s * 0.08)
  ctx.quadraticCurveTo(s * 0.5, s * 0.22, s * 0.46, s * 0.34)
  ctx.stroke()
  ctx.fillStyle = '#d8b888'
  ctx.beginPath()
  ctx.ellipse(s * 0.46, s * 0.38, s * 0.11, s * 0.07, 0.25, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#8a6840'
  ctx.beginPath()
  ctx.ellipse(s * 0.48, s * 0.4, s * 0.045, s * 0.025, 0, 0, Math.PI * 2)
  ctx.fill()

  // Halteres.
  ctx.fillStyle = '#ff9000'
  ctx.beginPath()
  ctx.ellipse(-s * 0.08, -s * 0.2, s * 0.04, s * 0.025, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

export function drawPair(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  heading: number,
  t: number,
) {
  const rock = Math.sin(t * 14) * scale * 0.09
  drawHouseFly(ctx, x - scale * 0.04, y + scale * 0.18, scale, heading, t, 'female')
  drawHouseFly(
    ctx,
    x + scale * 0.12 + rock,
    y - scale * 0.2,
    scale * 0.78,
    heading + 0.22 + Math.sin(t * 14) * 0.1,
    t + 0.35,
    'male',
  )
}

export function drawPile(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  scale: number,
  t: number,
  n: number,
  seed: number,
) {
  const count = Math.max(2, Math.min(5, n))
  for (let i = 0; i < count; i++) {
    const px = w * (0.24 + ((i * 37 + seed) % 54) / 100)
    const py = h * (0.32 + ((i * 23 + seed) % 42) / 100)
    const heading = -0.45 + ((i * 17 + seed) % 18) / 16 + Math.sin(t * 0.55 + i) * 0.06
    drawPair(ctx, px, py, scale * (0.7 + (i % 3) * 0.08), heading, t + i * 0.7)
  }
}
