export function BrandLockup({
  compact = false,
}: {
  compact?: boolean
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <img
        src="/mark-l.png"
        alt=""
        width={28}
        height={28}
        className={compact ? 'h-5 w-5 object-contain' : 'h-7 w-7 object-contain'}
      />
      <span className={`font-sans font-medium tracking-[0.22em] text-paper ${compact ? 'text-[11px]' : 'text-[13px]'}`}>
        LONGER
      </span>
    </span>
  )
}
