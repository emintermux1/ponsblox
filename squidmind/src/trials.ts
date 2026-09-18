export type Stimulus = 'pulse' | 'psc'

export type Trial = {
  id: string
  axon: number
  trial: number
  stimulus: Stimulus
}

const COUNTS = [22, 11, 8, 23, 22, 52, 12, 20] as const

function stimulusFor(axon: number, trial: number): Stimulus {
  if (axon === 6 && trial % 3 === 0) return 'pulse'
  if (trial % 4 === 0) return 'pulse'
  return 'psc'
}

export const TRIALS: Trial[] = COUNTS.flatMap((count, i) => {
  const axon = i + 1
  return Array.from({ length: count }, (_, k) => {
    const trial = k + 1
    const pad = trial < 10 ? `0${trial}` : String(trial)
    return {
      id: `a${axon}t${pad}`,
      axon,
      trial,
      stimulus: stimulusFor(axon, trial),
    }
  })
})

export function trialsFor(axon: number) {
  return TRIALS.filter((row) => row.axon === axon)
}

export function trialById(id: string) {
  return TRIALS.find((row) => row.id === id) ?? TRIALS[0]
}

if (TRIALS.length !== 170) {
  throw new Error(`SGAMP catalog must be 170 trials, got ${TRIALS.length}`)
}
