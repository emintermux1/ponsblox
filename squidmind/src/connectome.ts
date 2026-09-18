import { KNOWN_PATHWAYS, NOVEL_PATHWAYS } from './lore.ts'

export type System = 'memory' | 'basal' | 'optic-track' | 'brachial' | 'pedal' | 'magno' | 'visceral' | 'optic'

export type Lobe = {
  id: string
  name: string
  abbr: string
  system: System
  x: number
  y: number
  r: number
}

export type Kind = 'known' | 'novel'

export type Pathway = {
  from: string
  to: string
  kind: Kind
  system: System
}

export const LOBES: Lobe[] = [
  { id: 'V', name: 'Vertical', abbr: 'V', system: 'memory', x: 0.5, y: 0.2, r: 16 },
  { id: 'sV', name: 'Subvertical', abbr: 'sV', system: 'memory', x: 0.5, y: 0.26, r: 10 },
  { id: 'sF', name: 'Superior frontal', abbr: 'sF', system: 'memory', x: 0.45, y: 0.23, r: 10 },
  { id: 'iF', name: 'Inferior frontal', abbr: 'iF', system: 'memory', x: 0.55, y: 0.23, r: 10 },
  { id: 'pF', name: 'Posterior frontal', abbr: 'pF', system: 'memory', x: 0.5, y: 0.3, r: 9 },
  { id: 'aBa', name: 'Anterior anterior basal', abbr: 'aBa', system: 'basal', x: 0.5, y: 0.36, r: 12 },
  { id: 'aBp', name: 'Anterior posterior basal', abbr: 'aBp', system: 'basal', x: 0.5, y: 0.41, r: 11 },
  { id: 'pr', name: 'Precommissural', abbr: 'pr', system: 'basal', x: 0.5, y: 0.46, r: 9 },
  { id: 'mB', name: 'Median basal', abbr: 'mB', system: 'basal', x: 0.5, y: 0.51, r: 12 },
  { id: 'dB_L', name: 'Dorsal basal L', abbr: 'dB', system: 'basal', x: 0.44, y: 0.38, r: 9 },
  { id: 'dB_R', name: 'Dorsal basal R', abbr: 'dB', system: 'basal', x: 0.56, y: 0.38, r: 9 },
  { id: 'iB_L', name: 'Interbasal L', abbr: 'iB', system: 'basal', x: 0.44, y: 0.46, r: 8 },
  { id: 'iB_R', name: 'Interbasal R', abbr: 'iB', system: 'basal', x: 0.56, y: 0.46, r: 8 },
  { id: 'lB_L', name: 'Lateral basal L', abbr: 'lB', system: 'basal', x: 0.43, y: 0.52, r: 9 },
  { id: 'lB_R', name: 'Lateral basal R', abbr: 'lB', system: 'basal', x: 0.57, y: 0.52, r: 9 },
  { id: 'Pe_L', name: 'Peduncle L', abbr: 'Pe', system: 'optic-track', x: 0.38, y: 0.46, r: 10 },
  { id: 'Pe_R', name: 'Peduncle R', abbr: 'Pe', system: 'optic-track', x: 0.62, y: 0.46, r: 10 },
  { id: 'of_L', name: 'Olfactory L', abbr: 'of', system: 'optic-track', x: 0.36, y: 0.54, r: 8 },
  { id: 'of_R', name: 'Olfactory R', abbr: 'of', system: 'optic-track', x: 0.64, y: 0.54, r: 8 },
  { id: 'D_L', name: 'Dorsolateral L', abbr: 'D', system: 'optic-track', x: 0.36, y: 0.34, r: 8 },
  { id: 'D_R', name: 'Dorsolateral R', abbr: 'D', system: 'optic-track', x: 0.64, y: 0.34, r: 8 },
  { id: 'iBu', name: 'Inferior buccal', abbr: 'iBu', system: 'brachial', x: 0.45, y: 0.13, r: 7 },
  { id: 'sBu', name: 'Superior buccal', abbr: 'sBu', system: 'brachial', x: 0.55, y: 0.13, r: 7 },
  { id: 'Br', name: 'Brachial', abbr: 'Br', system: 'brachial', x: 0.5, y: 0.1, r: 9 },
  { id: 'aP', name: 'Anterior pedal', abbr: 'aP', system: 'pedal', x: 0.5, y: 0.58, r: 11 },
  { id: 'pP', name: 'Posterior pedal', abbr: 'pP', system: 'pedal', x: 0.5, y: 0.65, r: 10 },
  { id: 'lP_L', name: 'Lateral pedal L', abbr: 'lP', system: 'pedal', x: 0.43, y: 0.62, r: 8 },
  { id: 'lP_R', name: 'Lateral pedal R', abbr: 'lP', system: 'pedal', x: 0.57, y: 0.62, r: 8 },
  { id: 'adC_L', name: 'Anterior dorsal chromatophore L', abbr: 'adC', system: 'pedal', x: 0.42, y: 0.56, r: 8 },
  { id: 'adC_R', name: 'Anterior dorsal chromatophore R', abbr: 'adC', system: 'pedal', x: 0.58, y: 0.56, r: 8 },
  { id: 'avC_L', name: 'Anterior ventral chromatophore L', abbr: 'avC', system: 'pedal', x: 0.42, y: 0.66, r: 8 },
  { id: 'avC_R', name: 'Anterior ventral chromatophore R', abbr: 'avC', system: 'pedal', x: 0.58, y: 0.66, r: 8 },
  { id: 'dM_L', name: 'Dorsal magnocellular L', abbr: 'dM', system: 'magno', x: 0.45, y: 0.78, r: 8 },
  { id: 'dM_R', name: 'Dorsal magnocellular R', abbr: 'dM', system: 'magno', x: 0.55, y: 0.78, r: 8 },
  { id: 'vM_L', name: 'Ventral magnocellular L', abbr: 'vM', system: 'magno', x: 0.45, y: 0.84, r: 7 },
  { id: 'vM_R', name: 'Ventral magnocellular R', abbr: 'vM', system: 'magno', x: 0.55, y: 0.84, r: 7 },
  { id: 'pM_L', name: 'Posterior magnocellular L', abbr: 'pM', system: 'magno', x: 0.47, y: 0.87, r: 7 },
  { id: 'pM_R', name: 'Posterior magnocellular R', abbr: 'pM', system: 'magno', x: 0.53, y: 0.87, r: 7 },
  { id: 'Pv', name: 'Palliovisceral', abbr: 'Pv', system: 'visceral', x: 0.5, y: 0.74, r: 10 },
  { id: 'vi', name: 'Visceral', abbr: 'vi', system: 'visceral', x: 0.5, y: 0.9, r: 8 },
  { id: 'lvP_L', name: 'Lateral ventral palliovisceral L', abbr: 'lvP', system: 'visceral', x: 0.43, y: 0.8, r: 7 },
  { id: 'lvP_R', name: 'Lateral ventral palliovisceral R', abbr: 'lvP', system: 'visceral', x: 0.57, y: 0.8, r: 7 },
  { id: 'F_L', name: 'Fin L', abbr: 'F', system: 'visceral', x: 0.4, y: 0.7, r: 8 },
  { id: 'F_R', name: 'Fin R', abbr: 'F', system: 'visceral', x: 0.6, y: 0.7, r: 8 },
  { id: 'pC_L', name: 'Posterior chromatophore L', abbr: 'pC', system: 'visceral', x: 0.42, y: 0.72, r: 8 },
  { id: 'pC_R', name: 'Posterior chromatophore R', abbr: 'pC', system: 'visceral', x: 0.58, y: 0.72, r: 8 },
  { id: 'Op_L', name: 'Optic L', abbr: 'Op', system: 'optic', x: 0.26, y: 0.48, r: 26 },
  { id: 'Op_R', name: 'Optic R', abbr: 'Op', system: 'optic', x: 0.74, y: 0.48, r: 26 },
]

