export type System = 'optic' | 'olfactory' | 'memory' | 'central' | 'motor'

export type Neuropil = {
  id: string
  name: string
  abbr: string
  system: System
  x: number
  y: number
  r: number
}

export type Tract = {
  from: string
  to: string
  system: System
}

/** Named HSB tissue on the map. Paper count is 22 neuropils from 20 brains (Brandt 2005). */
export const NEUROPILS: Neuropil[] = [
  { id: 'La_L', name: 'Lamina L', abbr: 'La', system: 'optic', x: 0.1, y: 0.42, r: 9 },
  { id: 'La_R', name: 'Lamina R', abbr: 'La', system: 'optic', x: 0.9, y: 0.42, r: 9 },
  { id: 'Me_L', name: 'Medulla L', abbr: 'Me', system: 'optic', x: 0.16, y: 0.4, r: 13 },
  { id: 'Me_R', name: 'Medulla R', abbr: 'Me', system: 'optic', x: 0.84, y: 0.4, r: 13 },
  { id: 'Lo_L', name: 'Lobula L', abbr: 'Lo', system: 'optic', x: 0.23, y: 0.39, r: 11 },
  { id: 'Lo_R', name: 'Lobula R', abbr: 'Lo', system: 'optic', x: 0.77, y: 0.39, r: 11 },
  { id: 'LoP_L', name: 'Lobula plate L', abbr: 'LoP', system: 'optic', x: 0.24, y: 0.5, r: 8 },
  { id: 'LoP_R', name: 'Lobula plate R', abbr: 'LoP', system: 'optic', x: 0.76, y: 0.5, r: 8 },
  { id: 'AL_L', name: 'Antennal lobe L', abbr: 'AL', system: 'olfactory', x: 0.34, y: 0.64, r: 16 },
  { id: 'AL_R', name: 'Antennal lobe R', abbr: 'AL', system: 'olfactory', x: 0.66, y: 0.64, r: 16 },
  { id: 'LH_L', name: 'Lateral horn L', abbr: 'LH', system: 'olfactory', x: 0.3, y: 0.26, r: 9 },
  { id: 'LH_R', name: 'Lateral horn R', abbr: 'LH', system: 'olfactory', x: 0.7, y: 0.26, r: 9 },
  { id: 'MB_ca_L', name: 'MB calyx L', abbr: 'Ca', system: 'memory', x: 0.38, y: 0.2, r: 17 },
  { id: 'MB_ca_R', name: 'MB calyx R', abbr: 'Ca', system: 'memory', x: 0.62, y: 0.2, r: 17 },
  { id: 'MB_pe_L', name: 'MB pedunculus L', abbr: 'Pe', system: 'memory', x: 0.4, y: 0.36, r: 8 },
  { id: 'MB_pe_R', name: 'MB pedunculus R', abbr: 'Pe', system: 'memory', x: 0.6, y: 0.36, r: 8 },
  { id: 'MB_vl_L', name: 'MB vertical lobe L', abbr: 'α', system: 'memory', x: 0.42, y: 0.48, r: 9 },
  { id: 'MB_vl_R', name: 'MB vertical lobe R', abbr: 'α', system: 'memory', x: 0.58, y: 0.48, r: 9 },
  { id: 'MB_ml_L', name: 'MB medial lobe L', abbr: 'β', system: 'memory', x: 0.44, y: 0.56, r: 8 },
  { id: 'MB_ml_R', name: 'MB medial lobe R', abbr: 'β', system: 'memory', x: 0.56, y: 0.56, r: 8 },
  { id: 'CX', name: 'Central complex', abbr: 'CX', system: 'central', x: 0.5, y: 0.34, r: 11 },
  { id: 'PB', name: 'Protocerebral bridge', abbr: 'PB', system: 'central', x: 0.5, y: 0.27, r: 8 },
  { id: 'PL', name: 'Protocerebral lobe', abbr: 'PL', system: 'central', x: 0.5, y: 0.44, r: 10 },
  { id: 'SOG', name: 'Subesophageal', abbr: 'SOG', system: 'motor', x: 0.5, y: 0.8, r: 10 },
]

