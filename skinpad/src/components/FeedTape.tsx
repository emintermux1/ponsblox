import { useEffect, useState } from 'react'
import { fetchCatalogue } from '../lib/api.ts'
import { fmtUsd } from '../lib/format.ts'
import { onNavClick, skinPath } from '../lib/router.ts'
import type { SkinListing } from '../lib/skins.ts'

export function FeedTape() {
  const [items, setItems] = useState<SkinListing[]>([])

  useEffect(() => {
    void fetchCatalogue().then((r) => setItems(r.items.slice(0, 24))).catch(() => {})
  }, [])

  if (items.length < 4) return null
  const loop = [...items, ...items]

  return (
    <div className="tape" aria-label="Live Steam listings">
      <span className="tape__live">LIVE</span>
      <div className="tape__mask">
        <div className="tape__track">
          {loop.map((s, i) => (
            <a
              key={`${s.id}-${i}`}
              className="tape__item"
              href={skinPath(s.id)}
              onClick={onNavClick(skinPath(s.id))}
              style={{ ['--rarity' as string]: s.rarityColor }}
            >
              {s.image && <img src={s.image} alt="" />}
              <strong>{s.finish}</strong>
              <em>{s.weapon}</em>
              <span>{fmtUsd(s.quoteUsd ?? s.lowestUsd)}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
