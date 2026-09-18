import { describe, expect, it } from 'vitest'
import {
  domainError,
  domainMessage,
  domainMessageToSign,
  isApex,
  isCustomHost,
  normalizeDomain,
  unixMinute,
} from './domain.ts'

describe('domain', () => {
  it('normalizes what people paste', () => {
    expect(normalizeDomain(' Pad.Example.com ')).toBe('pad.example.com')
    expect(normalizeDomain('https://pad.example.com/path')).toBe('pad.example.com')
    expect(normalizeDomain('pad.example.com:443')).toBe('pad.example.com')
    expect(normalizeDomain('pad.example.com.')).toBe('pad.example.com')
  })

  it('accepts real hostnames', () => {
    expect(domainError('pad.example.com')).toBeNull()
    expect(domainError('example.com')).toBeNull()
    expect(domainError('my-pad.example.co.uk')).toBeNull()
    expect(domainError('PAD.EXAMPLE.COM')).toBeNull()
  })

  it('rejects junk', () => {
    expect(domainError('')).toBe('empty')
    expect(domainError('   ')).toBe('empty')
    expect(domainError('localhost')).toBe('tld')
    expect(domainError('example')).toBe('tld')
    expect(domainError('pad.example.123')).toBe('tld')
    expect(domainError('pad_x.example.com')).toBe('charset')
    expect(domainError('-pad.example.com')).toBe('charset')
    expect(domainError('pad-.example.com')).toBe('charset')
    expect(domainError('pad..example.com')).toBe('length')
    expect(domainError(`${'a'.repeat(64)}.example.com`)).toBe('length')
    expect(domainError(`${'a.'.repeat(130)}com`)).toBe('length')
  })

  it('rejects hosts we already serve', () => {
    expect(domainError('launcher.family')).toBe('reserved')
    expect(domainError('steelpad.launcher.family')).toBe('reserved')
    expect(domainError('a.b.launcher.family')).toBe('reserved')
    expect(domainError('foo.vercel.app')).toBe('reserved')
    expect(domainError('x.localhost')).toBe('reserved')
    expect(domainError('notlauncher.family')).toBeNull()
  })

  it('has a message for every error', () => {
    for (const e of ['empty', 'length', 'charset', 'tld', 'reserved'] as const) {
      expect(domainMessage(e).length).toBeGreaterThan(4)
    }
  })

  it('tells apex from subdomain', () => {
    expect(isApex('example.com')).toBe(true)
    expect(isApex('pad.example.com')).toBe(false)
  })

  it('builds the signed message per minute', () => {
    expect(domainMessageToSign('coin-desk', 'pad.example.com', 29_000_000)).toBe(
      'launcher:domain:coin-desk:pad.example.com:29000000',
    )
    expect(unixMinute(60_000 * 5 + 59_999)).toBe(5)
  })

  it('only asks the server about unknown hosts', () => {
    expect(isCustomHost('localhost:5190')).toBe(false)
    expect(isCustomHost('steelpad.localhost')).toBe(false)
    expect(isCustomHost('127.0.0.1')).toBe(false)
    expect(isCustomHost('launcher.family')).toBe(false)
    expect(isCustomHost('steelpad.launcher.family')).toBe(false)
    expect(isCustomHost('launcher-abc.vercel.app')).toBe(false)
    expect(isCustomHost('pad.example.com')).toBe(true)
    expect(isCustomHost('')).toBe(false)
  })
})
