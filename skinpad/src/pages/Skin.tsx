import { useEffect, useState } from 'react'
import { InspectPane } from '../components/InspectModal.tsx'
import { EmptyState, ErrorState } from '../components/ErrorState.tsx'
import { PriceSpark } from '../components/Spark.tsx'
import { fetchSkin, type SkinDetail } from '../lib/api.ts'
import { launchPath, onNavClick, tokenPath } from '../lib/router.ts'
import { steamListingUrl } from '../lib/skins.ts'

export function SkinPage({ id }: { id: string }) {
  const [skin, setSkin] = useState<SkinDetail | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    setSkin(null)
    void fetchSkin(id).then(setSkin).catch((e: Error) => setErr(e.message))
  }, [id])

  return (
    <main className="page">
      <ErrorState error={err} />
      {skin && (
        <>
          <InspectPane skin={skin} />
          <PriceSpark skinId={skin.id} />
          <div className="row">
            <a className="btn btn--fire" href={launchPath(skin.id)} onClick={onNavClick(launchPath(skin.id))}>Launch a token</a>
            <a className="btn btn--ghost" href={steamListingUrl(skin.marketHashName)} target="_blank" rel="noreferrer">View on Steam ↗</a>
          </div>
          <h2>Tokens pegged to this listing</h2>
          {(!skin.tokens || skin.tokens.length === 0) && (
            <EmptyState title="None yet" body="Being first confers no claim. Anyone can peg another token to the same listing." />
          )}
          {skin.tokens && skin.tokens.length > 0 && (
            <ul className="pick">
              {skin.tokens.map((t) => (
                <li key={t.token}>
                  <a href={tokenPath(t.token)} onClick={onNavClick(tokenPath(t.token))}>{t.token}</a>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  )
}
