import { useState } from 'react'
import { BuildSteps } from '../components/BuildSteps.tsx'
import { ComposerHint } from '../components/ComposerHint.tsx'
import { CustomPanel } from '../components/CustomPanel.tsx'
import { Footer } from '../components/Footer.tsx'
import { Headline } from '../components/Headline.tsx'
import { Nav } from '../components/Nav.tsx'
import { PadLive } from '../components/PadLive.tsx'
import { TemplateGallery } from '../components/TemplateGallery.tsx'
import { XLink } from '../components/XLink.tsx'
import { BRAND } from '../lib/brand.ts'
import { ZERO, type SupportedChain } from '../lib/chain.ts'
import {
  createPacer,
  failAt,
  isBuilding,
  type BuildPhase,
} from '../lib/buildPhase.ts'
import { COPY } from '../lib/copy.ts'
import { CUSTOM_DEFAULT, type CustomSkin } from '../lib/custom.ts'
import { userError } from '../lib/errors.ts'
import { KITS, type KitId } from '../lib/kits.ts'
import { confirmPad, createPadTx } from '../lib/registry.ts'
import { assertSlug } from '../lib/slug.ts'
import { rememberPad } from '../lib/store.ts'
import { tenantUrl } from '../lib/tenant.ts'
import { buildPad, enhancePrompt } from '../lib/write.ts'
import { connectWallet, switchChain, walletClient } from '../lib/wallet.ts'
import { useWallet } from '../hooks/useWallet.ts'

