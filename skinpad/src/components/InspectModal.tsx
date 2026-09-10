import { fmtUsd } from '../lib/format.ts'
import { quoteSourceLabel, steamListingUrl, type SkinListing } from '../lib/skins.ts'

function bestPrice(skin: SkinListing): { usd: number | null; label: string } {
  if (skin.quoteUsd != null) {
    return {
      usd: skin.quoteUsd,
      label: skin.quoteSource === 'steam_median' ? 'Steam median' : 'Last known median',
    }
  }
  if (skin.lowestUsd != null) return { usd: skin.lowestUsd, label: 'Steam ask' }
  return { usd: null, label: 'Steam price' }
}

export function InspectPane({ skin }: { skin: SkinListing }) {
  const price = bestPrice(skin)
  return (
    <div className="inspect" style={{ ['--rarity' as string]: skin.rarityColor }}>
      <div className="inspect__art">
        {skin.image ? (
          <img src={skin.image} alt={skin.marketHashName} />
        ) : (
          <div className="inspect__empty">No Steam image</div>
        )}
      </div>
      <div className="inspect__copy">
        <p className="kicker">{skin.category} · {skin.rarity}</p>
        <h2>{skin.marketHashName}</h2>
        <dl className="kv">
          <div><dt>Wear</dt><dd>{skin.wear || '—'}</dd></div>
          <div><dt>{price.label}</dt><dd>{fmtUsd(price.usd)}</dd></div>
          {skin.quoteUsd != null && skin.lowestUsd != null && (
            <div><dt>Steam ask</dt><dd>{fmtUsd(skin.lowestUsd)}</dd></div>
          )}
          <div><dt>Volume</dt><dd>{skin.volume || '—'}</dd></div>
          <div><dt>Quote</dt><dd>{quoteSourceLabel(skin.quoteSource)}</dd></div>
          {skin.collection && <div><dt>Collection</dt><dd>{skin.collection}</dd></div>}
        </dl>
        <a
          className="btn btn--ghost btn--sm"
          href={steamListingUrl(skin.marketHashName)}
          target="_blank"
          rel="noreferrer"
        >
          View on Steam ↗
        </a>
        <p className="muted">Peg uses Steam median, not the cheapest listing. {price.usd == null ? 'Last known price is held when the feed is down.' : ''}</p>
      </div>
    </div>
  )
}
