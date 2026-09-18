import { isLaunchEvent, LAUNCH_EVENTS, type LaunchEvent } from '../lib/launchEvents.ts'
import { readStore, recordFunnel } from './store.ts'

export function emptyFunnel(): Record<LaunchEvent, number> {
  return {
    launch_started: 0,
    repository_selected: 0,
    token_configured: 0,
    fee_configured: 0,
    launch_reviewed: 0,
    wallet_requested: 0,
    transaction_submitted: 0,
    deployment_confirmed: 0,
    deployment_failed: 0,
    share_clicked: 0,
  }
}

export function recordLaunchEvent(event: string): Record<LaunchEvent, number> | null {
  if (!isLaunchEvent(event)) return null
  const counts = recordFunnel(event)
  return { ...emptyFunnel(), ...counts }
}

export function launchFunnelCounts(): Record<LaunchEvent, number> {
  return { ...emptyFunnel(), ...readStore().funnel }
}

export function funnelNote(): string {
  return `Counts only. Events: ${LAUNCH_EVENTS.join(', ')}. No wallet, CA, or transaction is stored.`
}
