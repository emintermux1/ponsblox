import type { BoardRow, IndexBarRow } from '../article.ts'

function ModuleCaption({ caption, credit }: { caption: string; credit?: string }) {
  return (
    <figcaption>
      {caption}
      {credit ? <span className="credit"> {credit}</span> : null}
    </figcaption>
  )
}

export function KnowBox({ heading, items }: { heading: string; items: string[] }) {
  return (
    <aside className="mod know" aria-label={heading}>
      <p className="mod-kicker">{heading}</p>
      <ul className="know-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </aside>
  )
}

export function IndexBars({
  kicker,
  heading,
  caption,
  credit,
  baseline,
  rows,
}: {
  kicker: string
  heading: string
  caption: string
  credit?: string
  baseline: number
  rows: IndexBarRow[]
}) {
  const max = Math.max(baseline, ...rows.map((row) => row.value))
  const min = Math.min(baseline, ...rows.map((row) => row.value))
  const floor = Math.max(0, min - 8)
  const span = max - floor || 1

  return (
    <figure className="mod chart">
      <p className="mod-kicker">{kicker}</p>
      <h3 className="mod-hed">{heading}</h3>
      <ol className="bar-list">
        {rows.map((row) => {
          const width = ((row.value - floor) / span) * 100
          const mark = ((baseline - floor) / span) * 100
          return (
            <li className="bar-row" key={row.label}>
              <span className="bar-label">{row.label}</span>
              <span className="bar-track">
                <span className="bar-fill" style={{ width: `${width}%` }} />
                <span className="bar-base" style={{ left: `${mark}%` }} title={`Baseline ${baseline}`} />
              </span>
              <span className="bar-val">{row.value}</span>
            </li>
          )
        })}
      </ol>
      <p className="mod-note">Bars show index levels against a baseline of {baseline}.</p>
      <ModuleCaption caption={caption} credit={credit} />
    </figure>
  )
}

function sparkPath(points: number[], width: number, height: number, pad: number) {
  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = max - min || 1
  const innerW = width - pad * 2
  const innerH = height - pad * 2
  return points
    .map((point, index) => {
      const x = pad + (index / (points.length - 1)) * innerW
      const y = pad + (1 - (point - min) / span) * innerH
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
}

function sparkArea(points: number[], width: number, height: number, pad: number) {
  const line = sparkPath(points, width, height, pad)
  const lastX = width - pad
  return `${line} L${lastX.toFixed(1)} ${height - pad} L${pad} ${height - pad} Z`
}

export function SparkPreview({
  kicker,
  heading,
  value,
  change,
  fromBaseline,
  points,
  labels,
  caption,
  credit,
}: {
  kicker: string
  heading: string
  value: string
  change: string
  fromBaseline: string
  points: number[]
  labels: string[]
  caption: string
  credit?: string
}) {
  const width = 640
  const height = 168
  const pad = 10
  const line = sparkPath(points, width, height, pad)
  const area = sparkArea(points, width, height, pad)

  return (
    <figure className="mod chart spark">
      <p className="mod-kicker">{kicker}</p>
      <h3 className="mod-hed">{heading}</h3>
      <div className="spark-readout">
        <p className="spark-val">{value}</p>
        <p className="spark-chg">
          <span aria-hidden="true">▲ </span>
          {change}
        </p>
      </div>
      <svg
        className="spark-svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Gains Index path from ${points[0]} to ${points[points.length - 1]}`}
      >
        <path d={area} fill="#0c2340" fillOpacity="0.08" />
        <path d={line} fill="none" stroke="#0c2340" strokeWidth="3.2" strokeLinejoin="round" />
        {points.map((point, index) => {
          const min = Math.min(...points)
          const max = Math.max(...points)
          const span = max - min || 1
          const x = pad + (index / (points.length - 1)) * (width - pad * 2)
          const y = pad + (1 - (point - min) / span) * (height - pad * 2)
          return <circle key={`${point}-${index}`} cx={x} cy={y} r="3.6" fill="#0c2340" />
        })}
      </svg>
      <p className="spark-months">
        {labels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </p>
      <p className="spark-foot">
        <span aria-hidden="true">▲ </span>
        {fromBaseline}
      </p>
      <ModuleCaption caption={caption} credit={credit} />
    </figure>
  )
}

export function GainsBoard({
  kicker,
  heading,
  caption,
  credit,
  rows,
}: {
  kicker: string
  heading: string
  caption: string
  credit?: string
  rows: BoardRow[]
}) {
  return (
    <figure className="mod chart board">
      <p className="mod-kicker">{kicker}</p>
      <h3 className="mod-hed">{heading}</h3>
      <p className="board-note">Illustrative</p>
      <table className="board-table">
        <caption className="sr-only">{heading}</caption>
        <thead>
          <tr>
            <th scope="col">Component</th>
            <th scope="col">Level</th>
            <th scope="col">Change</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.label} className={index === 0 ? 'board-lead' : undefined}>
              <th scope="row">{row.label}</th>
              <td>{row.value}</td>
              <td className="board-up">
                <span aria-hidden="true">▲ </span>
                {row.change}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ModuleCaption caption={caption} credit={credit} />
    </figure>
  )
}
