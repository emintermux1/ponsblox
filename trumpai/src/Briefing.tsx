import { useEffect, useState, type FormEvent } from 'react'
import {
  INCOMING,
  answerBrief,
  deskLabel,
  type Answer,
  type IncomingBrief,
} from './lore.ts'

type Turn = {
  id: number
  asked: string
  answer: Answer
  shown: number
}

function answerText(answer: Answer) {
  return [answer.headline, answer.position, answer.move, answer.close].join('\n\n')
}

export function Briefing({
  onBrief,
  speaking,
}: {
  onBrief: (line: string) => void
  speaking: boolean
}) {
  const [draft, setDraft] = useState('')
  const [turns, setTurns] = useState<Turn[]>([])
  const [active, setActive] = useState<Turn | null>(null)

  useEffect(() => {
    if (!active) return
    const full = answerText(active.answer)
    if (active.shown >= full.length) return
    const id = window.setInterval(() => {
      setActive((cur) => {
        if (!cur) return cur
        const next = Math.min(answerText(cur.answer).length, cur.shown + 3)
        return { ...cur, shown: next }
      })
    }, 16)
    return () => window.clearInterval(id)
  }, [active])

  function submitLine(line: string) {
    const asked = line.trim()
    if (!asked) return
    const answer = answerBrief(asked)
    const turn: Turn = { id: Date.now(), asked, answer, shown: 0 }
    setActive(turn)
    setTurns((prev) => [turn, ...prev].slice(0, 6))
    setDraft('')
    onBrief(asked)
  }

  function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    submitLine(draft)
  }

  function takeBrief(item: IncomingBrief) {
    submitLine(`${item.title}. ${item.line}`)
  }

  const live = active ? answerText(active.answer).slice(0, active.shown) : ''
  const parts = live.split('\n\n')

  return (
    <section className="brief" id="brief">
      <div className="brief-queue">
        <p className="eyebrow">Talk to T-1 · DJT</p>
        <h2>Briefing desk</h2>
        <p>Put a question on the desk. T-1 listens, pulls memory, locks a position, and speaks it back.</p>
        <ol>
          {INCOMING.map((item) => (
            <li key={item.id}>
              <button type="button" onClick={() => takeBrief(item)}>
                <span>{deskLabel(item.desk)}</span>
                <strong>{item.title}</strong>
                <em>{item.line}</em>
              </button>
            </li>
          ))}
        </ol>
      </div>
      <div className="brief-desk">
        <form onSubmit={onSubmit}>
          <label htmlFor="brief-line">Your brief</label>
          <textarea
            id="brief-line"
            rows={3}
            value={draft}
            onChange={(ev) => setDraft(ev.target.value)}
            placeholder="What do you want decided."
          />
          <button type="submit">Send to T-1</button>
        </form>
        {active ? (
          <article className={speaking ? 'brief-out is-live' : 'brief-out'}>
            <p className="eyebrow">{deskLabel(active.answer.desk)}</p>
            <p className="brief-asked">{active.asked}</p>
            {parts[0] ? <h3>{parts[0]}</h3> : null}
            {parts.slice(1).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </article>
        ) : (
          <article className="brief-out brief-out--empty">
            <p className="eyebrow">Awaiting</p>
            <h3>The desk is open.</h3>
            <p>Choose an incoming brief or write your own. T-1 stays on the desk until you put something in front of it.</p>
          </article>
        )}
        {turns.length > 1 ? (
          <ul className="brief-log">
            {turns.slice(1).map((turn) => (
              <li key={turn.id}>
                <span>{deskLabel(turn.answer.desk)}</span>
                {turn.asked}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  )
}
