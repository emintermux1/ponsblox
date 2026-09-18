'use client'

type ImagePickProps = {
  fileName?: string
  onFile: (file: File | null) => void
}

export function ImagePick({ fileName, onFile }: ImagePickProps) {
  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
      <label className="btn btn-ink relative min-h-10 cursor-pointer overflow-hidden px-3">
        Choose image
        <input
          type="file"
          accept="image/*"
          className="absolute inset-0 cursor-pointer opacity-0"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
      </label>
      <span className="min-w-0 truncate text-sm text-muted">{fileName || 'No file selected'}</span>
    </div>
  )
}
