export const COPY = {
  name: 'LAUNCHER',
  headline: 'Build your own launchpad fast',
  line: 'Robinhood and Arc',
  templates: 'Start with a template',
  studio: 'Studio',
  directory: 'Pads',
  docs: 'Docs',
  connect: 'Connect',
  write: 'Enhance',
  launch: 'Create',
} as const

export const HEADLINES = [
  'Build your own launchpad fast',
  'Launch a launchpad',
  'Build a custom launchpad on Arc',
  'Launch on Robinhood',
  'Copy a pad. Make it yours.',
] as const

export const COMPOSER_HINTS = [
  'Create your launchpad',
  'Launch a launchpad',
  'Describe your launchpad',
  'Name your launchpad',
  'What is this pad?',
] as const

export type CurveId = 0 | 1 | 2

/** Arc bonding pad only. Phantom multiples from ArcBondingPad.sol. */
export const CURVES: { id: CurveId; name: string; line: string }[] = [
  { id: 0, name: '0', line: '1.2× phantom' },
  { id: 1, name: '1', line: '1.0× phantom' },
  { id: 2, name: '2', line: '0.8× phantom' },
]

export function curveById(id: number): (typeof CURVES)[number] {
  return CURVES.find((c) => c.id === id) ?? CURVES[1]
}
