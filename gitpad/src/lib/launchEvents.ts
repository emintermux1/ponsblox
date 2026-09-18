export const LAUNCH_EVENTS = [
  'launch_started',
  'repository_selected',
  'token_configured',
  'fee_configured',
  'launch_reviewed',
  'wallet_requested',
  'transaction_submitted',
  'deployment_confirmed',
  'deployment_failed',
  'share_clicked',
] as const

export type LaunchEvent = (typeof LAUNCH_EVENTS)[number]

export function isLaunchEvent(value: string): value is LaunchEvent {
  return (LAUNCH_EVENTS as readonly string[]).includes(value)
}

const SESSION_KEY = 'gitpad.launchSession'

export function launchSessionId(): string {
  try {
    const cur = sessionStorage.getItem(SESSION_KEY)
    if (cur && /^[a-f0-9]{16,64}$/i.test(cur)) return cur
    const next = crypto.getRandomValues(new Uint8Array(16))
      .reduce((s, b) => s + b.toString(16).padStart(2, '0'), '')
    sessionStorage.setItem(SESSION_KEY, next)
    return next
  } catch {
    return '0000000000000000'
  }
}

export function trackLaunch(event: LaunchEvent) {
  if (typeof fetch === 'undefined') return
  const session = launchSessionId()
  void fetch('/api/launch-events', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ event, session }),
  }).catch(() => {})
}
