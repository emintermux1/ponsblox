import { useEffect, useState } from 'react'
import { formatUnits, type Address } from 'viem'
import { CopyButton } from '../components/CopyButton.tsx'
import { ErrorState } from '../components/ErrorState.tsx'
import { LiveOnPons } from '../components/LiveOnPons.tsx'
import { githubReadmeAssets, Readme } from '../components/Readme.tsx'
import { ShareStudio } from '../components/ShareStudio.tsx'
import { SourceLabel } from '../components/SourceLabel.tsx'
import { Spark } from '../components/Spark.tsx'
import { useExistingToken } from '../hooks/useExistingToken.ts'
import { useFeeRouter } from '../hooks/useFeeRouter.ts'
import { fetchAnalytics, fetchRepo, saveWatch, type RepoDetail } from '../lib/api.ts'
import { gmgnUrl, short, tokenUrl } from '../lib/chain.ts'
import { isOfficialToken } from '../config/official.ts'
import { compact, fmtRblx, logoSrc, pctLabel, quoteLabel, X_URL } from '../lib/format.ts'
import { byGitlabName } from '../lib/naming.ts'
import { setDocumentMeta } from '../lib/meta.ts'
import { launchPath, navigate, onNavClick, repoPath } from '../lib/router.ts'
import { tokenForRepo } from '../lib/tokens.ts'
import { useWallet } from '../lib/wallet.tsx'
import type { TokenRecord } from '../lib/pons.ts'

type Tab = 'market' | 'repository' | 'fees' | 'activity' | 'transactions'

const TABS: { id: Tab; label: string }[] = [
  { id: 'market', label: 'MARKET' },
  { id: 'repository', label: 'REPOSITORY' },
  { id: 'fees', label: 'FEES' },
  { id: 'activity', label: 'ACTIVITY' },
  { id: 'transactions', label: 'TRANSACTIONS' },
]

export function TokenByAddress({ address }: { address: string }) {
  const { token, pending, busy, error } = useExistingToken(address)
  if (error && !token) return <main className="paper paper--page"><ErrorState error={error} /></main>
  if (busy || !token) return <main className="paper paper--page"><p className="muted">Reading Pons V2…</p></main>
  return <TokenView row={token} pending={pending} />
}

export function TokenByRepo({ owner, repo }: { owner: string; repo: string }) {
  const [row, setRow] = useState<TokenRecord | null | undefined>(undefined)
  useEffect(() => {
    let live = true
    void tokenForRepo(owner, repo)
      .then((t) => {
        if (!live) return
        if (t) navigate(`/token/${t.token}`)
        else setRow(null)
      })
      .catch(() => { if (live) setRow(null) })
    return () => { live = false }
  }, [owner, repo])
  if (row === undefined) return <main className="paper paper--page"><p className="muted">Resolving {owner}/{repo}…</p></main>
  return (
    <main className="paper paper--page">
      <p>No GitPad token for {owner}/{repo} yet.</p>
      <a className="btn btn--lime" href={launchPath(owner, repo)} onClick={onNavClick(launchPath(owner, repo))}>Launch</a>
    </main>
  )
}

