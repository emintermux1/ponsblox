import { useEffect, useState } from 'react'
import { Footer } from '../components/Footer.tsx'
import { Nav } from '../components/Nav.tsx'
import { PadPreview } from '../components/PadPreview.tsx'
import { PulseBoard } from '../components/PulseBoard.tsx'
import { chainFromNumeric, chainLabel, type SupportedChain } from '../lib/chain.ts'
import { userError } from '../lib/errors.ts'
import { customFromBrandURI, kitFromBrandURI } from '../lib/metadata.ts'
import { listPads, type OnchainPad } from '../lib/registry.ts'
import { listRemembered } from '../lib/store.ts'
import { tenantUrl } from '../lib/tenant.ts'
import { connectWallet } from '../lib/wallet.ts'
import { useWallet } from '../hooks/useWallet.ts'

function tokenLine(n: number): string {
  return n === 1 ? '1 token' : `${n} tokens`
}

export function Directory() {
  const wallet = useWallet()
  const [chain, setChain] = useState<SupportedChain>('robinhood')
  const [pads, setPads] = useState<OnchainPad[]>([])
  const [err, setErr] = useState<string | null>(null)
  const local = listRemembered()
  const seen = new Set(pads.map((p) => p.slug))

  useEffect(() => {
    let live = true
    listPads(chain)
      .then((rows) => { if (live) setPads(rows) })
      .catch((e) => { if (live) setErr(userError(e)) })
    return () => { live = false }
  }, [chain])

  return (
    <div className="shell product">
      <Nav
        account={wallet.account}
        onConnect={() => connectWallet().catch((e) => setErr(userError(e)))}
      />
      <h1 className="page-title">Pads</h1>
      <div className="chains">
        <button type="button" className={chain === 'robinhood' ? 'type on rh' : 'type'} onClick={() => setChain('robinhood')}>Robinhood</button>
        <button type="button" className={chain === 'arc' ? 'type on arc' : 'type'} onClick={() => setChain('arc')}>Arc</button>
      </div>
      {err && <p className="err">{err}</p>}
      <div className="board">
        <PulseBoard kit="pons" pads={pads.length + local.filter((p) => p.chain === chain && !seen.has(p.slug)).length} />
        {pads.map((p) => (
          <a key={p.slug} className="board-card" href={tenantUrl(p.slug)}>
            <PadPreview kit={kitFromBrandURI(p.brandURI)} custom={customFromBrandURI(p.brandURI) ?? undefined} name={p.name} compact />
            <strong>{p.name}</strong>
            <span>{p.slug} · {chainLabel(chainFromNumeric(p.chainId))} · {tokenLine(p.tokens.length)}</span>
          </a>
        ))}
        {local.filter((p) => p.chain === chain && !seen.has(p.slug)).map((p) => (
          <a key={p.hash} className="board-card" href={tenantUrl(p.slug)}>
            <PadPreview kit={p.kit || 'pons'} custom={p.custom} name={p.name} compact />
            <strong>{p.name}</strong>
            <span>{p.slug} · {chainLabel(p.chain)} · saved here</span>
          </a>
        ))}
      </div>
      {pads.length === 0 && local.filter((p) => p.chain === chain).length === 0 && <p className="note">No pads on {chainLabel(chain)} yet.</p>}
      <Footer />
    </div>
  )
}
