export function Fan({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <circle cx="32" cy="32" r="26" stroke="currentColor" strokeWidth="4" />
      <g fill="currentColor">
        <path d="M32 8c6 10 7 16 0 24-7-8-6-14 0-24Z" />
        <path d="M52.8 44c-11.2 2.4-16.5 6-20.8-12 11.2 2.4 16.5 6 20.8 12Z" />
        <path d="M11.2 44c4.3-6 9.6-9.6 20.8-12-4.3 18-9.6 14.4-20.8 12Z" />
        <circle cx="32" cy="32" r="6" />
      </g>
    </svg>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={className}>
      <Fan className="fan" />
      $GPU
    </span>
  )
}
