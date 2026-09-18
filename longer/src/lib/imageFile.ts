export const IMAGE_MAX_BYTES = 2 * 1024 * 1024
export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const

export function precheckImageFile(file: { type: string; size: number; name: string }): string | null {
  const type = (file.type || '').toLowerCase()
  if (type && !IMAGE_TYPES.includes(type as (typeof IMAGE_TYPES)[number])) {
    return 'Use PNG, JPEG, WebP, or GIF.'
  }
  if (file.size <= 0) return 'That file is empty.'
  if (file.size > IMAGE_MAX_BYTES) {
    return `Image is ${(file.size / 1024 / 1024).toFixed(1)}MB. Max is 2MB.`
  }
  return null
}
