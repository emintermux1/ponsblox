import { LOBES } from './connectome.ts'
import type { SimRuntime } from './sim.ts'

const WATCH = ['Op_L', 'Op_R', 'V', 'sV', 'aBa', 'mB', 'Pe_L', 'Pe_R', 'adC_L', 'adC_R', 'avC_L', 'avC_R', 'aP', 'Pv', 'pC_L', 'pC_R']

export function LobeMeters({ runtime }: { runtime: SimRuntime }) {
  const rows = WATCH.map((id) => LOBES.find((row) => row.id === id)).filter((row): row is (typeof LOBES)[number] => Boolean(row))

  return (
    <ul className="meters">
      {rows.map((row) => {
        const v = runtime.lobes[row.id] ?? 0
        return (
          <li key={row.id}>
            <span>{row.abbr}</span>
            <b>{row.name}</b>
            <i>
              <em style={{ width: `${Math.round(v * 100)}%` }} />
            </i>
            <strong>{v.toFixed(2)}</strong>
          </li>
        )
      })}
    </ul>
  )
}
