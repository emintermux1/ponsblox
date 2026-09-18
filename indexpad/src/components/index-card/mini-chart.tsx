type MiniChartProps = {
  values?: number[] | null
  up: boolean
}

export function MiniChart({ values, up }: MiniChartProps) {
  if (!values || values.length < 2) {
    return (
      <div className="flex h-14 items-end" aria-hidden>
        <svg viewBox="0 0 160 56" className="h-14 w-full">
          <line
            x1="0"
            y1="40"
            x2="160"
            y2="40"
            stroke="currentColor"
            strokeDasharray="3 5"
            strokeWidth="1"
            className="text-white/15"
          />
        </svg>
      </div>
    )
  }

  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const points = values
    .map((value, i) => {
      const x = (i / (values.length - 1)) * 160
      const y = 48 - ((value - min) / span) * 36
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
  const first = values[0]
  const last = values[values.length - 1]
  const rising = last >= first
  const stroke = (up && rising) || (!up && !rising)
    ? 'stroke-emerald-300/90'
    : 'stroke-rose-300/80'
  const fill = (up && rising) || (!up && !rising)
    ? 'fill-emerald-300/10'
    : 'fill-rose-300/10'
  const area = `0,56 ${points} 160,56`

  return (
    <div className="h-14" aria-hidden>
      <svg viewBox="0 0 160 56" className="h-14 w-full overflow-visible">
        <polygon points={area} className={fill} />
        <polyline
          points={points}
          fill="none"
          strokeWidth="1.6"
          strokeLinejoin="round"
          strokeLinecap="round"
          className={stroke}
        />
      </svg>
    </div>
  )
}
