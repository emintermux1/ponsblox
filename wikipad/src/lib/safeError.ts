export const RPC_BUSY = 'Robinhood RPC is busy. Try again.'

export function errorText(e: unknown): string {
  if (!e) return ''
  if (typeof e === 'string') return e
  const err = e as { message?: string; shortMessage?: string; details?: string }
  return [err.shortMessage, err.message, err.details].filter(Boolean).join('\n')
}

export function isRpcDump(raw: string): boolean {
  if (!raw) return false
  if (/eth_call|HTTP request failed|rpc\.mainnet|viem|JSON-RPC|ContractFunction|ContractCall|Request body|details:|raw:/i.test(raw)) {
    return true
  }
  if (/0x[a-fA-F0-9]{24,}/.test(raw) && raw.length > 80) return true
  if (/[{[]/.test(raw) && raw.length > 40) return true
  if (raw.length > 140) return true
  return false
}

export function sanitizeUserError(e: unknown, fallback = RPC_BUSY): string {
  const raw = errorText(e)
  if (/User rejected|denied transaction|4001/i.test(raw)) return 'You cancelled. Nothing was sent.'
  if (/insufficient funds|exceeds the balance/i.test(raw)) return 'Insufficient ETH for the launch fee and gas.'
  if (/Install MetaMask/i.test(raw)) return 'Install MetaMask, then refresh.'
  if (isRpcDump(raw)) return fallback
  if (!raw.trim()) return fallback
  return raw
}

export function isRpcBusyMessage(text: string): boolean {
  return text === RPC_BUSY || /Robinhood RPC is busy/i.test(text)
}
