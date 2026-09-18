export function Spark({
  values,
  label,
}: {
  values: number[]
  label: string
}) {
  if (values.length < 2) {
    return <p className="muted">Not enough indexed points for {label} yet.</p>
  }
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * 100
    const y = 36 - ((v - min) / span) * 32
    return `${x},${y}`
  }).join(' ')
  return (
    <figure className="spark">
      <figcaption>{label}</figcaption>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden>
        <polyline fill="none" stroke="currentColor" strokeWidth="1.4" points={pts} />
      </svg>
    </figure>
  )
}
