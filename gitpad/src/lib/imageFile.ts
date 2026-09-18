export const IMAGE_MAX_BYTES = 2 * 1024 * 1024
export const IMAGE_MIN_PX = 64
export const IMAGE_MAX_PX = 4096
export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const

export function precheckImageFile(file: { type: string; size: number; name: string }): string | null {
  const type = (file.type || '').toLowerCase()
  if (!IMAGE_TYPES.includes(type as (typeof IMAGE_TYPES)[number])) {
    return 'Use PNG, JPEG, WebP, or GIF.'
  }
  if (file.size <= 0) return 'That file is empty.'
  if (file.size > IMAGE_MAX_BYTES) {
    return `Image is ${(file.size / 1024 / 1024).toFixed(1)}MB. Max is 2MB.`
  }
  return null
}

export type ImageCheck =
  | { ok: true; width: number; height: number }
  | { ok: false; error: string }

export async function validateImageFile(file: File): Promise<ImageCheck> {
  const early = precheckImageFile(file)
  if (early) return { ok: false, error: early }
  const url = URL.createObjectURL(file)
  try {
    const dims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
      img.onerror = () => reject(new Error('Could not read image dimensions.'))
      img.src = url
    })
    if (dims.width < IMAGE_MIN_PX || dims.height < IMAGE_MIN_PX) {
      return { ok: false, error: `Image is ${dims.width}×${dims.height}. Minimum is ${IMAGE_MIN_PX}px.` }
    }
    if (dims.width > IMAGE_MAX_PX || dims.height > IMAGE_MAX_PX) {
      return { ok: false, error: `Image is ${dims.width}×${dims.height}. Maximum is ${IMAGE_MAX_PX}px.` }
    }
    return { ok: true, width: dims.width, height: dims.height }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function fileFromPaste(e: ClipboardEvent): File | null {
  const items = e.clipboardData?.items
  if (!items) return null
  for (const item of items) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      return item.getAsFile()
    }
  }
  return null
}
