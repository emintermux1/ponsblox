import { candleSeries } from '../lib/chart.ts'

export function TokenChart({ id }: { id: string }) {
  const candles = candleSeries(id, 56)
  const w = 640
  const h = 320
  const pad = 8
  const min = Math.min(...candles.map((c) => c.l))
  const max = Math.max(...candles.map((c) => c.h))
  const span = max - min || 1
  const slot = (w - pad * 2) / candles.length
  const y = (v: number) => pad + (1 - (v - min) / span) * (h - pad * 2)

  return (
    <figure className="tchart">
      <figcaption>Catalog tape · seeded from {id.toUpperCase()} · not a live book</figcaption>
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Price chart">
        {[0, 0.25, 0.5, 0.75, 1].map((g) => (
          <line key={g} className="tchart__grid" x1={0} x2={w} y1={pad + g * (h - pad * 2)} y2={pad + g * (h - pad * 2)} />
        ))}
        {candles.map((c, i) => {
          const x = pad + i * slot + slot / 2
          const up = c.c >= c.o
          return (
            <g key={i} className={up ? 'tchart__up' : 'tchart__dn'}>
              <line x1={x} x2={x} y1={y(c.h)} y2={y(c.l)} />
              <rect
                x={x - Math.max(1.2, slot * 0.28)}
                y={y(Math.max(c.o, c.c))}
                width={Math.max(2.4, slot * 0.56)}
                height={Math.max(1.2, Math.abs(y(c.o) - y(c.c)))}
              />
            </g>
          )
        })}
      </svg>
    </figure>
  )
}