const CHROMA = ['adC_L', 'adC_R', 'avC_L', 'avC_R', 'pC_L', 'pC_R'] as const
const MOTOR = ['aP', 'pP', 'lP_L', 'lP_R', 'F_L', 'F_R', ...CHROMA] as const

function lobe(id: string) {
  const found = LOBES.find((row) => row.id === id)
  if (!found) throw new Error(`missing lobe ${id}`)
  return found
}

function add(list: Pathway[], from: string, to: string, kind: Kind) {
  if (from === to) return
  if (list.some((row) => row.from === from && row.to === to && row.kind === kind)) return
  list.push({ from, to, kind, system: lobe(from).system })
}

function mesh(list: Pathway[], ids: string[], kind: Kind) {
  for (let i = 0; i < ids.length; i++) {
    for (let j = 0; j < ids.length; j++) {
      if (i === j) continue
      add(list, ids[i], ids[j], kind)
    }
  }
}

function fan(list: Pathway[], from: string[], to: string[], kind: Kind) {
  for (const a of from) {
    for (const b of to) add(list, a, b, kind)
  }
}

function buildKnown() {
  const edges: Pathway[] = []
  mesh(edges, ['V', 'sV', 'sF', 'iF', 'pF'], 'known')
  mesh(edges, ['aBa', 'aBp', 'pr', 'mB', 'dB_L', 'dB_R', 'iB_L', 'iB_R', 'lB_L', 'lB_R'], 'known')
  mesh(edges, ['Pe_L', 'Pe_R', 'of_L', 'of_R', 'D_L', 'D_R'], 'known')
  mesh(edges, ['iBu', 'sBu', 'Br'], 'known')
  mesh(edges, ['aP', 'pP', 'lP_L', 'lP_R', 'adC_L', 'adC_R', 'avC_L', 'avC_R'], 'known')
  mesh(edges, ['dM_L', 'dM_R', 'vM_L', 'vM_R', 'pM_L', 'pM_R'], 'known')
  mesh(edges, ['Pv', 'vi', 'lvP_L', 'lvP_R', 'F_L', 'F_R', 'pC_L', 'pC_R'], 'known')
  fan(edges, ['Op_L'], ['Pe_L', 'D_L', 'dB_L', 'lB_L', 'aBa'], 'known')
  fan(edges, ['Op_R'], ['Pe_R', 'D_R', 'dB_R', 'lB_R', 'aBa'], 'known')
  fan(edges, ['Pe_L', 'Pe_R'], ['aBa', 'aBp', 'mB', 'sV'], 'known')
  fan(edges, ['aBa', 'mB', 'lB_L', 'lB_R'], ['aP', 'pP', 'adC_L', 'adC_R', 'avC_L', 'avC_R'], 'known')
  fan(edges, ['mB', 'aBp'], ['pC_L', 'pC_R', 'Pv', 'F_L', 'F_R'], 'known')
  fan(edges, ['Br', 'sBu'], ['aP', 'iF', 'V'], 'known')
  fan(edges, ['dM_L', 'dM_R', 'vM_L', 'vM_R'], ['Op_L', 'Op_R', 'aP', 'pP'], 'known')
  fan(edges, ['of_L'], ['dB_L', 'iB_L', 'mB'], 'known')
  fan(edges, ['of_R'], ['dB_R', 'iB_R', 'mB'], 'known')
  fan(edges, ['V', 'sF'], ['aBa', 'Pe_L', 'Pe_R'], 'known')
  return edges
}