function TokenView({
  row,
  pending,
}: {
  row: TokenRecord
  pending: { recipient: Address; effectiveAt: number; expiresAt: number } | null
}) {
  const w = useWallet()
  const fees = useFeeRouter(row.token)
  const [tab, setTab] = useState<Tab>('market')
  const [repo, setRepo] = useState<RepoDetail | null>(null)
  const [range, setRange] = useState('7D')
  const [stars, setStars] = useState<number[]>([])
  const [commits, setCommits] = useState<number[]>([])
  const [prices, setPrices] = useState<number[]>([])
  const [caps, setCaps] = useState<number[]>([])
  const [watching, setWatching] = useState(false)
  const display = byGitlabName(row.name)
  const art = logoSrc(row.logo)

  useEffect(() => {
    setDocumentMeta({
      title: `${display} $${row.symbol} — GitPad`,
      description: row.repo
        ? `${display} paired with ${row.repo.owner}/${row.repo.name} on Pons V2.`
        : `${display} on Pons V2, Robinhood Chain.`,
      path: `/token/${row.token}`,
      image: `/api/og?title=${encodeURIComponent(display)}&ticker=${encodeURIComponent(`$${row.symbol}`)}&contract=${encodeURIComponent(row.token)}&repo=${encodeURIComponent(row.repo ? `${row.repo.owner}/${row.repo.name}` : '')}&layout=og`,
    })
  }, [display, row.symbol, row.token, row.repo])

  useEffect(() => {
    if (!row.repo) return
    void fetchRepo(row.repo.owner, row.repo.name).then(setRepo).catch(() => setRepo(null))
  }, [row.repo])

  useEffect(() => {
    void fetchAnalytics({ githubId: repo?.id, token: row.token, range }).then((a) => {
      setStars(a.repo.map((p) => p.stars))
      setCommits(a.repo.map((p) => p.commitsWeek))
      setPrices(a.market.map((p) => Number(p.priceRblx || 0)).filter((n) => n > 0))
      setCaps(a.market.map((p) => Number(p.capRblx || 0)).filter((n) => n > 0))
    }).catch(() => {})
  }, [repo?.id, row.token, range])

  useEffect(() => {
    if (repo?.commitActivity?.length && !commits.length) {
      setCommits(repo.commitActivity.slice(-12).map((w) => w.total))
    }
  }, [repo, commits.length])

  const lastCommit = repo?.commits[0]

  return (
    <main>
      <section className="repohead">
        <LiveOnPons />
        {art && <img className="sprev__art" src={art} alt="" />}
        <p className="kicker">{row.symbol} · {row.graduated ? 'Graduated' : 'On the curve'}{isOfficialToken(row.token) ? ' · Official' : ''}</p>
        <h1>{display}</h1>
        <p className="lede">${row.symbol}</p>
        <p>Paired with: {row.repo
          ? <a href={repoPath(row.repo.owner, row.repo.name)} onClick={onNavClick(repoPath(row.repo.owner, row.repo.name))}>{row.repo.owner}/{row.repo.name}</a>
          : 'repository not detected'}</p>
        <p className="mono break">{row.token}</p>
        {pending && (
          <p className="err">
            Pons protocol takeover pending → {short(pending.recipient)} from {new Date(pending.effectiveAt * 1000).toLocaleString()}
          </p>
        )}
        <div className="pipe">
          <span>CODE</span><i /><span>TOKEN</span>
        </div>
        <div className="hero__cta">
          <a className="btn btn--lime btn--lg" href={gmgnUrl(row.token)} target="_blank" rel="noreferrer">Trade</a>
          <a className="btn btn--paper btn--lg" href={X_URL} target="_blank" rel="noreferrer">X</a>
          {row.repo && (
            <a className="btn btn--paper btn--lg" href={`https://github.com/${row.repo.owner}/${row.repo.name}`} target="_blank" rel="noreferrer">GitHub</a>
          )}
          <a className="btn btn--ink btn--lg" href={`/fees/${row.token}`} onClick={onNavClick(`/fees/${row.token}`)}>Fees</a>
          {w.address && (
            <button
              type="button"
              className="btn btn--ghost btn--lg"
              disabled={watching}
              onClick={() => {
                void saveWatch({ wallet: w.address, kind: 'token', token: row.token, alerts: { launch: true, trending: false } })
                  .then(() => setWatching(true))
              }}
            >
              {watching ? 'Watching' : 'Watch token'}
            </button>
          )}
          <a className="btn btn--ghost btn--lg" href={tokenUrl(row.token)} target="_blank" rel="noreferrer">Explorer</a>
          <CopyButton value={row.token} label="Copy CA" className="btn btn--ghost btn--lg" />
          {row.repo && <CopyButton value={`https://github.com/${row.repo.owner}/${row.repo.name}`} label="Copy repository URL" className="btn btn--ghost btn--lg" />}
        </div>
      </section>

      <div className="tabs tabbar">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={tab === t.id ? 'is-on' : ''} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {tab === 'market' && (
        <section className="paper">
          <ul className="stats">
            <li><span>Price <SourceLabel source="onchain" /></span><b>{fmtRblx(row.priceRblx)} {quoteLabel(row.pairToken, row.pairSymbol)}</b></li>
            <li><span>Market Cap</span><b>{fmtRblx(row.capRblx, 2)} {quoteLabel(row.pairToken, row.pairSymbol)}</b></li>
            <li><span>Liquidity</span><b>{fmtRblx(formatUnits(BigInt(row.quoteReserve || '0'), 18), 2)}</b></li>
            <li><span>Holders <SourceLabel source="market" /></span><b>Unavailable</b></li>
            <li><span>Volume <SourceLabel source="market" /></span><b>Unavailable</b></li>
            <li><span>Creator tax</span><b>{pctLabel(row.creatorTaxBps)}</b></li>
          </ul>
          <dl className="kv">
            <div><dt>Contract Address</dt><dd className="mono">{row.token}</dd></div>
            <div><dt>Pons V2 deployment</dt><dd>Live on Pons · Robinhood Chain 4663</dd></div>
            <div><dt>Repository</dt><dd>{row.repo ? `${row.repo.owner}/${row.repo.name}` : '—'}</dd></div>
            <div><dt>X</dt><dd><a href={X_URL} target="_blank" rel="noreferrer">{X_URL}</a></dd></div>
            <div><dt>Creator / deployer</dt><dd className="mono">{short(row.deployer)}</dd></div>
            <div><dt>Launch date</dt><dd>Unavailable until the indexer stores the block time</dd></div>
          </dl>
          <p className="muted">Holders and volume show when Bitquery is connected.</p>
        </section>
      )}

      {tab === 'repository' && (
        <section className="paper">
          {repo ? (
            <>
              <ul className="stats">
                <li><span>Stars</span><b>{compact(repo.stars)}</b></li>
                <li><span>Forks</span><b>{compact(repo.forks)}</b></li>
                <li><span>Contributors</span><b>{repo.contributors.length}</b></li>
                <li><span>7d</span><b>{repo.stars7d == null ? '—' : `+${compact(repo.stars7d)}`}</b></li>
                <li><span>Language</span><b>{repo.language || '—'}</b></li>
                <li><span>Last commit</span><b>{lastCommit ? lastCommit.sha : '—'}</b></li>
              </ul>
              {repo.fork && <p className="err">This is a fork{repo.parentFullName ? ` of ${repo.parentFullName}` : ''}.</p>}
              <p className="muted">Maintainers have not endorsed this token unless a claim badge is present on the repo page.</p>
              <Readme markdown={repo.readme.slice(0, 4000)} assets={githubReadmeAssets(repo.owner, repo.name)} />
            </>
          ) : <p className="muted">No repository linked in token metadata.</p>}
        </section>
      )}

      {tab === 'fees' && (
        <section className="paper">
          <ul className="stats">
            <li><span>Fees out</span><b>{fmtRblx(fees.distributed, 4)}</b></li>
            <li><span>Repository Treasury</span><b>{fees.live ? 'Configured on router' : 'Unavailable'}</b></li>
          </ul>
          <a className="btn btn--ink" href={`/fees/${row.token}`} onClick={onNavClick(`/fees/${row.token}`)}>Open fee desk</a>
        </section>
      )}

      {tab === 'activity' && (
        <section className="ink">
          <header className="sec">
            <div>
              <h2>Repository momentum ↔ market momentum</h2>
              <p className="muted">Shown together. Not causation. Not financial advice.</p>
            </div>
            <div className="tabs">
              {['24H', '7D', '30D', 'ALL'].map((r) => (
                <button key={r} type="button" className={range === r ? 'is-on' : ''} onClick={() => setRange(r)}>{r}</button>
              ))}
            </div>
          </header>
          <div className="split">
            <Spark label="GitHub stars" values={stars} />
            <Spark label="GitHub commits" values={commits} />
            <Spark label={`Token price (${quoteLabel(row.pairToken, row.pairSymbol)})`} values={prices} />
            <Spark label={`Token cap (${quoteLabel(row.pairToken, row.pairSymbol)})`} values={caps} />
            <Spark label="Fees generated" values={fees.history.map((h) => Number(h.amount))} />
          </div>
        </section>
      )}

      {tab === 'transactions' && (
        <section className="paper">
          <h2>Distributions</h2>
          {fees.history.length ? (
            <ul className="tape">
              {fees.history.map((h, i) => (
                <li key={`${h.tx}-${i}`}>
                  <strong>{h.role}</strong>
                  <em>{h.amount} · {short(h.tx)}</em>
                </li>
              ))}
            </ul>
          ) : <p className="muted">No fee-router events yet.</p>}
        </section>
      )}

      {row.repo && (
        <ShareStudio
          name={display}
          symbol={row.symbol}
          owner={row.repo.owner}
          repo={row.repo.name}
          token={row.token}
          stars={repo?.stars}
        />
      )}
    </main>
  )
}