export const TRACTS: Tract[] = [
  { from: 'La_L', to: 'Me_L', system: 'optic' },
  { from: 'La_R', to: 'Me_R', system: 'optic' },
  { from: 'Me_L', to: 'Lo_L', system: 'optic' },
  { from: 'Me_R', to: 'Lo_R', system: 'optic' },
  { from: 'Lo_L', to: 'LoP_L', system: 'optic' },
  { from: 'Lo_R', to: 'LoP_R', system: 'optic' },
  { from: 'Lo_L', to: 'MB_ca_L', system: 'optic' },
  { from: 'Lo_R', to: 'MB_ca_R', system: 'optic' },
  { from: 'LoP_L', to: 'MB_ca_L', system: 'optic' },
  { from: 'LoP_R', to: 'MB_ca_R', system: 'optic' },
  { from: 'AL_L', to: 'MB_ca_L', system: 'olfactory' },
  { from: 'AL_R', to: 'MB_ca_R', system: 'olfactory' },
  { from: 'AL_L', to: 'LH_L', system: 'olfactory' },
  { from: 'AL_R', to: 'LH_R', system: 'olfactory' },
  { from: 'MB_ca_L', to: 'MB_pe_L', system: 'memory' },
  { from: 'MB_ca_R', to: 'MB_pe_R', system: 'memory' },
  { from: 'MB_pe_L', to: 'MB_vl_L', system: 'memory' },
  { from: 'MB_pe_R', to: 'MB_vl_R', system: 'memory' },
  { from: 'MB_pe_L', to: 'MB_ml_L', system: 'memory' },
  { from: 'MB_pe_R', to: 'MB_ml_R', system: 'memory' },
  { from: 'MB_vl_L', to: 'CX', system: 'central' },
  { from: 'MB_vl_R', to: 'CX', system: 'central' },
  { from: 'CX', to: 'PB', system: 'central' },
  { from: 'CX', to: 'PL', system: 'central' },
  { from: 'PL', to: 'SOG', system: 'motor' },
  { from: 'LH_L', to: 'PL', system: 'olfactory' },
  { from: 'LH_R', to: 'PL', system: 'olfactory' },
]

export const MB_IDS = [
  'MB_ca_L',
  'MB_ca_R',
  'MB_pe_L',
  'MB_pe_R',
  'MB_vl_L',
  'MB_vl_R',
  'MB_ml_L',
  'MB_ml_R',
] as const
export const AL_IDS = ['AL_L', 'AL_R'] as const
export const LIP_IDS = ['AL_L', 'AL_R', 'MB_ca_L', 'MB_ca_R'] as const
export const COLLAR_IDS = ['Lo_L', 'Lo_R', 'LoP_L', 'LoP_R', 'MB_ca_L', 'MB_ca_R'] as const

export const SYSTEMS: System[] = ['optic', 'olfactory', 'memory', 'central', 'motor']

export function systemLabel(system: System) {
  switch (system) {
    case 'optic':
      return 'optic lobe'
    case 'olfactory':
      return 'antennal lobe / horn'
    case 'memory':
      return 'mushroom body'
    case 'central':
      return 'central complex'
    case 'motor':
      return 'subesophageal'
    default: {
      const _never: never = system
      return _never
    }
  }
}

export function systemTone(system: System) {
  switch (system) {
    case 'optic':
      return 'rgba(244,240,232,'
    case 'olfactory':
      return 'rgba(240,180,74,'
    case 'memory':
      return 'rgba(227,106,44,'
    case 'central':
      return 'rgba(240,195,106,'
    case 'motor':
      return 'rgba(138,129,118,'
    default: {
      const _never: never = system
      return _never
    }
  }
}

export function neuropil(id: string) {
  const found = NEUROPILS.find((row) => row.id === id)
  if (!found) throw new Error(`missing neuropil ${id}`)
  return found
}
