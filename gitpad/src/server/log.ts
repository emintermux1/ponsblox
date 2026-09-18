function scrub(value: string): string {
  return value
    .replace(/github_pat_[A-Za-z0-9_]+/gi, '[redacted]')
    .replace(/ghp_[A-Za-z0-9]+/gi, '[redacted]')
    .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/0x[a-fA-F0-9]{64}/g, '0x[hash]')
}

export function logServer(scope: 'github' | 'pons' | 'ipfs' | 'api' | 'indexer' | 'deploy', message: string) {
  const line = `[gitpad:${scope}] ${scrub(message).slice(0, 240)}`
  if (scope === 'api' || scope === 'indexer') console.warn(line)
  else console.error(line)
}
