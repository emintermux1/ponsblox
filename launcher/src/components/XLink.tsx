import { X_AT, X_URL } from '../lib/social.ts'

type XLinkKind = 'handle' | 'mark'

export function XLink({ kind = 'handle' }: { kind?: XLinkKind }) {
  let label: string
  switch (kind) {
    case 'handle':
      label = X_AT
      break
    case 'mark':
      label = 'X'
      break
    default: {
      const _n: never = kind
      return _n
    }
  }
  return (
    <a
      className={kind === 'mark' ? 'xlink xlink-mark' : 'xlink'}
      href={X_URL}
      target="_blank"
      rel="noopener noreferrer"
    >
      {label}
    </a>
  )
}
