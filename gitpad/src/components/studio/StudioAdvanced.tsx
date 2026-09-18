import { feeRouterLive } from '../../lib/gitpad.ts'

export function StudioAdvanced({
  open,
  onOpen,
  metaUri,
  onMetaUri,
  quoteIn,
  onQuoteIn,
  minOut,
  onMinOut,
  buyback,
  onBuyback,
  treasury,
  onTreasury,
  gasNote,
}: {
  open: boolean
  onOpen: (v: boolean) => void
  metaUri: string
  onMetaUri: (v: string) => void
  quoteIn: string
  onQuoteIn: (v: string) => void
  minOut: string
  onMinOut: (v: string) => void
  buyback: boolean
  onBuyback: (v: boolean) => void
  treasury: string
  onTreasury: (v: string) => void
  gasNote: string
}) {
  const router = feeRouterLive()
  return (
    <details className="sadv" open={open} onToggle={(e) => onOpen((e.target as HTMLDetailsElement).open)}>
      <summary>ADVANCED</summary>
      <p className="muted">Default launches do not need this. Unsupported factory and gas writes are hidden.</p>
      <label>
        Metadata URI
        <input className="field" value={metaUri} onChange={(e) => onMetaUri(e.target.value)} placeholder="ipfs://… or https://…" />
      </label>
      <p className="muted">Paste a confirmed Pinata URI or an ipfs:// CID.</p>
      <label>
        Optional first buy (ETH)
        <input className="field" value={quoteIn} onChange={(e) => onQuoteIn(e.target.value)} />
      </label>
      {quoteIn.trim() ? (
        <label>
          Min tokens out
          <input className="field" value={minOut} onChange={(e) => onMinOut(e.target.value)} placeholder="0 = accept Pons output" />
        </label>
      ) : (
        <p className="muted">Min-out is hidden until a first buy is set. It maps to launchAndBuy’s documented minAmountOut.</p>
      )}
      <label className="check">
        <input type="checkbox" checked={buyback} onChange={(e) => onBuyback(e.target.checked)} />
        Enable documented Pons buyback
      </label>
      {router ? (
        <label>
          Custom treasury wallet
          <input className="field" value={treasury} onChange={(e) => onTreasury(e.target.value)} placeholder="0x…" />
        </label>
      ) : (
        <p className="muted">Custom treasury is hidden — GitPadFeeRouter is not deployed.</p>
      )}
      <p className="mono">{gasNote}</p>
      <p className="muted">Factory configuration and custom gas parameters are not exposed. GitPad uses the live Pons config and the wallet’s gas estimate.</p>
    </details>
  )
}
