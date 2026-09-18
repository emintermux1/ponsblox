import { short, txUrl } from '../lib/chain.ts'
import { onNavClick } from '../lib/router.ts'

export function ShareCard({
  name,
  symbol,
  owner,
  repo,
  token,
  hash,
  stars,
}: {
  name: string
  symbol: string
  owner: string
  repo: string
  token: string
  hash: string
  stars?: number | null
}) {
  const og = `/api/og?title=${encodeURIComponent(name)}&ticker=${encodeURIComponent(`$${symbol}`)}&repo=${encodeURIComponent(`${owner}/${repo}`)}&stars=${encodeURIComponent(stars != null ? `⭐ ${stars}` : '')}&contract=${encodeURIComponent(short(token, 6))}`
  const tweet = `https://x.com/intent/tweet?text=${encodeURIComponent(`${name} $${symbol}\n${owner}/${repo}\nLaunched on GitPad via Pons V2\n${token}`)}`
  return (
    <section className="share">
      <img src={og} alt="" width={600} height={315} />
      <h2>{name}</h2>
      <p className="mono">${symbol}</p>
      <p>{owner}/{repo}</p>
      <p className="mono">Contract {token}</p>
      <div className="hero__cta">
        <a className="btn btn--lime" href={`/token/${token}`} onClick={onNavClick(`/token/${token}`)}>View Token</a>
        <a className="btn btn--paper" href={txUrl(hash)} target="_blank" rel="noreferrer">View Transaction</a>
        <a className="btn btn--ghost" href={tweet} target="_blank" rel="noreferrer">Share on X</a>
      </div>
    </section>
  )
}
