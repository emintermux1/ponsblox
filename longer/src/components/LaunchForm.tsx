'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useAccount, useSwitchChain, useWalletClient } from 'wagmi'
import { ASSETS, pairTicker, tokenPairLabel } from '@/lib/assets'
import { robinhood } from '@/lib/chain'
import {
  getSupported3XAssets,
  launchBlockFor,
  launchButtonLabel,
  launchToken,
  type AssetWithPons,
  type LaunchDraft,
} from '@/lib/pons'
import { precheckImageFile } from '@/lib/imageFile'
import { uploadFile } from '@/lib/ipfs'
import { byLongerName } from '@/lib/naming'
import { isPublicImage, publicTokenImage, SITE_URL, X_HANDLE, X_URL, shareIntentUrl } from '@/lib/official'
import { launchableAssets } from '@/lib/pairMeta'
import { saveRecent } from '@/lib/recent'
import { previewTape, seedAssets } from '@/lib/preview'
import { AssetMark } from './AssetMark'
import { CopyAddr } from './CopyAddr'
import { ImagePick } from './ImagePick'
import { InstrumentCard } from './InstrumentCard'
import { PageEnter } from './PageEnter'
import { TokenMark } from './TokenMark'

export function LaunchForm() {
  const { address, chainId, isConnected } = useAccount()
  const { switchChain } = useSwitchChain()
  const { data: wallet } = useWalletClient()
  const onRightChain = chainId === robinhood.id

  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [description, setDescription] = useState('')
  const [twitter, setTwitter] = useState('')
  const [telegram, setTelegram] = useState('')
  const [website, setWebsite] = useState('')
  const [logo, setLogo] = useState('')
  const [preview, setPreview] = useState('/logo')
  const [fileName, setFileName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [pairId, setPairId] = useState<LaunchDraft['pairId']>('NVDA3X')
  const [quoteIn, setQuoteIn] = useState('')
  const [advanced, setAdvanced] = useState(false)
  const [recipient, setRecipient] = useState('')
  const [assets, setAssets] = useState<AssetWithPons[]>(seedAssets)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState<{ symbol: string; pair: string; token: string } | null>(null)

  useEffect(() => {
    void getSupported3XAssets().then(setAssets).catch(() => setAssets(seedAssets()))
  }, [])

  const choices = launchableAssets(assets.length ? assets : ASSETS)
  const asset = choices.find((a) => a.id === pairId) ?? choices[0] ?? ASSETS.find((a) => a.id === 'NVDA3X')
  const ticker = symbol.trim().toUpperCase()
  const shownName = byLongerName(name) || 'by LONGER'
  const pairName = asset ? pairTicker(asset) : 'NVDA 3X'
  const draft: LaunchDraft = {
    name,
    symbol,
    logo: isPublicImage(logo) ? logo : '',
    description,
    website,
    twitter,
    telegram,
    pairId: 'NVDA3X',
    quoteIn,
    recipient: recipient as LaunchDraft['recipient'],
  }
  const block = launchBlockFor({
    connected: isConnected,
    onRightChain,
    draft,
    asset,
    factoryEnabled: true,
  })
  const label = launchButtonLabel(block, ticker, pairName)
  const ready = block.kind === 'ready'

  const selectedCopy = useMemo(() => {
    if (!asset || !ticker) return null
    return `Your token ${tokenPairLabel(ticker, asset)}`
  }, [asset, ticker])

  function onImage(next: File | null) {
    if (preview.startsWith('blob:')) URL.revokeObjectURL(preview)
    if (!next) {
      setFileName('')
      setFile(null)
      setPreview(isPublicImage(logo) ? logo : '/logo')
      return
    }
    const early = precheckImageFile(next)
    if (early) {
      setErr(early)
      return
    }
    setErr(null)
    setFileName(next.name)
    setFile(next)
    setPreview(URL.createObjectURL(next))
    setUploading(true)
    void uploadFile(next)
      .then((pin) => {
        if (pin.gateway) setLogo(pin.gateway)
      })
      .catch(() => {
        /* launch will retry or use default LONGER art */
      })
      .finally(() => setUploading(false))
  }

  async function resolveLogo(): Promise<string> {
    if (file) {
      try {
        const pin = await uploadFile(file)
        if (pin.gateway && isPublicImage(pin.gateway)) return pin.gateway
      } catch {
        /* default LONGER art */
      }
    }
    return publicTokenImage(logo)
  }

  async function onLaunch() {
    setErr(null)
    if (block.kind === 'wrong_chain') {
      switchChain({ chainId: robinhood.id })
      return
    }
    if (!ready || !wallet || !address) return
    setBusy(true)
    try {
      const image = await resolveLogo()
      const liveDraft: LaunchDraft = { ...draft, logo: image, pairId: 'NVDA3X' }
      const receipt = await launchToken(wallet, address, liveDraft)
      saveRecent({
        token: receipt.token,
        pairId: 'NVDA3X',
        symbol: ticker,
        name: byLongerName(name),
        logo: image,
        at: Date.now(),
      })
      setDone({
        symbol: ticker,
        pair: pairName,
        token: receipt.token,
      })
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <PageEnter>
        <section className="mx-auto max-w-[640px] border border-line bg-panel p-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent">Live</p>
          <h1 className="mt-3 text-[26px] font-medium text-paper">
            {byLongerName(done.symbol)} is live. Paired with {done.pair}
          </h1>
          <p className="mt-4">
            <CopyAddr address={done.token} />
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Link href={`/token/${done.token}`} className="btn btn-accent btn-lg">
              View Token
            </Link>
            <a
              href={shareIntentUrl(`${done.symbol} is live on LONGER · ${SITE_URL}/token/${done.token} ${X_HANDLE}`)}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-[12px] text-muted transition-colors hover:text-paper"
            >
              Share {X_HANDLE}
            </a>
          </div>
        </section>
      </PageEnter>
    )
  }

  return (
    <>
    <PageEnter>
    <div className="mx-auto grid max-w-[1100px] gap-6 lg:grid-cols-[1fr_300px]">
      <section className="border border-line bg-panel lg:order-none">
        <div className="h-px bg-accent/70" />
        <div className="p-4 sm:p-6">
        <h1 className="text-[24px] font-medium tracking-tight text-paper">Launch on LONGER</h1>
        <p className="mt-1 text-[14px] text-muted">Create a Pons token paired with a 3X asset.</p>

        <div className="mt-5 grid gap-3">
          <label className="field">
            <span>Image</span>
            <div className="flex items-center gap-3">
              <TokenMark symbol={ticker || 'TK'} logo={preview || logo || '/logo'} size="lg" />
              <ImagePick fileName={fileName} onFile={onImage} />
            </div>
            {uploading && <p className="mt-1 text-[12px] text-muted">Uploading image…</p>}
            <input
              className="input mt-2"
              placeholder="Or logo URL (https:// or ipfs://)"
              value={logo}
              onChange={(e) => {
                const v = e.target.value
                setLogo(v)
                setFile(null)
                setFileName('')
                setPreview(v.trim() || '/logo')
              }}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="field">
              <span>Name</span>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Zuck Inu" />
              <span className="mt-1 block normal-case tracking-normal text-muted">{shownName}</span>
            </label>
            <label className="field">
              <span>Ticker</span>
              <input
                className="input uppercase"
                value={symbol}
                maxLength={11}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="ZUCK"
              />
            </label>
          </div>
          <label className="field">
            <span>Description</span>
            <textarea className="input min-h-[88px]" value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="field">
              <span>X</span>
              <input className="input" value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder={X_URL} />
            </label>
            <label className="field">
              <span>Telegram</span>
              <input className="input" value={telegram} onChange={(e) => setTelegram(e.target.value)} placeholder="https://t.me/…" />
            </label>
            <label className="field">
              <span>Website</span>
              <input className="input" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />
            </label>
          </div>
        </div>

        <div className="mt-6">
          <h2 className="text-[13px] font-medium tracking-[0.16em] text-muted">CHOOSE YOUR 3X PAIR</h2>
          {selectedCopy && <p className="mt-2 text-sm text-paper">{selectedCopy}</p>}
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {choices.map((a) => (
              <InstrumentCard
                key={a.id}
                asset={a}
                selected={a.id === (asset?.id ?? pairId)}
                onSelect={() => setPairId(a.id)}
                spark={previewTape(a.id)}
              />
            ))}
          </div>
        </div>

        <label className="field mt-6">
          <span>Developer buy <em className="not-italic text-muted">(optional)</em></span>
          <input
            className="input"
            value={quoteIn}
            onChange={(e) => setQuoteIn(e.target.value)}
            placeholder={asset ? `Amount in ${asset.leveragedSymbol}` : 'Amount'}
          />
        </label>

        <button type="button" className="mt-4 text-[12px] text-muted hover:text-paper" onClick={() => setAdvanced((v) => !v)}>
          {advanced ? 'Hide advanced' : 'Advanced'}
        </button>
        {advanced && (
          <label className="field mt-3">
            <span>Creator wallet</span>
            <input
              className="input font-mono"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder={address || '0x…'}
            />
          </label>
        )}
        </div>
      </section>

      <aside className="order-first h-fit border border-line bg-panel lg:order-none">
        <div className="h-px bg-accent/70" />
        <div className="p-4">
        <h2 className="text-[13px] font-medium tracking-[0.16em] text-muted">SUMMARY</h2>
        <dl className="mt-3 space-y-2 text-[13px]">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Token</dt>
            <dd className="text-paper">{name ? shownName : '—'}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Ticker</dt>
            <dd className="font-mono text-paper">{ticker || '—'}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Pair</dt>
            <dd className="inline-flex min-w-0 items-center gap-1.5 text-paper">
              {asset && <AssetMark asset={asset} size="xs" />}
              <span className="truncate">{ticker ? tokenPairLabel(ticker, asset ?? ASSETS[0]) : pairName}</span>
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Network</dt>
            <dd className="text-paper">Robinhood Chain</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Launch via</dt>
            <dd className="text-paper">Pons</dd>
          </div>
        </dl>
        <button
          type="button"
          className="btn btn-accent btn-lg mt-5 hidden w-full lg:inline-flex"
          disabled={!ready || busy}
          onClick={() => void onLaunch()}
        >
          {busy ? 'Waiting for wallet…' : label}
        </button>
        {err && <p className="mt-3 hidden text-[12px] text-danger lg:block">{err}</p>}
        </div>
      </aside>
    </div>
    </PageEnter>
    <div className="launch-dock lg:hidden">
      <p className="mb-2 truncate text-[12px] text-muted">
        {ticker || 'Token'} · {ticker && asset ? tokenPairLabel(ticker, asset) : pairName} · Robinhood
      </p>
      {err && <p className="mb-2 text-[12px] text-danger">{err}</p>}
      <button
        type="button"
        className="btn btn-accent btn-lg w-full"
        disabled={!ready || busy}
        onClick={() => void onLaunch()}
      >
        {busy ? 'Waiting for wallet…' : label}
      </button>
    </div>
    </>
  )
}
