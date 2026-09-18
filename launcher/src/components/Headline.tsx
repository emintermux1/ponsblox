import { HEADLINES } from '../lib/copy.ts'
import { useRotate } from '../hooks/useRotate.ts'

export function Headline() {
  const { i, out } = useRotate(HEADLINES.length)
  return (
    <h1 className={out ? 'headline out' : 'headline'} aria-live="polite">
      {HEADLINES[i].split(' ').map((word, k, all) => (
        <span key={`${i}-${k}`} style={{ animationDelay: `${k * 38}ms` }}>
          {word}{k < all.length - 1 ? '\u00A0' : ''}
        </span>
      ))}
    </h1>
  )
}
