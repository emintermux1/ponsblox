import { isAddress, type Address } from 'viem'
import type { FeeRole, FeeSplit } from '../../lib/gitpad.ts'
import { validateSplits } from '../../lib/gitpad.ts'
import { short } from '../../lib/chain.ts'

const ROWS: { role: FeeRole; label: string; hint: string }[] = [
  { role: 'HOLDERS', label: 'Holders', hint: 'A wallet you designate. Not a Pons holder stream.' },
  { role: 'TREASURY', label: 'Repository Treasury', hint: 'Verified maintainer treasury, or another valid wallet.' },
  { role: 'CREATOR', label: 'Creator', hint: 'Usually the launching wallet.' },
  { role: 'GITPAD', label: 'GitPad', hint: 'Configured GitPad treasury, if set.' },
  { role: 'OTHER', label: 'Other', hint: 'Any extra supported destination.' },
]

export function StudioFees({
  rows,
  onChange,
  treasuryConfigured,
  treasury,
  gitpadTreasury,
  confirm,
  onConfirm,
}: {
  rows: FeeSplit[]
  onChange: (rows: FeeSplit[]) => void
  treasuryConfigured: boolean
  treasury: string
  gitpadTreasury: string
  confirm: boolean
  onConfirm: (v: boolean) => void
}) {
  const err = validateSplits(rows)
  const total = rows.reduce((n, r) => n + r.bps, 0)

  function rowFor(role: FeeRole): FeeSplit | undefined {
    return rows.find((r) => r.role === role)
  }

  function setRole(role: FeeRole, patch: Partial<FeeSplit>) {
    const cur = rowFor(role)
    if (!cur) {
      onChange([...rows, { to: (patch.to || '') as Address, bps: patch.bps ?? 0, role }])
      return
    }
    onChange(rows.map((r) => (r.role === role ? { ...r, ...patch } : r)))
  }

  function status(role: FeeRole, dest: string, bps: number): string {
    if (bps <= 0) return 'OFF'
    if (dest && isAddress(dest)) {
      if (role === 'TREASURY' && !treasuryConfigured) return 'CUSTOM WALLET'
      return 'READY'
    }
    if (role === 'TREASURY' && !treasuryConfigured) return 'NOT CONFIGURED'
    if (role === 'GITPAD' && !gitpadTreasury) return 'NOT CONFIGURED'
    return 'NEEDS WALLET'
  }

  return (
    <div className="sfees">
      <p className="lede">WHERE SHOULD THE FEES GO?</p>
      <p className="muted">
        These rows split Pons creator tax through GitPadFeeRouter.
        Name a wallet for the holders share.
      </p>
      {ROWS.map((meta) => {
        const row = rowFor(meta.role)
        const dest = row?.to || (meta.role === 'TREASURY' ? treasury : meta.role === 'GITPAD' ? gitpadTreasury : '')
        const pct = row ? row.bps / 100 : 0
        return (
          <div className="sfees__row" key={meta.role}>
            <div>
              <strong>{pct}%</strong>
              <span>{meta.label}</span>
              <em>{meta.hint}</em>
            </div>
            <input
              className="field"
              type="number"
              min={0}
              max={100}
              step={1}
              value={pct}
              onChange={(e) => setRole(meta.role, { to: dest as Address, bps: Math.round(Number(e.target.value) * 100) })}
            />
            <input
              className="field"
              value={dest}
              placeholder="0x…"
              onChange={(e) => setRole(meta.role, { to: e.target.value as Address, bps: row?.bps ?? 0 })}
            />
            <b className={status(meta.role, dest, row?.bps ?? 0) === 'READY' ? 'ok' : 'muted'}>{status(meta.role, dest, row?.bps ?? 0)}</b>
          </div>
        )
      })}
      <p className={total === 10_000 ? 'ok' : 'err'}>TOTAL {total / 100}%</p>
      {err && <p className="err">{err}</p>}
      {!treasuryConfigured && (
        <p className="err">Repository Treasury is not verified. Pick another valid destination or claim the repo first.</p>
      )}
      <p className="muted">Creator tax is locked after launch. Router splits can change later if the router is the recipient.</p>
      <label className="check">
        <input type="checkbox" checked={confirm} onChange={(e) => onConfirm(e.target.checked)} disabled={Boolean(err)} />
        I confirm these destinations sum to 100% and are wallets I control or intend.
      </label>
      {treasuryConfigured && treasury && (
        <p className="mono">Verified treasury {short(treasury, 4)}</p>
      )}
    </div>
  )
}
