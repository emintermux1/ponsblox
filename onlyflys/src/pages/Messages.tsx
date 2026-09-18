import { useState, type FormEvent } from 'react'
import { CREATORS, creatorByHandle, formatCount } from '../creators.ts'
import { addTip, chatFor, isSubbed, pushChat, tipTotal, type ChatLine } from '../store.ts'
import { FlyScene } from '../FlyScene.tsx'
import { AppLink } from '../components/AppLink.tsx'
import { NotFound } from './NotFound.tsx'

const TIPS = [1, 5, 20] as const

export function Messages({
  handle,
  onSubscribe,
}: {
  handle?: string
  onSubscribe: (handle: string) => void
}) {
  if (handle) return <Thread handle={handle} onSubscribe={onSubscribe} />

  return (
    <div className="col">
      <header className="page-head">
        <p className="kicker">Messages</p>
        <h1>Hive inbox</h1>
        <p className="muted">Tips are sugar on this device. No card. No chain.</p>
      </header>
      <ul className="inbox">
        {CREATORS.map((who) => (
          <li key={who.handle}>
            <AppLink href={`/messages/${who.handle}`} className="inbox-row">
              <span className="avatar-sm">
                <FlyScene kind={who.scene} seed={`${who.handle}-av`} detail="avatar" />
              </span>
              <span>
                <strong>{who.name}</strong>
                <em className="muted">{who.seed[who.seed.length - 1]?.text ?? 'say hi'}</em>
              </span>
              {isSubbed(who.handle) ? <span className="chip">Sub</span> : null}
            </AppLink>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Thread({
  handle,
  onSubscribe,
}: {
  handle: string
  onSubscribe: (handle: string) => void
}) {
  const who = creatorByHandle(handle)
  const [draft, setDraft] = useState('')
  if (!who) return <NotFound />

  const lines = chatFor(who.handle, who.seed)
  const sugar = tipTotal(who.handle)

  function send(event: FormEvent) {
    event.preventDefault()
    const text = draft.trim()
    if (!text) return
    pushChat(who!.handle, who!.seed, { from: 'me', text })
    setDraft('')
  }

  function tip(n: number) {
    addTip(who!.handle, n)
    const line: ChatLine = { from: 'me', text: `tipped ${n} sugar`, tip: n }
    pushChat(who!.handle, who!.seed, line)
  }

  return (
    <div className="col thread">
      <header className="thread-head">
        <AppLink href="/messages" className="back">
          Inbox
        </AppLink>
        <AppLink href={`/c/${who.handle}`} className="name">
          {who.name}
        </AppLink>
        <span className="muted">@{who.handle}</span>
      </header>
      <div className="thread-body">
        {lines.map((line, i) => (
          <p key={`${i}-${line.text}`} className={line.from === 'me' ? 'bubble me' : 'bubble'}>
            {line.text}
          </p>
        ))}
      </div>
      <div className="tip-row">
        {TIPS.map((n) => (
          <button type="button" key={n} className="chip" onClick={() => tip(n)}>
            Tip {n} sugar
          </button>
        ))}
        <span className="muted">sent {formatCount(sugar)}</span>
      </div>
      {!isSubbed(who.handle) ? (
        <button type="button" className="btn btn-blue" onClick={() => onSubscribe(who.handle)}>
          Subscribe to DM more
        </button>
      ) : null}
      <form className="composer" onSubmit={send}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="buzz a line…"
          aria-label="Message"
        />
        <button type="submit" className="btn btn-blue">
          Send
        </button>
      </form>
    </div>
  )
}
