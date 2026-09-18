import { NEUROPILS, SYSTEMS, systemLabel } from './brain.ts'
import type { SimRuntime } from './sim.ts'

export function KenyonMeters({ runtime }: { runtime: SimRuntime }) {
  return (
    <div className="meters-wrap">
      {SYSTEMS.map((system) => (
        <div key={system} className="meters-group">
          <p className="kicker">{systemLabel(system)}</p>
          <ul className="meters">
            {NEUROPILS.filter((row) => row.system === system).map((row) => {
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
        </div>
      ))}
    </div>
  )
}
