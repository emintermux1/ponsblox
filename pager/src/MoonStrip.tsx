import { useEffect, useState } from 'react'
import { ModelStage } from './ModelStage.tsx'
import { phaseLabel, readMoon, sunDirection } from './moon.ts'

export function MoonStrip() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  const moon = readMoon(now)
  const light = sunDirection(moon.ageDays)

  return (
    <section className="moon" id="moon">
      <div className="moon-copy">
        <p className="eyebrow">Live signal</p>
        <h2>{phaseLabel(moon.phase)}</h2>
        <dl>
          <div>
            <dt>Illumination</dt>
            <dd>{Math.round(moon.illumination * 100)}%</dd>
          </div>
          <div>
            <dt>Age</dt>
            <dd>{moon.ageDays.toFixed(2)} d</dd>
          </div>
          <div>
            <dt>Next</dt>
            <dd>
              {phaseLabel(moon.nextPhase)} · {moon.nextInDays.toFixed(1)} d
            </dd>
          </div>
        </dl>
      </div>
      <div className="moon-globe">
        <ModelStage src="/models/moon.glb" light={light} spin={0.05} fit={0.52} />
      </div>
    </section>
  )
}
