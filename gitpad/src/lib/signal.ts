export type MomentumLevel = 'cold' | 'active' | 'hot' | 'breakout'

export type MomentumSignal = {
  level: MomentumLevel
  label: 'COLD' | 'ACTIVE' | 'HOT' | 'BREAKOUT'
  why: string[]
  stars24h: number | null
  stars7d: number | null
  forks: number
  velocityX: number | null
  disclaimer: 'Repository activity signal. Not financial advice.'
}

const DISCLAIMER = 'Repository activity signal. Not financial advice.' as const

function ageDays(iso: string): number {
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return 1
  return Math.max(1, Math.round((Date.now() - t) / 86_400_000))
}

export function weeklyGrowthPct(stars: number, stars7d: number | null): number | null {
  if (stars7d == null || !Number.isFinite(stars7d) || stars7d < 0) return null
  const prior = stars - stars7d
  if (prior <= 0) return null
  return (stars7d / prior) * 100
}

export function momentumSignal(input: {
  stars: number
  stars24h: number | null
  stars7d: number | null
  forks: number
  pushedAt: string
  createdAt: string
  trendScore: number
  commitsWeek?: number
}): MomentumSignal {
  const age = ageDays(input.createdAt)
  const quiet = ageDays(input.pushedAt)
  const daily = input.stars24h != null
    ? input.stars24h
    : input.stars7d != null
      ? input.stars7d / 7
      : (age <= 14 ? input.stars / age : 0)
  const baseline = input.stars / age
  const velocityX = daily > 0 ? daily / Math.max(baseline, 0.5) : null
  const commits = input.commitsWeek ?? 0
  const why: string[] = []

  let level: MomentumLevel = 'cold'
  if (
    (input.stars24h != null && input.stars24h >= 400)
    || (velocityX != null && velocityX >= 3 && daily >= 80 && quiet <= 3)
    || (input.stars7d != null && input.stars7d >= 800 && age <= 21)
  ) {
    level = 'breakout'
    why.push('Star velocity is far above this repository’s lifetime average.')
  } else if (input.trendScore >= 70 || daily >= 40 || (input.stars7d != null && input.stars7d >= 200)) {
    level = 'hot'
    why.push('GitHub velocity and recency put this repository in the hot band.')
  } else if (quiet <= 14 && (input.trendScore >= 35 || daily >= 5 || commits > 0)) {
    level = 'active'
    why.push('Recent pushes or measurable star flow.')
  } else {
    why.push('Low recent star flow and a quiet push window.')
  }

  if (input.stars24h != null) why.push(`+${Math.round(input.stars24h).toLocaleString('en-US')} stars / 24H`)
  else if (input.stars7d != null) why.push(`+${Math.round(input.stars7d).toLocaleString('en-US')} stars / 7D`)
  if (velocityX != null && velocityX >= 1.2) why.push(`${velocityX.toFixed(1)}× lifetime daily star rate`)
  if (input.forks > 0) why.push(`${input.forks.toLocaleString('en-US')} forks on GitHub`)
  if (quiet <= 2) why.push('Pushed within the last two days')
  why.push(DISCLAIMER)

  const label = level === 'cold' ? 'COLD' : level === 'active' ? 'ACTIVE' : level === 'hot' ? 'HOT' : 'BREAKOUT'
  return {
    level,
    label,
    why,
    stars24h: input.stars24h,
    stars7d: input.stars7d,
    forks: input.forks,
    velocityX,
    disclaimer: DISCLAIMER,
  }
}
