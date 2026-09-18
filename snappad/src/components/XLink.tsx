import { X_AT, X_URL } from '../lib/social.ts'

export function XLink({ compact = false }: { compact?: boolean }) {
  return (
    <a
      className={compact ? 'xlink xlink--chip' : 'xlink'}
      href={X_URL}
      target="_blank"
      rel="noopener noreferrer"
    >
      {compact ? X_AT : `X ${X_AT}`}
    </a>
  )
}
