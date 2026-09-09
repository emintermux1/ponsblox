export type AppErrorCode =
  | 'GITHUB_UNAVAILABLE'
  | 'REPO_NOT_FOUND'
  | 'REPO_PRIVATE'
  | 'RATE_LIMITED'
  | 'REPO_UNVERIFIED'
  | 'PONS_UNAVAILABLE'
  | 'IPFS_FAILED'
  | 'WALLET_REJECTED'
  | 'INSUFFICIENT_BALANCE'
  | 'SIMULATION_FAILED'
  | 'TX_REVERTED'
  | 'CONFIRMATION_DELAYED'
  | 'INDEXER_PENDING'
  | 'WRONG_NETWORK'
  | 'TOKEN_EXISTS'
  | 'FEE_UNSUPPORTED'
  | 'BAD_ADDRESS'
  | 'BAD_REPO'
  | 'GENERIC'

export type LaunchRetry = 'repo' | 'token' | 'fees' | 'review' | 'resume' | 'deploy'

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
      next: 'The hash is saved. Watch the explorer. GitPad will not send another launch.',
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
  if (/could not be verified|canonical id|has not confirmed this repository/i.test(m)) {
    return { code: 'REPO_UNVERIFIED', message: 'Repository could not be verified.', next: 'Resolve the GitHub id before deploy.' }
  }
  if (/reverted|Launch reverted/i.test(m)) {
    return { code: 'TX_REVERTED', message: 'Pons V2 transaction reverted.', next: 'No token was created. Review the sheet, then send only if you choose to.' }
  }
  if (/Robinhood|4663|wrong network|switch/i.test(m)) {
    return { code: 'WRONG_NETWORK', message: 'Wallet is not on Robinhood Chain (4663).', next: 'Switch network, then retry.' }
  }
  if (/rate limit|429/i.test(m)) {
    return { code: 'RATE_LIMITED', message: 'GitHub rate-limited this server.', next: 'Set GITHUB_TOKEN or wait a minute.' }
  }
  if (/Paste owner\/name|not a valid GitHub repository|GitHub URL or owner/i.test(m)) {
    return { code: 'BAD_REPO', message: 'That is not a valid GitHub repository.', next: 'Use https://github.com/owner/name or owner/name.' }
  }
  if (/not found|404/i.test(m) && /repo/i.test(m)) {
    return { code: 'REPO_NOT_FOUND', message: 'That GitHub repository does not exist.', next: 'Check the owner/name or paste the official URL.' }
  }
  if (/private|403/i.test(m) && /github|repo/i.test(m)) {
    return { code: 'REPO_PRIVATE', message: 'This repository is private or blocked.', next: 'GitPad only pairs public repositories.' }
  }
  if (/OAuth is not configured|GITHUB_OAUTH/i.test(m)) {
    return { code: 'GENERIC', message: m, next: 'Set GITHUB_OAUTH_CLIENT_ID and GITHUB_OAUTH_CLIENT_SECRET to enable claims.' }
  }
  if (/Failed to fetch|\bNetworkError\b|\bLoad failed\b|network request failed|API is unreachable|Vercel Authentication/i.test(m)) {
    return {
      code: 'GITHUB_UNAVAILABLE',
      message: 'GitPad API is unreachable.',
      next: 'Refresh. Local needs the Vite server on port 5177.',
    }
  }
  if (/api\.github|GitHub API|temporarily unavailable|GitHub did not/i.test(m)) {
    return { code: 'GITHUB_UNAVAILABLE', message: 'GitHub API temporarily unavailable.', next: 'Retry repository resolve. Cached lists stay if we have them.' }
  }
  if (/Pinata|IPFS|PINATA|CID was returned/i.test(m)) {
    return { code: 'IPFS_FAILED', message: m, next: 'Retry, or launch with an https image URL.' }
  }
  if (/Pons is not|launchEnabled|canLaunch|not allowed/i.test(m)) {
    return { code: 'PONS_UNAVAILABLE', message: 'Pons V2 is not accepting this launch right now.', next: 'Check factory status on the deploy step.' }
  }
  if (/already exists|canonical/i.test(m)) {
    return { code: 'TOKEN_EXISTS', message: 'This repository already has a GitPad token.', next: 'Open the canonical token or mark a new launch as a community token.' }
  }
  if (/fee|router|recipient/i.test(m) && /not|unsupported|immutable/i.test(m)) {
    return { code: 'FEE_UNSUPPORTED', message: 'Fee routing is not available for this token.', next: 'Pons locks creator tax at launch. Route only if the recipient is GitPadFeeRouter.' }
  }
  if (/Not a Pons V2 launch|RBLX-pair Pons/i.test(m)) {
    return { code: 'BAD_ADDRESS', message: 'Not a Pons V2 launch.', next: 'Paste a token the Pons factory launched.' }
  }
  if (/not an address|0x/i.test(m)) {
    return { code: 'BAD_ADDRESS', message: 'That is not a valid contract address.', next: 'Paste a 0x address from the explorer.' }
  }
  if (/GitHub URL|owner\/name/i.test(m)) {
    return { code: 'BAD_REPO', message: 'That is not a valid GitHub repository.', next: 'Use https://github.com/owner/name or owner/name.' }
  }
  return { code: 'GENERIC', message: m, next: 'Retry the same action. If it repeats, check Docs.' }
}

export function retryFor(code: AppErrorCode): LaunchRetry {
  switch (code) {
    case 'GITHUB_UNAVAILABLE':
    case 'REPO_NOT_FOUND':
    case 'REPO_PRIVATE':
    case 'RATE_LIMITED':
    case 'REPO_UNVERIFIED':
    case 'BAD_REPO':
    case 'TOKEN_EXISTS':
      return 'repo'
    case 'IPFS_FAILED':
      return 'token'
    case 'FEE_UNSUPPORTED':
      return 'fees'
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
    case 'repo': return 'Retry Safe Step — repository'
    case 'token': return 'Retry Safe Step — metadata'
    case 'fees': return 'Retry Safe Step — fees'
    case 'review': return 'Retry Safe Step — review'
    case 'resume': return 'Retry Safe Step — watch hash'
    case 'deploy': return 'Retry Safe Step — wait for you'
    default: {
      const _e: never = retry
      return _e
    }
  }
}

export function launchFailTitle(code: AppErrorCode): string {
  switch (code) {
    case 'GITHUB_UNAVAILABLE': return 'GitHub API temporarily unavailable.'
    case 'REPO_NOT_FOUND':
    case 'REPO_PRIVATE':
    case 'REPO_UNVERIFIED':
    case 'BAD_REPO':
    case 'RATE_LIMITED':
      return 'Repository could not be verified.'
    case 'IPFS_FAILED': return 'IPFS upload failed.'
    case 'WALLET_REJECTED': return 'Wallet signature rejected.'
    case 'INSUFFICIENT_BALANCE': return 'Insufficient balance.'
    case 'SIMULATION_FAILED': return 'Transaction simulation failed.'
    case 'TX_REVERTED': return 'Pons V2 transaction reverted.'
    case 'CONFIRMATION_DELAYED': return 'Transaction submitted but confirmation is delayed.'
    case 'INDEXER_PENDING': return 'Indexer has not detected the deployment yet.'
    case 'WRONG_NETWORK': return 'Wallet is on the wrong network.'
    case 'PONS_UNAVAILABLE': return 'Pons V2 is not accepting this launch.'
    case 'TOKEN_EXISTS': return 'A canonical GitPad token already exists.'
    case 'FEE_UNSUPPORTED': return 'FEE ROUTING NOT SUPPORTED'
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
