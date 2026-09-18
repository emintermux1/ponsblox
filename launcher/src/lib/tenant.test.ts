import { describe, expect, it } from 'vitest'
import { padsUrl, resolveTenant, studioUrl, tenantFromHost, tenantFromPath, tenantUrl } from './tenant.ts'

describe('tenant', () => {
  it('reads /p/:slug', () => {
    expect(tenantFromPath('/p/steelpad')).toBe('steelpad')
    expect(tenantFromPath('/docs')).toBeNull()
  })

  it('reads wildcard hosts', () => {
    expect(tenantFromHost('steelpad.launcher.family')).toBe('steelpad')
    expect(tenantFromHost('www.launcher.family')).toBeNull()
    expect(tenantFromHost('steelpad.localhost:5190')).toBe('steelpad')
    expect(tenantFromHost('launcher.family')).toBeNull()
  })

  it('resolves studio vs tenant', () => {
    expect(resolveTenant('launcher.family', '/')).toEqual({ kind: 'studio', slug: null })
    expect(resolveTenant('localhost', '/p/steelpad')).toEqual({ kind: 'tenant', slug: 'steelpad' })
  })

  it('builds tenant urls', () => {
    expect(tenantUrl('steelpad', 'https://launcher.family')).toBe('https://steelpad.launcher.family/')
    expect(tenantUrl('steelpad', 'http://localhost:5190')).toBe('http://localhost:5190/p/steelpad')
  })

  it('points wildcard tenants at the apex studio', () => {
    expect(studioUrl('https://x-rh.launcher.family')).toBe('https://launcher.family/')
    expect(padsUrl('https://x-rh.launcher.family')).toBe('https://launcher.family/pads')
    expect(studioUrl('http://x-rh.localhost:5190')).toBe('http://localhost:5190/')
    expect(studioUrl('http://localhost:5190')).toBe('http://localhost:5190/')
  })
})
