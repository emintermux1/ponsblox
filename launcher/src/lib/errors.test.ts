import { describe, expect, it } from 'vitest'
import { userError } from './errors.ts'

describe('userError', () => {
  it('strips RPC dumps', () => {
    expect(userError(new Error('HTTP request failed on eth_call 0xabc'))).toBe('Chain RPC is busy. Try again.')
    expect(userError(new Error('Too Many Requests'))).toBe('Chain RPC is busy. Try again.')
  })

  it('keeps factory-missing copy', () => {
    expect(userError(new Error('Launcher factory is not on this chain yet.'))).toBe(
      'Launcher factory is not on this chain yet.',
    )
  })

  it('maps wallet reject', () => {
    expect(userError(new Error('User rejected the request'))).toBe('Wallet rejected the transaction.')
  })

  it('reads plain provider objects instead of printing [object Object]', () => {
    expect(userError({ code: 4001, message: 'User rejected the request.' })).toBe('Wallet rejected the transaction.')
    expect(userError({ code: -32002, message: 'Request of type wallet_requestPermissions already pending' })).toBe(
      'Wallet request already pending.',
    )
    expect(userError({ shortMessage: 'Insufficient funds for gas.', message: 'long viem dump' })).toBe(
      'Insufficient funds for gas.',
    )
    expect(userError({ error: { message: 'Bad JSON' } })).toBe('Bad JSON')
    expect(userError({ reason: 'execution reverted' })).toBe('execution reverted')
    expect(userError({})).toBe('Something failed. Try again.')
    expect(userError(null)).toBe('Something failed. Try again.')
    expect(userError({ code: '4001' })).toBe('Wallet rejected the transaction.')
  })

  it('does not treat a sent hash plus a busy RPC as a failed create', () => {
    const hash = `0x${'ab'.repeat(32)}`
    expect(userError(new Error(`Timed out while waiting for transaction with hash ${hash}`))).toBe(
      'Still confirming — open Explorer',
    )
    expect(userError(new Error('Receipt timed out. Check the transaction.'))).toBe(
      'Still confirming — open Explorer',
    )
    expect(userError({ code: 4001, message: `User rejected ${hash}` })).toBe('Wallet rejected the transaction.')
  })

  it('maps factory reverts even when viem wraps them in eth_call', () => {
    expect(userError(new Error('SlugTaken'))).toBe('That slug is taken.')
    expect(userError({
      shortMessage: 'The contract function "createPad" reverted.',
      message: 'HTTP request failed on eth_call. Details: execution reverted 0x903f87db',
      data: { errorName: 'SlugTaken' },
    })).toBe('That slug is taken.')
    expect(userError({
      shortMessage: 'The contract function "createPad" reverted.',
      message: 'HTTP request failed on eth_call',
      data: '0x18f46120',
    })).toBe('Pick a different slug.')
    expect(userError(new Error('BadSlug'))).toBe('Pick a different slug.')
    expect(userError(new Error('Create pad reverted. SlugTaken'))).toBe('That slug is taken.')
    expect(userError(new Error('length'))).toBe('Pick a different slug.')
  })
})
