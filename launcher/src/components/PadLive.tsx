import { useEffect, useState, type ReactNode } from 'react'
import { chainLabel, explorerTx, type SupportedChain } from '../lib/chain.ts'
import type { CustomSkin } from '../lib/custom.ts'
import { connectDomain, domainError, domainMessage, domainStatus, type DomainStatus } from '../lib/domain.ts'
import { userError } from '../lib/errors.ts'
import { bpsToPct } from '../lib/fee.ts'
import { kitById } from '../lib/kits.ts'
import { tweetIntent } from '../lib/social.ts'
import { walletClient } from '../lib/wallet.ts'
import type { PadBuild } from '../lib/write.ts'
import { PadPreview } from './PadPreview.tsx'

type SettingId = 'domain' | 'fees' | 'share' | 'template'

const SETTINGS: { id: SettingId; name: string }[] = [
  { id: 'domain', name: 'Domain' },
  { id: 'fees', name: 'Fees' },
  { id: 'share', name: 'Share' },
  { id: 'template', name: 'Template' },
]

function useCopy(): [copied: boolean, copy: (text: string) => void] {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1600)
    return () => clearTimeout(t)
  }, [copied])
  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).then(() => setCopied(true)).catch(() => setCopied(false))
  }
  return [copied, copy]
}

