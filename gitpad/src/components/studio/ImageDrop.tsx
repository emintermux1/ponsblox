import { useEffect, useState } from 'react'
import { fileFromPaste, validateImageFile } from '../../lib/imageFile.ts'

export function ImageDrop({
  onFile,
  busy,
  current,
}: {
  onFile: (file: File) => void
  busy: boolean
  current?: string
}) {
  const [over, setOver] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = fileFromPaste(e)
      if (!file) return
      e.preventDefault()
      void take(file)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [onFile])

  async function take(file: File) {
    setNote('Checking image…')
    const check = await validateImageFile(file)
    if (!check.ok) { setNote(check.error); return }
    setNote(`${check.width}×${check.height} — uploading`)
    onFile(file)
  }

  return (
    <div
      className={`idrop${over ? ' is-over' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        const file = e.dataTransfer.files[0]
        if (file) void take(file)
      }}
    >
      {current ? <img src={current} alt="" /> : <p className="muted">Drop, upload, or paste an image</p>}
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        disabled={busy}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void take(f)
        }}
      />
      {note && <p className="mono">{note}</p>}
      {busy && <div className="idrop__bar" aria-hidden><i /></div>}
      <p className="muted">PNG / JPEG / WebP / GIF · max 2MB · 64–4096px</p>
    </div>
  )
}
