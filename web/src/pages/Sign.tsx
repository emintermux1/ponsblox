import { useEffect, useState } from 'react'
import { api, type IntentView } from '../lib/api.ts'
import { failMessage } from '../lib/format.ts'
import { playUrl } from '../lib/play.ts'
import { sendIntentCall } from '../lib/sendCall.ts'
import { useWallet } from '../lib/wallet.tsx'

export function Sign({ code }: { code: string }) {
  const w = useWallet()
  const [intent, setIntent] = useState<IntentView | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    void api.intent(code).then(setIntent).catch((e: Error) => setErr(e.message))
  }, [code])

  async function sign() {
    if (!w.address || !w.walletClient || !intent) return
    setErr(null)
    try {
      if (!w.onRightChain) await w.switchChain()
      const hash = await sendIntentCall(w.walletClient, w.address, intent.call, setBusy)
      setBusy('Waiting…')
      setIntent(await api.confirm(code, hash))
    } catch (e) {
      setErr(failMessage((e as Error).message))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="sign">
      <a className="play play--sm" href={playUrl()}>Back to the game</a>
      <p className="mast__kicker" style={{ marginTop: 28 }}>From the server</p>
      {err && !intent && <p className="err">{err}</p>}
      {!intent && !err && <p>Checking code {code}…</p>}
      {intent && (
        <>
          <h1>{intent.summary}</h1>
          <p>The game sent you out for one confirm. Then you go back in.</p>
          <div className="sign__box">
            <div className="sign__row"><span>Code</span><b>{intent.code}</b></div>
            <div className="sign__row"><span>State</span><b>{intent.status}</b></div>
            <div className="wallet">
              {w.error && <span className="err">{w.error}</span>}
              {w.address && !w.onRightChain && (
                <button type="button" onClick={() => void w.switchChain()}>Switch chain</button>
              )}
              {w.address ? (
                <span>{w.address.slice(0, 6)}…{w.address.slice(-4)}</span>
              ) : w.providers.map((p) => (
                <button key={p.info.rdns} type="button" disabled={w.connecting} onClick={() => void w.connect(p)}>
                  {p.info.name}
                </button>
              ))}
            </div>
            {err && <p className="err">{err}</p>}
            {busy && <p>{busy}</p>}
            {intent.status === 'pending' && (
              <button className="play" type="button" disabled={!w.address || !!busy} onClick={() => void sign()}>
                Confirm
              </button>
            )}
            {intent.status === 'signed' && (
              <>
                <p className="ok">Landed. Get back on the server.</p>
                <a className="play" href={playUrl()}>Play on Roblox</a>
              </>
            )}
            {intent.status === 'expired' && <p className="err">Expired. Do it again in the game.</p>}
          </div>
        </>
      )}
    </div>
  )
}