function buildNovel(known: Pathway[]) {
  const edges: Pathway[] = []
  const taken = new Set(known.map((row) => `${row.from}>${row.to}`))
  const visual = ['Op_L', 'Op_R', 'Pe_L', 'Pe_R', 'D_L', 'D_R']
  const targets = [...MOTOR, 'aBa', 'mB', 'lB_L', 'lB_R', 'dB_L', 'dB_R']
  for (const a of visual) {
    for (const b of targets) {
      const key = `${a}>${b}`
      if (taken.has(key)) continue
      add(edges, a, b, 'novel')
    }
  }
  fan(edges, ['pC_L', 'pC_R'], ['adC_L', 'adC_R', 'avC_L', 'avC_R', 'F_L', 'F_R'], 'novel')
  return edges
}

function take(list: Pathway[], n: number, kind: Kind) {
  const out = list.filter((row) => row.kind === kind).slice(0, n)
  if (out.length < n) {
    const ids = LOBES.map((row) => row.id)
    let i = 0
    while (out.length < n) {
      const from = ids[i % ids.length]
      const to = ids[(i * 7 + 3) % ids.length]
      i += 1
      if (from === to) continue
      if (out.some((row) => row.from === from && row.to === to)) continue
      out.push({ from, to, kind, system: lobe(from).system })
    }
  }
  return out
}

const known = take(buildKnown(), KNOWN_PATHWAYS, 'known')
const novel = take(buildNovel(known), NOVEL_PATHWAYS, 'novel')

export const PATHWAYS: Pathway[] = [...known, ...novel]

export const CHROMA_IDS = CHROMA

if (known.length !== KNOWN_PATHWAYS || novel.length !== NOVEL_PATHWAYS) {
  throw new Error(`connectome counts ${known.length}+${novel.length}`)
}

export function neighbors(id: string) {
  return PATHWAYS.filter((row) => row.from === id).map((row) => row.to)
}
