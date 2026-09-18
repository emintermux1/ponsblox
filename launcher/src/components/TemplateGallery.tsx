import { useState } from 'react'
import { COPY } from '../lib/copy.ts'
import type { CustomSkin } from '../lib/custom.ts'
import { KIT_FILTERS, kitsIn, type KitGroup, type KitId } from '../lib/kits.ts'
import { PadPreview } from './PadPreview.tsx'

export function TemplateGallery(props: {
  kit: KitId
  custom?: CustomSkin
  onPick: (id: KitId) => void
}) {
  const [group, setGroup] = useState<KitGroup>('all')
  return (
    <section className="templates">
      <div className="templates-head">
        <h2>{COPY.templates}</h2>
        <div className="filters">
          {KIT_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={group === f.id ? 'type on' : 'type'}
              onClick={() => setGroup(f.id)}
            >
              {f.name}
            </button>
          ))}
        </div>
      </div>
      <div className="gallery">
        {kitsIn(group).map((k) => (
          <button
            key={k.id}
            type="button"
            className={props.kit === k.id ? 'template on' : 'template'}
            onClick={() => props.onPick(k.id)}
          >
            <PadPreview kit={k.id} custom={k.id === 'custom' ? props.custom : undefined} name={k.name} compact />
            <div className="template-meta">
              <strong>{k.name}</strong>
              <span>{k.line}</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}
