import { useEffect, useState } from 'react'
import { LiveOnPons } from '../LiveOnPons.tsx'
import { MomentumBadge, signalFromRepo } from '../MomentumBadge.tsx'
import type { RepoDetail } from '../../lib/api.ts'
import { compact, logoGatewayCount, logoSrc } from '../../lib/format.ts'
import { byGitlabName } from '../../lib/naming.ts'
import type { FeeSplit } from '../../lib/gitpad.ts'

export function StudioPreview({
  name,
  symbol,
  image,
  description,
  owner,
  repo,
  detail,
  splits,
  routeFees,
  routerLive,
  feeHint,
}: {
  name: string
  symbol: string
  image: string
  description: string
  owner: string
  repo: string
  detail: RepoDetail | null
  splits: FeeSplit[]
  routeFees: boolean
  routerLive: boolean
  feeHint?: string
}) {
  const display = byGitlabName(name) || 'Token By GitLab'
  const ticker = symbol ? `$${symbol.toUpperCase()}` : '$TICKER'
  const pair = owner && repo ? `${owner}/${repo}` : 'repository unset'
  const sig = detail ? signalFromRepo(detail) : null
  const [gateway, setGateway] = useState(0)
  const [broken, setBroken] = useState(false)
  const src = logoSrc(image, gateway)
  useEffect(() => {
    setGateway(0)
    setBroken(false)
  }, [image])
  return (
    <aside className="sprev">
      <p className="kicker">Live token preview</p>
      <LiveOnPons />
      <div className="sprev__page">
        {src && !broken
          ? (
            <img
              className="sprev__art"
              src={src}
              alt=""
              onError={() => {
                if (gateway + 1 < logoGatewayCount(image)) setGateway((n) => n + 1)
                else setBroken(true)
              }}
            />
          )
          : <div className="sprev__art sprev__art--empty" />}
        <h2>{display}</h2>
        <p className="lede">{ticker}</p>
        <p className="sprev__pair">
          paired with{' '}
          <b>{pair}</b>
        </p>
        {detail && (
          <p>
            ⭐ {compact(detail.stars)}
            {detail.stars7d != null ? <span> ↑ +{compact(detail.stars7d)} / 7D</span> : null}
          </p>
        )}
        {sig && (
          <p className="mono">
            GitPad Trend {sig.label}
            {detail?.rank ? ` · #${detail.rank}` : detail ? ` · ${detail.trendScore}` : ''}
          </p>
        )}
        {sig && <MomentumBadge signal={sig} explain />}
        <p>{description || 'Description appears here as you type.'}</p>
        <div className="pipe"><span>CODE</span><i /><span>TOKEN</span></div>
        <div className="tabs tabbar sprev__tabs">
          <button type="button" className="is-on" disabled>MARKET</button>
          <button type="button" disabled>REPOSITORY</button>
          <button type="button" disabled>FEES</button>
          <button type="button" disabled>ACTIVITY</button>
          <button type="button" disabled>TRANSACTIONS</button>
        </div>
        <p className="kicker">Fee routing</p>
        {routeFees && routerLive ? (
          <ul className="sprev__fees">
            {splits.map((s) => (
              <li key={`${s.role}-${s.to}`}>
                <span>{s.role}</span>
                <b>{s.bps / 100}%</b>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">
            {feeHint
              || (routerLive
                ? 'Creator wallet receives Pons tax unless you route it.'
                : 'Creator wallet receives Pons tax. GitPad writes the route after that wallet signs.')}
          </p>
        )}
        <p className="kicker">Pons V2</p>
        <p className="muted">Robinhood Chain 4663 · pair ETH. LIVE only after TokenLaunched.</p>
      </div>
    </aside>
  )
}
