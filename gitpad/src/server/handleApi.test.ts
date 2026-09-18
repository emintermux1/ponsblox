import { describe, expect, it } from 'vitest'
import { handleApi } from './handleApi.ts'

describe('API failure paths', () => {
  it('rejects a bad watch address', async () => {
    const res = await handleApi({
      method: 'GET',
      pathname: '/api/watch',
      search: new URLSearchParams({ wallet: 'not-an-address' }),
    })
    expect(res.status).toBe(400)
  })

  it('rejects a cross-origin POST', async () => {
    const res = await handleApi({
      method: 'POST',
      pathname: '/api/tokens',
      search: new URLSearchParams(),
      body: {},
      origin: 'https://evil.example',
      host: 'localhost',
    })
    expect(res.status).toBe(403)
  })

  it('refuses IPFS when Pinata is unset', async () => {
    delete process.env.PINATA_JWT
    const res = await handleApi({
      method: 'POST',
      pathname: '/api/ipfs',
      search: new URLSearchParams(),
      host: 'localhost',
      body: { kind: 'json', json: { name: 'x' } },
    })
    expect(res.status).toBeGreaterThanOrEqual(400)
  })

  it('pulse reports store-backed zeros', async () => {
    const res = await handleApi({
      method: 'GET',
      pathname: '/api/pulse',
      search: new URLSearchParams(),
    })
    expect(res.status).toBe(200)
    const json = res.json as { source: string; repositoriesTracked: number }
    expect(json.source).toBe('indexed store')
    expect(typeof json.repositoriesTracked).toBe('number')
  })

  it('rejects launch analytics that include a wallet', async () => {
    const res = await handleApi({
      method: 'POST',
      pathname: '/api/launch-events',
      search: new URLSearchParams(),
      host: 'localhost',
      body: { event: 'launch_started', session: 'aabbccddeeff0011', wallet: '0x1111111111111111111111111111111111111111' },
    })
    expect(res.status).toBe(400)
  })

  it('rejects launch analytics that include an address', async () => {
    const res = await handleApi({
      method: 'POST',
      pathname: '/api/launch-events',
      search: new URLSearchParams(),
      host: 'localhost',
      body: { event: 'launch_started', session: 'aabbccddeeff0011', address: '0x1111111111111111111111111111111111111111' },
    })
    expect(res.status).toBe(400)
  })

  it('records an allowlisted launch event without a wallet', async () => {
    const res = await handleApi({
      method: 'POST',
      pathname: '/api/launch-events',
      search: new URLSearchParams(),
      host: 'localhost',
      body: { event: 'repository_selected', session: 'aabbccddeeff0011' },
    })
    expect(res.status).toBe(204)
  })

  it('returns launch funnel counts without private fields', async () => {
    const res = await handleApi({
      method: 'GET',
      pathname: '/api/launch-events',
      search: new URLSearchParams(),
    })
    expect(res.status).toBe(200)
    const json = res.json as { counts: Record<string, number>; note: string }
    expect(json.counts.repository_selected).toBeGreaterThanOrEqual(1)
    expect(json.note).toMatch(/No wallet/)
    expect(JSON.stringify(json)).not.toMatch(/0x[a-fA-F0-9]{40}/)
  })

  it('rejects admin without allowlist', async () => {
    const res = await handleApi({
      method: 'GET',
      pathname: '/api/admin',
      search: new URLSearchParams({ wallet: '0x1111111111111111111111111111111111111111' }),
    })
    expect(res.status).toBe(403)
  })
})
