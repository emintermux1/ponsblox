import { useRef, type PointerEvent } from 'react'
import { fmtUsd } from '../lib/format.ts'
import { launchPath, onNavClick, skinPath } from '../lib/router.ts'
import type { SkinListing } from '../lib/skins.ts'

const WEAR_POS: Record<string, number> = {
  FN: 0.03,
  MW: 0.11,
  FT: 0.26,
  WW: 0.41,
  BS: 0.6,
}

export function SkinCard({ skin, delay = 0 }: { skin: SkinListing; delay?: number }) {
  const card = useRef<HTMLElement>(null)
  const price = skin.quoteUsd ?? skin.lowestUsd
  const source = skin.quoteSource === 'steam_median' ? 'median' : skin.quoteSource === 'steam_ask' ? 'ask' : 'stale'
  const wearPos = skin.wearShort ? WEAR_POS[skin.wearShort] : undefined

  function tilt(e: PointerEvent<HTMLElement>) {
    const el = card.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--px', String((e.clientX - r.left) / r.width))
    el.style.setProperty('--py', String((e.clientY - r.top) / r.height))
  }

  function flatten() {
    const el = card.current
    if (!el) return
    el.style.setProperty('--px', '0.5')
    el.style.setProperty('--py', '0.5')
  }

  return (
    <article
      ref={card}
      className="scard fade-up"
      style={{ ['--rarity' as string]: skin.rarityColor, animationDelay: `${delay}s` }}
      onPointerMove={tilt}
      onPointerLeave={flatten}
    >
      <a className="scard__hit" href={skinPath(skin.id)} onClick={onNavClick(skinPath(skin.id))}>
        <div className="scard__meta">
          <span className="wear">{skin.wearShort || '—'}</span>
          {skin.stattrak && <span className="tag tag--st">ST</span>}
          {skin.souvenir && <span className="tag tag--sv">SV</span>}
        </div>
        {skin.image ? (
          <img className="scard__img" src={skin.image} alt={skin.marketHashName} loading="lazy" />
        ) : (
          <div className="scard__img scard__img--empty" />
        )}
        <h3>{skin.finish}</h3>
        <p className="scard__weapon">{skin.weapon}</p>
        <p className="scard__price">
          {fmtUsd(price)}
          <span>{source}</span>
        </p>
        {wearPos != null && (
          <>
            <div className="wearbar" aria-hidden>
              <i style={{ left: `${wearPos * 100}%` }} />
            </div>
            <div className="wearlabel" aria-hidden>
              <span>wear</span>
              <span>{skin.wearShort}</span>
            </div>
          </>
        )}
      </a>
      <a className="scard__bar" href={launchPath(skin.id)} onClick={onNavClick(launchPath(skin.id))}>
        Launch →
      </a>
    </article>
  )
}
