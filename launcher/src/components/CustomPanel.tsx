import { CUSTOM_DEFAULT, type CustomSkin } from '../lib/custom.ts'

export function CustomPanel(props: {
  value: CustomSkin
  onChange: (next: CustomSkin) => void
}) {
  const set = (key: keyof CustomSkin, value: string) => {
    props.onChange({ ...props.value, [key]: value })
  }
  return (
    <div className="custom">
      <label>
        Accent
        <input type="color" value={props.value.accent} onChange={(e) => set('accent', e.target.value)} />
      </label>
      <label>
        Paper
        <input type="color" value={props.value.paper} onChange={(e) => set('paper', e.target.value)} />
      </label>
      <label>
        Ink
        <input type="color" value={props.value.ink} onChange={(e) => set('ink', e.target.value)} />
      </label>
      <button type="button" className="chip-btn" onClick={() => props.onChange(CUSTOM_DEFAULT)}>Reset</button>
    </div>
  )
}
