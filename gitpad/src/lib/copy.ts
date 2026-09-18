export async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    return false
  }
}

export function shareIntentUrl(text: string): string {
  return `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`
}

export function gitpadUrl(path: string): string {
  if (typeof location === 'undefined') return path
  return `${location.origin}${path}`
}
