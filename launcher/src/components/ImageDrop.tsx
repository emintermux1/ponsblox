import { useState } from 'react'
import { validateImageFile } from '../lib/imageFile.ts'
import { uploadLogo } from '../lib/ipfs.ts'

export function ImageDrop(props: {
  label?: string
  current?: string
  compact?: boolean
  onUrl: (url: string) => void
  onError: (msg: string) => void
}) {
  const idle = props.compact ? 'Choose image' : 'Drop an image or click to upload'
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState(idle)
  const [over, setOver] = useState(false)

  const take = async (file: File | null) => {
    if (!file) return
    setBusy(true)
    try {
      const check = await validateImageFile(file)
      if (!check.ok) {
        setNote(check.error)
        props.onError(check.error)
        return
      }
      setNote('Uploading to Pinata…')
      const url = await uploadLogo(file)
      props.onUrl(url)
      setNote(file.name)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Upload failed.'
      setNote(msg)
      props.onError(msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <label
      className={`drop${over ? ' over' : ''}${props.current ? ' has' : ''}${props.compact ? ' compact' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        void take(e.dataTransfer.files[0] ?? null)
      }}
    >
      {!props.compact && <span className="drop-label">{props.label || 'Coin image'}</span>}
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        disabled={busy}
        aria-label={props.label || 'Choose image'}
        onChange={(e) => void take(e.target.files?.[0] ?? null)}
      />
      {props.current ? <img src={props.current} alt="" /> : null}
      <span className="drop-note">{busy ? 'Uploading…' : note}</span>
      {!props.compact && <span className="drop-hint">PNG, JPEG, WebP, or GIF · max 2MB</span>}
    </label>
  )
}
