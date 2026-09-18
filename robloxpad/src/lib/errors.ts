export type AppErrorCode =
  | 'ROBLOX_UNAVAILABLE'
  | 'GAME_NOT_FOUND'
  | 'RATE_LIMITED'
  | 'PONS_UNAVAILABLE'
  | 'IPFS_FAILED'
  | 'WALLET_REJECTED'
  | 'INSUFFICIENT_BALANCE'
  | 'SIMULATION_FAILED'
  | 'TX_REVERTED'
  | 'CONFIRMATION_DELAYED'
  | 'INDEXER_PENDING'
  | 'WRONG_NETWORK'
  | 'BAD_ADDRESS'
  | 'GENERIC'

export type LaunchRetry = 'game' | 'token' | 'review' | 'resume' | 'deploy'

export type AppError = {
  code: AppErrorCode
  message: string
  next: string
}

export type LaunchFail = AppError & {
  title: string
  retry: LaunchRetry
  retryLabel: string
}

export function classifyError(raw: string): AppError {
  const m = raw || 'Something failed'
  if (/User rejected|denied|4001|You cancelled/i.test(m)) {
    return { code: 'WALLET_REJECTED', message: 'Wallet signature rejected.', next: 'Nothing was sent. Confirm again when you are ready.' }
  }
  if (/TokenLaunched was not|not marking LIVE|Indexer has not/i.test(m)) {
    return {
      code: 'INDEXER_PENDING',
      message: 'Indexer has not detected the deployment yet.',
      next: 'The hash is saved. Watch the explorer. RobloxPad will not send another launch.',
    }
  }
  if (/timeout|timed out|confirmation is delayed|RPC timed/i.test(m)) {
    return {
      code: 'CONFIRMATION_DELAYED',
      message: 'Transaction submitted but confirmation is delayed.',
      next: 'Resume from the saved hash. Do not send another launch.',
    }
  }
  if (/simulat|would revert|Gas estimate failed/i.test(m) && !/SUCCESS/i.test(m)) {
    return { code: 'SIMULATION_FAILED', message: 'Transaction simulation failed.', next: 'Nothing was sent. Fix the draft, then simulate again.' }
  }
  if (/insufficient funds|Insufficient ETH|exceeds the balance/i.test(m)) {
    return { code: 'INSUFFICIENT_BALANCE', message: 'Insufficient balance.', next: 'Fund the wallet for the launch fee and gas, then retry this step.' }
  }
  if (/reverted|Launch reverted/i.test(m)) {
    return { code: 'TX_REVERTED', message: 'Pons V2 transaction reverted.', next: 'No token was created. Review the sheet, then send only if you choose to.' }
  }
  if (/Robinhood|4663|wrong network|switch/i.test(m)) {
    return { code: 'WRONG_NETWORK', message: 'Wallet is not on Robinhood Chain (4663).', next: 'Switch network, then retry.' }
  }
  if (/rate limit|429/i.test(m)) {
    return { code: 'RATE_LIMITED', message: 'Roblox rate-limited this server.', next: 'Wait a minute, then refresh the games list.' }
  }
  if (/Failed to fetch|\bNetworkError\b|\bLoad failed\b|network request failed|API is unreachable/i.test(m)) {
    return {
      code: 'ROBLOX_UNAVAILABLE',
      message: 'RobloxPad API is unreachable.',
      next: 'Refresh. Local needs the Vite server on port 5179.',
    }
  }
  if (/Roblox|explore|omni-search|catalogue/i.test(m)) {
    return { code: 'ROBLOX_UNAVAILABLE', message: 'Roblox feed is unreachable.', next: 'Retry in a minute.' }
  }
  if (/Pinata|IPFS|PINATA|CID was returned/i.test(m)) {
    return { code: 'IPFS_FAILED', message: m, next: 'Retry, or launch with the short RobloxPad art URL.' }
  }
  if (/Pons is not|launchEnabled|canLaunch|not allowed/i.test(m)) {
    return { code: 'PONS_UNAVAILABLE', message: 'Pons V2 is not accepting this launch right now.', next: 'Check factory status on the deploy step.' }
  }
  if (/not an address|0x/i.test(m)) {
    return { code: 'BAD_ADDRESS', message: 'That is not a valid contract address.', next: 'Paste a 0x address from the explorer.' }
  }
  if (/game|universe/i.test(m) && /not found|unknown|not on/i.test(m)) {
    return { code: 'GAME_NOT_FOUND', message: 'That game is not on RobloxPad.', next: 'Search a title or paste a roblox.com/games URL.' }
  }
  return { code: 'GENERIC', message: m, next: 'Retry the same action. If it repeats, check Docs.' }
}

export function retryFor(code: AppErrorCode): LaunchRetry {
  switch (code) {
    case 'ROBLOX_UNAVAILABLE':
    case 'GAME_NOT_FOUND':
    case 'RATE_LIMITED':
      return 'game'
    case 'IPFS_FAILED':
      return 'token'
    case 'CONFIRMATION_DELAYED':
    case 'INDEXER_PENDING':
      return 'resume'
    case 'WALLET_REJECTED':
    case 'INSUFFICIENT_BALANCE':
    case 'WRONG_NETWORK':
    case 'PONS_UNAVAILABLE':
    case 'BAD_ADDRESS':
      return 'deploy'
    case 'SIMULATION_FAILED':
    case 'TX_REVERTED':
    case 'GENERIC':
      return 'review'
    default: {
      const _e: never = code
      return _e
    }
  }
}

export function retryLabel(retry: LaunchRetry): string {
  switch (retry) {
    case 'game': return 'Back to game'
    case 'token': return 'Back to token'
    case 'review': return 'Back to review'
    case 'resume': return 'Watch the hash'
    case 'deploy': return 'Retry deploy'
    default: {
      const _e: never = retry
      return _e
    }
  }
}

export function launchFailTitle(code: AppErrorCode): string {
  switch (code) {
    case 'ROBLOX_UNAVAILABLE': return 'Roblox feed is unreachable.'
    case 'GAME_NOT_FOUND': return 'That game is not on RobloxPad.'
    case 'RATE_LIMITED': return 'Roblox rate-limited this server.'
    case 'IPFS_FAILED': return 'IPFS upload failed.'
    case 'WALLET_REJECTED': return 'Wallet signature rejected.'
    case 'INSUFFICIENT_BALANCE': return 'Insufficient balance.'
    case 'SIMULATION_FAILED': return 'Transaction simulation failed.'
    case 'TX_REVERTED': return 'Pons V2 transaction reverted.'
    case 'CONFIRMATION_DELAYED': return 'Transaction submitted but confirmation is delayed.'
    case 'INDEXER_PENDING': return 'Indexer has not detected the deployment yet.'
    case 'WRONG_NETWORK': return 'Wallet is on the wrong network.'
    case 'PONS_UNAVAILABLE': return 'Pons V2 is not accepting this launch.'
    case 'BAD_ADDRESS': return 'That is not a valid contract address.'
    case 'GENERIC': return 'Launch did not complete.'
    default: {
      const _e: never = code
      return _e
    }
  }
}

export function classifyLaunchFail(raw: string): LaunchFail {
  const err = classifyError(raw)
  const retry = retryFor(err.code)
  return { ...err, title: launchFailTitle(err.code), retry, retryLabel: retryLabel(retry) }
}