function Records({ status }: { status: DomainStatus }) {
  return (
    <div className="dns">
      <p className="note">
        {status.configured && status.verified
          ? 'DNS is set. Your domain serves this pad.'
          : 'Add these records at your DNS provider, then check again.'}
      </p>
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Name</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {status.records.map((r) => (
            <tr key={`${r.type}:${r.name}:${r.value}`}>
              <td>{r.type}</td>
              <td><code>{r.name}</code></td>
              <td><code>{r.value}</code></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DomainSetting({ spec, account }: { spec: PadBuild; account: `0x${string}` | null }) {
  const [open, setOpen] = useState(false)
  const [domain, setDomain] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [status, setStatus] = useState<DomainStatus | null>(null)
  const check = domain.trim() ? domainError(domain) : null

  const connect = async () => {
    setErr(null)
    const bad = domainError(domain)
    if (bad) {
      setErr(domainMessage(bad))
      return
    }
    setBusy(true)
    try {
      const w = walletClient()
      const who = account ?? (typeof w.account === 'string' ? w.account : w.account?.address ?? null)
      if (!who) throw new Error('Connect a wallet first.')
      setStatus(await connectDomain(w, who, { slug: spec.slug, domain, chain: spec.chain }))
    } catch (e) {
      setErr(userError(e))
    } finally {
      setBusy(false)
    }
  }

  const recheck = async () => {
    if (!status) return
    setErr(null)
    setBusy(true)
    try {
      setStatus(await domainStatus(status.domain))
    } catch (e) {
      setErr(userError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="setting-body">
      <div className="setting-row">
        <code>{spec.slug}.launcher.family</code>
        <span className="pill ok">Live</span>
      </div>
      {!open && !status && (
        <button type="button" className="btn ghost small" onClick={() => setOpen(true)}>
          Connect your own domain
        </button>
      )}
      {(open || status) && (
        <form
          className="domain-form"
          onSubmit={(e) => {
            e.preventDefault()
            void connect()
          }}
        >
          <input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="pad.example.com"
            aria-label="Your domain"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            disabled={busy}
          />
          <button type="submit" className="btn small" disabled={busy || Boolean(check) || !domain.trim()}>
            {busy ? '…' : status ? 'Connect another' : 'Connect'}
          </button>
        </form>
      )}
      {check && !err && <p className="note">{domainMessage(check)}</p>}
      {!status && open && !check && (
        <p className="note">You sign a message with the pad owner wallet. No transaction, no gas.</p>
      )}
      {status && (
        <>
          <div className="setting-row">
            <code>{status.domain}</code>
            <span className={status.configured && status.verified ? 'pill ok' : 'pill'}>
              {status.configured && status.verified ? 'Connected' : 'Pending DNS'}
            </span>
          </div>
          <Records status={status} />
          <button type="button" className="btn ghost small" disabled={busy} onClick={() => void recheck()}>
            {busy ? '…' : 'Check DNS'}
          </button>
        </>
      )}
      {err && <p className="err" role="alert">{err}</p>}
    </div>
  )
}

function FeesSetting({ spec }: { spec: PadBuild }) {
  return (
    <div className="setting-body">
      <dl className="facts">
        <div>
          <dt>Owner fee</dt>
          <dd>{bpsToPct(spec.ownerFeeBps)}%</dd>
        </div>
        <div>
          <dt>Creator tax</dt>
          <dd>{bpsToPct(spec.creatorFeeBps)}%</dd>
        </div>
      </dl>
      <p className="note">Fees are written on-chain at creation and cannot be changed for this pad.</p>
    </div>
  )
}

function ShareSetting({ spec, url }: { spec: PadBuild; url: string }) {
  const [copied, copy] = useCopy()
  const text = `${spec.name} ($${spec.ticker}) is live on ${chainLabel(spec.chain)}.`
  const intent = tweetIntent(text, url)
  return (
    <div className="setting-body">
      <div className="setting-row">
        <code>{url}</code>
        <button type="button" className="btn ghost small" onClick={() => copy(url)}>
          {copied ? 'Copied' : 'Copy link'}
        </button>
      </div>
      <a className="btn ghost small" href={intent} target="_blank" rel="noopener noreferrer">
        Open on X
      </a>
    </div>
  )
}

function TemplateSetting({ spec, custom }: { spec: PadBuild; custom?: CustomSkin }) {
  const kit = kitById(spec.kit)
  return (
    <div className="setting-body setting-template">
      <PadPreview kit={spec.kit} custom={custom} name={spec.name} compact />
      <div>
        <strong>{kit.name}</strong>
        <p className="note">
          {spec.kit === 'custom' ? 'Your own colors and type.' : `Copies the ${kit.line} create flow.`}
        </p>
      </div>
    </div>
  )
}

export function PadLive(props: {
  spec: PadBuild
  hash: `0x${string}`
  url: string
  custom?: CustomSkin
  account: `0x${string}` | null
}) {
  const { spec, url } = props
  const [copied, copy] = useCopy()
  const [tab, setTab] = useState<SettingId>('domain')
  const chain: SupportedChain = spec.chain

  let body: ReactNode
  switch (tab) {
    case 'domain':
      body = <DomainSetting spec={spec} account={props.account} />
      break
    case 'fees':
      body = <FeesSetting spec={spec} />
      break
    case 'share':
      body = <ShareSetting spec={spec} url={url} />
      break
    case 'template':
      body = <TemplateSetting spec={spec} custom={props.custom} />
      break
    default: {
      const _n: never = tab
      body = _n
    }
  }

  return (
    <section className="live-pad enter" aria-live="polite">
      <div className="live-hero">
        <PadPreview kit={spec.kit} custom={props.custom} name={spec.name} />
      </div>
      <div className="live-head">
        <div>
          <h2>{spec.name}</h2>
          <p className="live-meta">
            <span>${spec.ticker}</span>
            <span className={`pill chain ${chain}`}>{chainLabel(chain)}</span>
            <span className="pill ok">Live</span>
          </p>
        </div>
        <div className="live-actions">
          <a className="btn" href={url} target="_blank" rel="noreferrer">Open pad</a>
          <a className="btn ghost" href={explorerTx(chain, props.hash)} target="_blank" rel="noreferrer">Explorer</a>
        </div>
      </div>
      <div className="live-url">
        <a href={url} target="_blank" rel="noreferrer">{url}</a>
        <button type="button" className="btn ghost small" onClick={() => copy(url)}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="settings">
        <div className="settings-tabs" role="tablist" aria-label="Settings">
          {SETTINGS.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={tab === s.id}
              className={tab === s.id ? 'type on' : 'type'}
              onClick={() => setTab(s.id)}
            >
              {s.name}
            </button>
          ))}
        </div>
        <div className="settings-panel" role="tabpanel">{body}</div>
      </div>
    </section>
  )
}
