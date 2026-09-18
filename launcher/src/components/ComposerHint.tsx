import { COMPOSER_HINTS } from '../lib/copy.ts'
import { useRotate } from '../hooks/useRotate.ts'

export function ComposerHint(props: { hidden: boolean }) {
  const { i, out } = useRotate(COMPOSER_HINTS.length, 3400)
  if (props.hidden) return null
  return (
    <span className={out ? 'composer-hint out' : 'composer-hint'} aria-hidden>
      {COMPOSER_HINTS[i].split(' ').map((word, k, all) => (
        <span key={`${i}-${k}`} style={{ animationDelay: `${k * 38}ms` }}>
          {word}{k < all.length - 1 ? '\u00A0' : ''}
        </span>
      ))}
    </span>
  )
}
