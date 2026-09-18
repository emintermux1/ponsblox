export function StudioProgress<T extends string>({
  steps,
  current,
  onJump,
}: {
  steps: { id: T; label: string }[]
  current: T
  onJump: (id: T) => void
}) {
  const idx = steps.findIndex((s) => s.id === current)
  const pct = steps.length <= 1 ? 100 : Math.max(8, ((idx + 1) / steps.length) * 100)
  return (
    <div className="studio__progress">
      <ol className="studio__steps">
        {steps.map((s, i) => (
          <li key={s.id} className={s.id === current ? 'is-on' : i < idx ? 'is-done' : ''}>
            <button type="button" onClick={() => onJump(s.id)} disabled={i > idx}>
              {s.label}
            </button>
          </li>
        ))}
      </ol>
      <div className="studio__rail" aria-hidden>
        <i style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
