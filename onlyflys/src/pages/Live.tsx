import { useState, type FormEvent } from 'react'
import { creatorByHandle, liveCreators } from '../creators.ts'
import { addTip, isSubbed, tipTotal } from '../store.ts'
import { FlyScene } from '../FlyScene.tsx'
import { AppLink } from '../components/AppLink.tsx'
import { NotFound } from './NotFound.tsx'

export function Live({
  handle,
  onSubscribe,
}: {
  handle?: string
  onSubscribe: (handle: string) => void
}) {
  const live = liveCreators()
  const who = handle ? creatorByHandle(handle) : live[0]
  if (handle && !who) return <NotFound />
  if (!who) return <NotFound />

  return (
    <div className="col live-page">
      <Room whoHandle={who.handle} onSubscribe={onSubscribe} />
      <section className="rail">
        <header className="sec">
          <h2>Other bulbs</h2>
        </header>
        <div className="media-grid">
          {live
            .filter((row) => row.handle !== who.handle)
            .map((row) => (
              <AppLink key={row.handle} href={`/live/${row.handle}`} className="media-cell">
                <FlyScene kind={row.scene} seed={`${row.handle}-live`} />
                <span className="live-pill">LIVE</span>
              </AppLink>
            ))}
        </div>
      </section>
    </div>
  )
}

function Room({
  whoHandle,
  onSubscribe,
}: {
  whoHandle: string
  onSubscribe: (handle: string) => void
}) {
  const who = creatorByHandle(whoHandle)
  const [chat, setChat] = useState<string[]>(['a larva just entered the porch', 'someone tipped 5 sugar'])
  const [draft, setDraft] = useState('')
  if (!who) return null

  function send(event: FormEvent) {
    event.preventDefault()
    const text = draft.trim()
    if (!text) return
    setChat((rows) => [...rows, text])
    setDraft('')
  }

  return (
    <section className="room">
      <div className="room-stage">
        <FlyScene kind={who.scene} seed={`${who.handle}-live`} detail="player" />
        <span className="live-pill">LIVE</span>
      </div>
      <div className="room-meta">
        <AppLink href={`/c/${who.handle}`} className="name">
          {who.name}
        </AppLink>
        <p className="muted">@{who.handle} · {who.tag}</p>
        <div className="hero-row">
          <button
            type="button"
            className={isSubbed(who.handle) ? 'btn btn-ghost' : 'btn btn-blue'}
            onClick={() => onSubscribe(who.handle)}
          >
            {isSubbed(who.handle) ? 'Subscribed' : `Subscribe · $${who.price}`}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              addTip(who.handle, 5)
              setChat((rows) => [...rows, 'you tipped 5 sugar'])
            }}
          >
            Tip 5 · {tipTotal(who.handle)} sent
          </button>
        </div>
        <ul className="live-chat">
          {chat.map((line, i) => (
            <li key={`${i}-${line}`}>{line}</li>
          ))}
        </ul>
        <form className="composer" onSubmit={send}>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="chat the swarm…" aria-label="Live chat" />
          <button type="submit" className="btn btn-blue">
            Send
          </button>
        </form>
      </div>
    </section>
  )
}
