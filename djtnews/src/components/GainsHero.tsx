const POINTS = '80,210 220,188 360,150 500,164 640,118 860,78'
const SECTORS: { label: string; value: string }[] = [
  { label: 'Technology', value: '128' },
  { label: 'U.S. Equities', value: '121' },
  { label: 'Energy', value: '116' },
  { label: 'Manufacturing', value: '112' },
  { label: 'Digital Assets', value: '109' },
]

export function GainsHero({ variant = 'feature' }: { variant?: 'feature' | 'card' }) {
  return (
    <div className={variant === 'card' ? 'gains-art gains-art-card' : 'gains-art'} aria-hidden={variant === 'card'}>
      <svg viewBox="0 0 960 600" role="img" aria-label="Gains Index 124.18, up 2.41 percent, with sector levels and a January to September sparkline">
        <rect width="960" height="600" fill="#f4f1ea" />
        <rect width="960" height="54" fill="#0c2340" />
        <text x="28" y="35" fill="#efe8d8" fontFamily="Libre Baskerville, Georgia, serif" fontSize="18" fontWeight="700">
          DJT NEWS
        </text>
        <text
          x="932"
          y="35"
          textAnchor="end"
          fill="#d9d1c0"
          fontFamily="Barlow Condensed, Arial Narrow, sans-serif"
          fontSize="14"
          letterSpacing="2"
        >
          MARKETS  ·  SEPT. 17, 2026
        </text>
        <text
          x="28"
          y="96"
          fill="#9b1d2e"
          fontFamily="Barlow Condensed, Arial Narrow, sans-serif"
          fontSize="15"
          fontWeight="700"
          letterSpacing="3"
        >
          THE GAINS INDEX
        </text>
        <text x="28" y="156" fill="#0c2340" fontFamily="Libre Baskerville, Georgia, serif" fontSize="64" fontWeight="700">
          124.18
        </text>
        <text
          x="320"
          y="140"
          fill="#21543a"
          fontFamily="Barlow Condensed, Arial Narrow, sans-serif"
          fontSize="26"
          fontWeight="700"
        >
          ▲ 2.41%
        </text>
        <polyline fill="none" stroke="#0c2340" strokeWidth="4" points={POINTS} />
        <circle cx="80" cy="210" r="5" fill="#0c2340" />
        <circle cx="220" cy="188" r="5" fill="#0c2340" />
        <circle cx="360" cy="150" r="5" fill="#0c2340" />
        <circle cx="500" cy="164" r="5" fill="#0c2340" />
        <circle cx="640" cy="118" r="5" fill="#0c2340" />
        <circle cx="860" cy="78" r="5" fill="#0c2340" />
        <line x1="28" y1="248" x2="932" y2="248" stroke="#c8c2b4" strokeWidth="1" />
        {['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'SEP'].map((label, index) => (
          <text
            key={label}
            x={[80, 220, 360, 500, 640, 860][index]}
            y="274"
            fill="#5c5850"
            fontFamily="Barlow Condensed, Arial Narrow, sans-serif"
            fontSize="13"
            letterSpacing="1.5"
            textAnchor="middle"
          >
            {label}
          </text>
        ))}
        {SECTORS.map((sector, index) => {
          const x = 28 + index * 186
          const width = ((Number(sector.value) - 100) / 30) * 150
          return (
            <g key={sector.label}>
              <text
                x={x}
                y="330"
                fill="#9b1d2e"
                fontFamily="Barlow Condensed, Arial Narrow, sans-serif"
                fontSize="13"
                fontWeight="700"
                letterSpacing="1.2"
              >
                {sector.label.toUpperCase()}
              </text>
              <text x={x} y="372" fill="#0c2340" fontFamily="Libre Baskerville, Georgia, serif" fontSize="28" fontWeight="700">
                {sector.value}
              </text>
              <rect x={x} y="392" width="150" height="8" fill="#ece7db" />
              <rect x={x} y="392" width={width} height="8" fill="#0c2340" />
            </g>
          )
        })}
        <text
          x="28"
          y="450"
          fill="#5c5850"
          fontFamily="Source Sans 3, Helvetica, sans-serif"
          fontSize="13"
        >
          Initial baseline 100. Illustrative composition.
        </text>
        <rect x="28" y="478" width="904" height="90" fill="#fffdf8" stroke="#c8c2b4" />
        <text
          x="48"
          y="516"
          fill="#9b1d2e"
          fontFamily="Barlow Condensed, Arial Narrow, sans-serif"
          fontSize="13"
          fontWeight="700"
          letterSpacing="2"
        >
          SPARKLINE
        </text>
        <text x="48" y="548" fill="#0c2340" fontFamily="Libre Baskerville, Georgia, serif" fontSize="20">
          100 — 104 — 111 — 108 — 117 — 124
        </text>
      </svg>
    </div>
  )
}
