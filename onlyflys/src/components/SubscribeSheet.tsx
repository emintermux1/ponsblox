import { creatorByHandle } from '../creators.ts'
import { subscribeTo } from '../store.ts'

export function SubscribeSheet({
  handle,
  onClose,
}: {
  handle: string
  onClose: () => void
}) {
  const who = creatorByHandle(handle)
  if (!who) return null

  function confirm() {
    subscribeTo(handle)
    onClose()
  }

  return (
    <div className="sheet" role="dialog" aria-label="Subscribe">
      <button type="button" className="sheet-dim" aria-label="Close" onClick={onClose} />
      <div className="sheet-card">
        <p className="kicker">Subscribe</p>
        <h2>{who.name}</h2>
        <p className="muted">@{who.handle} · {who.tag}</p>
        <p className="sheet-price">
          <strong>${who.price}</strong>
          <span> / month of sugar</span>
        </p>
        <ul className="sheet-perks">
          <li>Full scenes. No blur on the pile.</li>
          <li>DMs in the hive. Tips stay local.</li>
          <li>No card. No chain. Just unlock on this device.</li>
        </ul>
        <button type="button" className="btn btn-blue" onClick={confirm}>
          Unlock with sugar
        </button>
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Not now
        </button>
      </div>
    </div>
  )
}
