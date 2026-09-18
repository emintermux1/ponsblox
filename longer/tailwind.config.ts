import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#080c09',
        panel: '#0e1410',
        ink: '#121a14',
        line: '#1e2a22',
        muted: '#7f9486',
        paper: '#e8f3ea',
        accent: '#86d49a',
        danger: '#c45b3e',
        ok: '#76B900',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'IBM Plex Sans', 'Segoe UI', 'sans-serif'],
        mono: ['var(--font-mono)', 'IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        none: 'none',
      },
    },
  },
  plugins: [],
}

export default config