export function Studio() {
  const wallet = useWallet()
  const [prompt, setPrompt] = useState('')
  const [chain, setChain] = useState<SupportedChain>('robinhood')
  const [kit, setKit] = useState<KitId>('pons')
  const [custom, setCustom] = useState<CustomSkin>(CUSTOM_DEFAULT)
  const [phase, setPhase] = useState<BuildPhase>({ kind: 'idle' })
  const [writing, setWriting] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const busy = isBuilding(phase) || phase.kind === 'pending'

  const enhance = async () => {
    const text = prompt.trim()
    if (!text) return
    setErr(null)
    setNote(null)
    setWriting(true)
    try {
      const next = await enhancePrompt(text)
      if (next.prompt === text) {
        setNote('Prompt is already clear.')
      } else {
        setPrompt(next.prompt)
        if (next.source === 'local') setNote('AI is busy right now, so this is the quick rewrite.')
      }
    } catch (e) {
      setErr(userError(e))
    } finally {
      setWriting(false)
    }
  }

  const create = async () => {
    const text = prompt.trim()
    if (!text) {
      setErr('Describe the launchpad.')
      return
    }
    setErr(null)
    setNote(null)
    const pacer = createPacer(setPhase)
    try {
      await pacer.to({ kind: 'reading' })
      const spec = await buildPad(text, kit, chain)
      setKit(spec.kit)
      setChain(spec.chain)
      await pacer.to({ kind: 'naming', spec })
      await pacer.to({ kind: 'template', spec })
      await pacer.to({ kind: 'fees', spec })
      await pacer.to({ kind: 'wallet', spec })
      const clean = assertSlug(spec.slug)
      if (!spec.name.trim()) throw new Error('Describe the launchpad.')
      if (!wallet.account) await connectWallet()
      await switchChain(spec.chain)
      const w = walletClient()
      const account = w.account
      if (!account) throw new Error('Connect a wallet first.')
      const addr = typeof account === 'string' ? account : account.address
      const { hash, status } = await createPadTx(w, addr, {
        chain: spec.chain,
        slug: clean,
        name: spec.name.trim(),
        brandURI: '',
        kit: spec.kit,
        custom: spec.kit === 'custom' ? custom : undefined,
        ownerFeeBps: spec.ownerFeeBps,
        creatorFeeBps: spec.creatorFeeBps,
        launchFeeWei: 0n,
        curveId: spec.curveId,
      }, (sent) => {
        pacer.now({ kind: 'confirming', spec, hash: sent })
      })
      rememberPad({
        slug: clean,
        name: spec.name.trim(),
        chain: spec.chain,
        hash,
        owner: addr,
        kit: spec.kit,
        custom: spec.kit === 'custom' ? custom : undefined,
        ownerFeeBps: spec.ownerFeeBps,
        creatorFeeBps: spec.creatorFeeBps,
        createdAt: Date.now(),
      })
      switch (status) {
        case 'success':
          pacer.now({ kind: 'live', spec, hash, owner: addr })
          return
        case 'pending':
          pacer.now({ kind: 'pending', spec, hash })
          return
        default: {
          const _n: never = status
          return _n
        }
      }
    } catch (e) {
      const msg = userError(e)
      const current = pacer.current()
      if (current.kind === 'confirming' && /Still confirming/i.test(msg)) {
        pacer.now({ kind: 'pending', spec: current.spec, hash: current.hash })
        return
      }
      pacer.now(failAt(current, msg))
      setErr(msg)
    }
  }

  const retryConfirm = async () => {
    if (phase.kind !== 'pending') return
    const spec = phase.spec
    const hash = phase.hash
    setErr(null)
    const pacer = createPacer(setPhase)
    pacer.now({ kind: 'confirming', spec, hash })
    try {
      const outcome = await confirmPad(spec.chain, hash, spec.slug)
      switch (outcome.status) {
        case 'success': {
          const owner = wallet.account
          rememberPad({
            slug: spec.slug,
            name: spec.name.trim(),
            chain: spec.chain,
            hash,
            owner: owner ?? ZERO,
            kit: spec.kit,
            custom: spec.kit === 'custom' ? custom : undefined,
            ownerFeeBps: spec.ownerFeeBps,
            creatorFeeBps: spec.creatorFeeBps,
            createdAt: Date.now(),
          })
          pacer.now({
            kind: 'live',
            spec,
            hash,
            owner: owner ?? ZERO,
          })
          return
        }
        case 'pending':
          pacer.now({ kind: 'pending', spec, hash })
          return
        case 'reverted':
          pacer.now(failAt({ kind: 'confirming', spec, hash }, 'Create pad reverted.'))
          setErr('Create pad reverted.')
          return
        default: {
          const _n: never = outcome.status
          return _n
        }
      }
    } catch (e) {
      const msg = userError(e)
      if (/Still confirming/i.test(msg)) {
        pacer.now({ kind: 'pending', spec, hash })
        return
      }
      pacer.now(failAt({ kind: 'confirming', spec, hash }, msg))
      setErr(msg)
    }
  }

  return (
    <div className="shell product">
      <Nav
        account={wallet.account}
        onConnect={() => connectWallet().catch((e) => setErr(userError(e)))}
      />

      <section className="home">
        <div className="home-copy">
          <img className="home-mascot" src={BRAND.sit} alt="" width={168} height={148} />
          <Headline />
          <form
            className="composer"
            onSubmit={(e) => {
              e.preventDefault()
              void create()
            }}
          >
            <ComposerHint hidden={prompt.trim().length > 0} />
            <textarea
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value)
                setNote(null)
              }}
              placeholder=""
              aria-label="Describe your launchpad"
              rows={3}
              disabled={busy}
            />
            <div className="composer-bar">
              <div className="composer-left">
                <button
                  type="button"
                  className={chain === 'robinhood' ? 'type on rh' : 'type'}
                  onClick={() => setChain('robinhood')}
                >
                  Robinhood
                </button>
                <button
                  type="button"
                  className={chain === 'arc' ? 'type on arc' : 'type'}
                  onClick={() => setChain('arc')}
                >
                  Arc
                </button>
              </div>
              <div className="composer-right">
                <button type="button" className="btn ghost" disabled={writing || busy} onClick={() => void enhance()}>
                  {writing ? '…' : COPY.write}
                </button>
                <button type="submit" className="btn" disabled={busy || writing}>
                  {busy ? 'Creating…' : COPY.launch}
                </button>
              </div>
            </div>
          </form>
          <div className="types" role="list">
            {KITS.map((k) => (
              <button
                key={k.id}
                type="button"
                className={kit === k.id ? 'type on' : 'type'}
                onClick={() => setKit(k.id)}
              >
                {k.name}
              </button>
            ))}
          </div>
          <p className="home-social">
            <XLink />
          </p>
          {phase.kind !== 'idle' && phase.kind !== 'live' && (
            <BuildSteps phase={phase} custom={custom} onRetry={() => void retryConfirm()} />
          )}
          {phase.kind === 'live' && (
            <PadLive
              spec={phase.spec}
              hash={phase.hash}
              url={tenantUrl(phase.spec.slug)}
              custom={custom}
              account={wallet.account}
            />
          )}
          {note && !err && <p className="note" role="status">{note}</p>}
          {err && phase.kind !== 'failed' && <p className="err" role="alert">{err}</p>}
        </div>
      </section>

      <TemplateGallery kit={kit} custom={custom} onPick={setKit} />

      {kit === 'custom' && (
        <CustomPanel value={custom} onChange={setCustom} />
      )}

      <Footer />
    </div>
  )
}
