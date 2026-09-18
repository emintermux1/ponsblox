export type KitId = 'pons' | 'pumpfun' | 'bags' | 'app' | 'flap' | 'four' | 'long' | 'custom'

export type KitGroup = 'all' | 'meme' | 'pads' | 'custom'

export type Kit = {
  id: KitId
  name: string
  line: string
  group: Exclude<KitGroup, 'all'>
  accent: string
  ink: string
  paper: string
  muted: string
  stroke: string
  radius: string
  font: string
}

export const KITS: Kit[] = [
  {
    id: 'pons',
    name: 'PONS',
    line: 'ponsfamily.com',
    group: 'pads',
    accent: '#22c55e',
    ink: '#f2f2f2',
    paper: '#0d0d0d',
    muted: '#8a8a8a',
    stroke: '#222',
    radius: '999px',
    font: 'Inter, system-ui, sans-serif',
  },
  {
    id: 'pumpfun',
    name: 'PUMPFUN',
    line: 'pump.fun',
    group: 'meme',
    accent: '#86efac',
    ink: '#fafafa',
    paper: '#14151c',
    muted: '#9ca3af',
    stroke: '#2a2d38',
    radius: '12px',
    font: 'Outfit, Inter, sans-serif',
  },
  {
    id: 'bags',
    name: 'BAGS',
    line: 'bags.fm',
    group: 'pads',
    accent: '#02ff40',
    ink: '#ffffff',
    paper: '#000000',
    muted: '#9a9a9a',
    stroke: '#1a1a1a',
    radius: '999px',
    font: 'DM Sans, Inter, sans-serif',
  },
  {
    id: 'app',
    name: 'APP',
    line: 'believe.app',
    group: 'pads',
    accent: '#21d55a',
    ink: '#111111',
    paper: '#f5f5f5',
    muted: '#999999',
    stroke: '#ebebeb',
    radius: '16px',
    font: 'DM Sans, Inter, sans-serif',
  },
  {
    id: 'flap',
    name: 'FLAP',
    line: 'flap.sh',
    group: 'meme',
    accent: '#e8ff00',
    ink: '#f5f5f5',
    paper: '#0a0a0a',
    muted: '#8a8a8a',
    stroke: '#222',
    radius: '8px',
    font: 'Inter, system-ui, sans-serif',
  },
  {
    id: 'four',
    name: 'FOUR',
    line: 'four.meme',
    group: 'meme',
    accent: '#ff7a1a',
    ink: '#fff7ed',
    paper: '#140c08',
    muted: '#c4a78a',
    stroke: '#3a2414',
    radius: '12px',
    font: 'Outfit, Inter, sans-serif',
  },
  {
    id: 'long',
    name: 'LONG',
    line: 'long.xyz',
    group: 'pads',
    accent: '#e8c56b',
    ink: '#f5f1e8',
    paper: '#0b0f14',
    muted: '#8b8474',
    stroke: '#243040',
    radius: '8px',
    font: 'Inter, system-ui, sans-serif',
  },
  {
    id: 'custom',
    name: 'CUSTOM',
    line: 'yours',
    group: 'custom',
    accent: '#111111',
    ink: '#111111',
    paper: '#ffffff',
    muted: '#6b6b6b',
    stroke: '#e7e7e7',
    radius: '16px',
    font: 'Inter, system-ui, sans-serif',
  },
]

export const KIT_FILTERS: { id: KitGroup; name: string }[] = [
  { id: 'all', name: 'All' },
  { id: 'meme', name: 'Meme' },
  { id: 'pads', name: 'Pads' },
  { id: 'custom', name: 'Custom' },
]

export function kitById(id: string): Kit {
  return KITS.find((k) => k.id === id) ?? KITS[0]
}

export function kitsIn(group: KitGroup): Kit[] {
  if (group === 'all') return KITS
  return KITS.filter((k) => k.group === group)
}

export function kitIdOrDefault(id: string): KitId {
  switch (id) {
    case 'pons':
    case 'pumpfun':
    case 'bags':
    case 'app':
    case 'flap':
    case 'four':
    case 'long':
    case 'custom':
      return id
    case 'xyz':
      return 'pons'
    case 'meme':
      return 'four'
    case 'sh':
      return 'flap'
    case 'gantry':
      return 'pons'
    case 'silo':
      return 'pumpfun'
    case 'night':
      return 'bags'
    case 'bay':
      return 'long'
    default:
      return 'pons'
  }
}
