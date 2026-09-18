const KEY = 'humanwin-bank'

export function loadBank() {
  const raw = localStorage.getItem(KEY)
  const n = raw ? Number(raw) : 0
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

export function saveBank(n: number) {
  localStorage.setItem(KEY, String(Math.max(0, Math.floor(n))))
}
