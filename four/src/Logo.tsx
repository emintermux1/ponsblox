export function FourHand({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 80 80" fill="none" aria-hidden="true">
      <g fill="currentColor">
        <rect x="18" y="42" width="44" height="24" rx="11" />
        <rect x="18" y="16" width="9" height="32" rx="4.5" />
        <rect x="30" y="8" width="9" height="40" rx="4.5" />
        <rect x="42" y="12" width="9" height="36" rx="4.5" />
        <rect x="54" y="18" width="9" height="30" rx="4.5" />
      </g>
    </svg>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={className}>
      <FourHand className="hand" />
      FOUR
    </span>
  )
}
