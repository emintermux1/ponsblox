import { useState } from 'react'
import { OfficialCa } from './OfficialCa.tsx'
import { enterHive } from '../store.ts'

export function AgeGate() {
  const [larva, setLarva] = useState(false)

  return (
    <div className="gate">
      <div className="gate-card">
        <img className="gate-logo" src="/logo.png" alt="OnlyFlys" />
        <p className="gate-kicker">18+ house flies</p>
        <h1>This hive is for adult Musca.</h1>
        <p className="gate-copy">
          That is about three days after hatch. Humans: if you are 18, enter. The flies are mating. Not people.
        </p>
        {larva ? <p className="gate-joke">Come back in 72 hours. Or just enter. Nobody is checking your wings.</p> : null}
        <button type="button" className="btn btn-blue" onClick={enterHive}>
          I am 18 / I hatched
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setLarva(true)}>
          I am a larva
        </button>
        <OfficialCa compact />
      </div>
    </div>
  )
}
