export type DeployPhase =
  | 'IDLE'
  | 'PREPARING'
  | 'UPLOADING'
  | 'SIMULATING'
  | 'AWAITING_SIGNATURE'
  | 'SUBMITTED'
  | 'CONFIRMING'
  | 'INDEXING'
  | 'SUCCESS'
  | 'FAILED'

export function phaseFromStatus(text: string): DeployPhase | null {
  if (/verifying repository|preparing metadata/i.test(text)) return 'PREPARING'
  if (/upload|ipfs/i.test(text)) return 'UPLOADING'
  if (/simulat/i.test(text)) return 'SIMULATING'
  if (/signature|WAITING/i.test(text)) return 'AWAITING_SIGNATURE'
  if (/transaction submitted/i.test(text)) return 'SUBMITTED'
  if (/waiting for|confirmation/i.test(text)) return 'CONFIRMING'
  if (/factory event|token address|registry|indexed/i.test(text)) return 'INDEXING'
  if (/✓ LIVE|status LIVE/i.test(text)) return 'SUCCESS'
  return null
}

export function submittedHash(text: string): `0x${string}` | null {
  const m = text.match(/transaction submitted\s+(0x[a-fA-F0-9]{64})/i)
  return m?.[1] as `0x${string}` | undefined ?? null
}
