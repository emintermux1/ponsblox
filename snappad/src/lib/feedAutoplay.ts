export const FEED_AUTOPLAY_MAX = 3

type Handle = {
  onArm: () => void
  onDisarm: () => void
}

type Slot = {
  tile: Element
  ratio: number
  armed: boolean
  handle: Handle
}

const slots = new Map<Element, Slot>()
let observer: IntersectionObserver | null = null

function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function sync() {
  const ranked = [...slots.values()].sort((a, b) => b.ratio - a.ratio)
  ranked.forEach((slot, i) => {
    const should = !reducedMotion() && i < FEED_AUTOPLAY_MAX && slot.ratio >= 0.4
    if (should === slot.armed) return
    slot.armed = should
    if (should) slot.handle.onArm()
    else slot.handle.onDisarm()
  })
}

function io(): IntersectionObserver {
  if (!observer) {
    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const slot = slots.get(entry.target)
        if (slot) slot.ratio = entry.isIntersecting ? entry.intersectionRatio : 0
      }
      sync()
    }, { threshold: [0, 0.25, 0.4, 0.6, 0.8, 1] })
  }
  return observer
}

function visibleRatio(tile: Element): number {
  const rect = tile.getBoundingClientRect()
  const vh = window.innerHeight || 1
  const vw = window.innerWidth || 1
  const visibleH = Math.min(rect.bottom, vh) - Math.max(rect.top, 0)
  const visibleW = Math.min(rect.right, vw) - Math.max(rect.left, 0)
  if (visibleH <= 0 || visibleW <= 0) return 0
  return Math.min(1, (visibleH * visibleW) / Math.max(rect.width * rect.height, 1))
}

export function watchFeedTile(tile: Element, handle: Handle): () => void {
  slots.set(tile, { tile, ratio: visibleRatio(tile), armed: false, handle })
  io().observe(tile)
  sync()
  return () => {
    const slot = slots.get(tile)
    if (slot?.armed) handle.onDisarm()
    observer?.unobserve(tile)
    slots.delete(tile)
    sync()
  }
}
