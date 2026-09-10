import { useState } from 'react'
import { copyText } from '../lib/copy.ts'

export function CopyButton({
  value,
  label,
  copiedLabel = 'Copied',
  className = 'btn btn--ghost btn--sm',
}: {
  value: string
  label: string
  copiedLabel?: string
  className?: string
}) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      className={className}
      title={label}
      disabled={!value}
      onClick={() => {
        void copyText(value).then((ok) => {
          if (!ok) return
          setDone(true)
          window.setTimeout(() => setDone(false), 1600)
        })
      }}
    >
      {done ? copiedLabel : label}
    </button>
  )
}
