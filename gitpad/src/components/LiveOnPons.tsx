export function LiveOnPons({ className }: { className?: string }) {
  return (
    <span className={['live', className].filter(Boolean).join(' ')}>
      <i className="live__dot" aria-hidden />
      Live on Pons
    </span>
  )
}
