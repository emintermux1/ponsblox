'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { usd } from '@/lib/format'
import { stepSeries } from '@/lib/series'

function pathFrom(values: number[], w: number, h: number) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pts = values.map((v, i) => {
    const x = (i / Math.max(1, values.length - 1)) * w
    const y = 18 + (1 - (v - min) / span) * (h - 36)
    return { x, y }
  })
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const area = `${line} L${w} ${h} L0 ${h} Z`
  const last = pts[pts.length - 1]
  return { line, area, last, min, max }
}

export function useLiveSeries(base: number[], live: boolean) {
  const [values, setValues] = useState(base)
  const [el, setEl] = useState<HTMLElement | null>(null)
  const visible = useRef(true)
  const key = `${base.length}:${base[0] ?? 0}:${base[base.length - 1] ?? 0}`

  useEffect(() => {
    setValues(base)
  }, [key, base])

  useEffect(() => {
    if (!el) return
    const io = new IntersectionObserver(([entry]) => {
      visible.current = entry.isIntersecting
    }, { threshold: 0.12 })
    io.observe(el)
    return () => io.disconnect()
  }, [el])

  useEffect(() => {
    if (!live || base.length < 2) return
    const id = window.setInterval(() => {
      if (document.hidden || !visible.current) return
      setValues((prev) => stepSeries(prev, Date.now()))
    }, 900)
    return () => window.clearInterval(id)
  }, [live, key, base.length])

  return { values, setEl }
}

export function Sparkline({ values, className = '' }: { values: number[]; className?: string }) {
  if (values.length < 2) return <div className={className} />
  const w = 160
  const h = 36
  const { line } = pathFrom(values, w, h)
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={`block w-full ${className}`} aria-hidden>
      <path d={line} fill="none" stroke="#86d49a" strokeWidth="1.2" />
    </svg>
  )
}

export function Tape({
  values,
  live = false,
  className = '',
  label,
}: {
  values: number[]
  live?: boolean
  className?: string
  label?: string
}) {
  const frozen = useMemo(() => values, [values])
  const { values: series, setEl } = useLiveSeries(frozen, live)
  const [hover, setHover] = useState<number | null>(null)
  const [intro, setIntro] = useState(true)
  const fillId = useId().replace(/:/g, '')
  const w = 720
  const h = 280

  useEffect(() => {
    const t = window.setTimeout(() => setIntro(false), 950)
    return () => window.clearTimeout(t)
  }, [])

  if (series.length < 2) {
    return (
      <div ref={setEl} className={`grid place-items-center bg-ink text-sm text-muted ${className}`}>
        No tape yet
      </div>
    )
  }

  const { line, area, last, min, max } = pathFrom(series, w, h)
  const lastPx = series[series.length - 1]
  const hi = hover == null ? lastPx : series[Math.min(series.length - 1, hover)]
  const hx = hover == null ? last.x : (hover / Math.max(1, series.length - 1)) * w
  const hy = hover == null ? last.y : 18 + (1 - (hi - min) / (max - min || 1)) * (h - 36)

  return (
    <div ref={setEl} className={`relative bg-ink ${className}`}>
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{label || 'Tape'}</p>
        <p className="font-mono text-[12px] tabular-nums text-accent">{usd(hi)}</p>
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="block h-[240px] w-full sm:h-[280px]"
        aria-hidden
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const box = e.currentTarget.getBoundingClientRect()
          const x = ((e.clientX - box.left) / box.width) * (series.length - 1)
          setHover(Math.max(0, Math.min(series.length - 1, Math.round(x))))
        }}
      >
        {Array.from({ length: 5 }, (_, i) => {
          const y = 18 + i * ((h - 36) / 4)
          return <line key={i} x1="0" y1={y} x2={w} y2={y} stroke="#262522" strokeWidth="1" />
        })}
        <path d={area} className={intro ? 'tape-fill' : undefined} fill={`url(#${fillId})`} />
        <path d={line} className={intro ? 'tape-line' : undefined} fill="none" stroke="#86d49a" strokeWidth="1.6" />
        <line x1="0" y1={last.y} x2={w} y2={last.y} stroke="#86d49a" strokeOpacity="0.25" strokeDasharray="3 5" />
        <circle cx={hx} cy={hy} r="3.2" fill="#86d49a" />
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#86d49a" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#86d49a" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}

export function Spark({ values, className = '' }: { values: number[]; className?: string }) {
  return <Tape values={values} className={className} />
}
