import { useState } from 'react'
import { isOfficialToken, WIKIPAD_OFFICIAL_TOKEN } from '../config/official.ts'
import { COPY } from '../lib/copy.ts'
import { gmgnUrl, ponsTokenUrl, short, tokenUrl } from '../lib/chain.ts'
import { timeAgoMs } from '../lib/format.ts'
import { hrefFor, onNav } from '../lib/router.ts'
import type { TokenRecord } from '../lib/pons/index.ts'
import { ZERO } from '../lib/pons/config.ts'

function displayCa(token: string) {
  return isOfficialToken(token) ? WIKIPAD_OFFICIAL_TOKEN : token
}

function CopyCa({ token }: { token: string }) {
  const [copied, setCopied] = useState(false)
  const ca = displayCa(token)

  async function copy() {
    if (!navigator.clipboard) return
    await navigator.clipboard.writeText(ca)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  return (
    <button type="button" className="linkish" onClick={() => void copy()} title={ca}>
      {copied ? 'Copied CA' : 'Copy CA'}
    </button>
  )
}

function WikiPadMark() {
  return <span className="product-tag">WikiPad</span>
}

export function MarketRow({ row }: { row: TokenRecord }) {
  const wikiHref = row.wiki ? hrefFor({ name: 'topic', title: row.wiki.title }) : null
  const ca = displayCa(row.token)
  const official = isOfficialToken(row.token)
  const pair = row.pairSymbol || 'ETH'
  const curve = row.curve && row.curve !== ZERO ? short(row.curve) : '—'
  return (
    <tr>
      <td>
        {row.logo
          ? <img className="thumb" src={row.logo} alt="" width={28} height={28} />
          : <span className="thumb thumb--ph" aria-hidden>{row.symbol.slice(0, 1)}</span>}
        <strong>{row.name}</strong>
        {' · '}
        <WikiPadMark />
        <div className="muted">${row.symbol}{official ? ' · Official' : ''}</div>
        {row.wiki?.editorName && (
          <div className="muted">
            Writer: {row.wiki.editorName}
            {row.wiki.editorFeeTo ? '' : ` · ${COPY.reservedFees}`}
          </div>
        )}
      </td>
      <td>
        {wikiHref && row.wiki
          ? <a href={wikiHref} onClick={(e) => onNav(e, wikiHref)}>{row.wiki.title}</a>
          : <span className="muted">{official ? 'Official WikiPad token' : '—'}</span>}
        {row.wiki?.qid && <div className="muted">{row.wiki.qid}</div>}
      </td>
      <td>
        <div>{pair} pair</div>
        <div className="muted">Curve {curve}</div>
        <div className="muted">{timeAgoMs(row.launchedAt)}</div>
      </td>
      <td className="links">
        <a href={ponsTokenUrl(ca)} target="_blank" rel="noreferrer">Pons</a>
        {' · '}
        <CopyCa token={row.token} />
        {' · '}
        <a href={gmgnUrl(ca)} target="_blank" rel="noreferrer">GMGN</a>
        {' · '}
        <a href={tokenUrl(ca)} target="_blank" rel="noreferrer">Explorer</a>
      </td>
    </tr>
  )
}

export function MarketTable({ rows, empty }: { rows: TokenRecord[]; empty: string }) {
  if (!rows.length) {
    return <p className="empty">{empty}</p>
  }
  return (
    <table className="wikitable">
      <thead>
        <tr>
          <th>Market</th>
          <th>Page</th>
          <th>Curve / pair</th>
          <th>Links</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => <MarketRow key={row.token} row={row} />)}
      </tbody>
    </table>
  )
}
