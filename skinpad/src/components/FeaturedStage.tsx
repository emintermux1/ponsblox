import { fmtUsd } from '../lib/format.ts'
import { onNavClick, skinPath } from '../lib/router.ts'
import type { SkinListing } from '../lib/skins.ts'

const POSES = [
  { top: '4%', left: '30%', width: '62%', rotate: '7deg', z: 3 },
  { top: '36%', left: '-2%', width: '54%', rotate: '-11deg', z: 2 },
  { top: '55%', left: '44%', width: '50%', rotate: '-4deg', z: 1 },
  { top: '2%', left: '-1%', width: '36%', rotate: '-18deg', z: 1 },
] as const

export function FeaturedStage({ items }: { items: SkinListing[] }) {
  const picks = items.filter((s) => s.image).slice(0, POSES.length)
  if (picks.length === 0) return <div className="stage stage--empty" />

  return (
    <div className="stage" aria-label="Top catalogue listings">
      <div className="stage__backdrop" aria-hidden />
      <div className="stage__patch" aria-hidden />
      {picks.map((skin, i) => {
        const pose = POSES[i]
        const price = skin.lowestUsd ?? skin.quoteUsd
        return (
          <a
            key={skin.id}
            className="stage__item"
            href={skinPath(skin.id)}
            onClick={onNavClick(skinPath(skin.id))}
            style={{
              top: pose.top,
              left: pose.left,
              width: pose.width,
              zIndex: pose.z,
              ['--tilt' as string]: pose.rotate,
            }}
          >
            <img src={skin.image} alt={skin.marketHashName} loading="lazy" />
            <span className="stage__tip" style={{ ['--rarity' as string]: skin.rarityColor }}>
              {skin.finish}{price != null ? ` · ${fmtUsd(price)}` : ''}
            </span>
          </a>
        )
      })}
    </div>
  )
}
