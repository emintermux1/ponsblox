export function StudioDock({
  label,
  disabled,
  onContinue,
  onBack,
  waiting,
}: {
  label: string
  disabled: boolean
  onContinue: () => void
  onBack?: () => void
  waiting?: string | null
}) {
  return (
    <div className="studio__dock">
      {onBack && (
        <button type="button" className="btn btn--paper" onClick={onBack} disabled={Boolean(waiting)}>
          Back
        </button>
      )}
      {waiting ? (
        <p className="muted">{waiting}</p>
      ) : (
        <button type="button" className="btn btn--lime" disabled={disabled} onClick={onContinue}>
          {label}
        </button>
      )}
    </div>
  )
}
