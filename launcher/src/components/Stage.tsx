import { Field } from './Field.tsx'
import { PadPreview } from './PadPreview.tsx'
import type { CustomSkin } from '../lib/custom.ts'
import type { KitId } from '../lib/kits.ts'

export function Stage(props: { kit: KitId; custom?: CustomSkin; name?: string }) {
  return (
    <div className="stage">
      <Field kit={props.kit} custom={props.custom} />
      <PadPreview kit={props.kit} custom={props.custom} name={props.name} />
    </div>
  )
}
