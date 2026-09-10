function scrub(value: string): string {
  return value
    .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/0x[a-fA-F0-9]{64}/g, '0x[hash]')
}

export function logServer(scope: 'steam' | 'pons' | 'ipfs' | 'api' | 'indexer', message: string) {
  const line = `[skinpad:${scope}] ${scrub(message).slice(0, 240)}`
  if (scope === 'api' || scope === 'indexer') console.warn(line)
  else console.error(line)
}
