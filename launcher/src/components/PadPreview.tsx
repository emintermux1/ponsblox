import { CUSTOM_DEFAULT, type CustomSkin } from '../lib/custom.ts'
import { kitById, type KitId } from '../lib/kits.ts'
import { padLabels } from '../lib/labels.ts'
import { kitShot } from '../lib/shots.ts'
import { kitVarsStyle } from '../lib/skin.ts'

export function PadPreview(props: {
  kit: KitId
  custom?: CustomSkin
  compact?: boolean
  name?: string
}) {
  const selected = kitById(props.kit)
  const labels = padLabels(props.kit)
  const shot = kitShot(props.kit)
  const className = props.compact ? 'mini compact' : 'mini'

  if (shot) {
    return (
      <div className={`${className} shot`} data-kit={props.kit} aria-hidden>
        <img src={shot} alt="" />
      </div>
    )
  }

  const skin = props.kit === 'custom' ? { ...CUSTOM_DEFAULT, ...props.custom } : selected
  return (
    <div className={`${className} live`} data-kit={props.kit} style={kitVarsStyle(props.kit, props.custom)} aria-hidden>
      <div className="mini-bar">
        <strong>{props.name || selected.name}</strong>
        <span className="mini-cta" style={{ background: skin.accent, color: skin.paper }}>
          {labels.submit}
        </span>
      </div>
      <div className="mini-form">
        <b>{labels.title}</b>
        <i />
        <i />
        <i className="wide" />
      </div>
    </div>
  )
}
