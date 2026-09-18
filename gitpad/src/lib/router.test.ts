import { describe, expect, it } from 'vitest'
import { parseLocation } from './router.ts'

describe('parseLocation', () => {
  it('maps the product surface', () => {
    expect(parseLocation('/', '')).toEqual({ name: 'home' })
    expect(parseLocation('/explore', '?sort=ai&q=vite')).toEqual({ name: 'explore', sort: 'ai', q: 'vite' })
    expect(parseLocation('/launch', '?repo=vercel/next.js')).toEqual({
      name: 'launch', owner: 'vercel', repo: 'next.js', mode: 'new',
    })
    expect(parseLocation('/connect', '')).toEqual({ name: 'launch', owner: null, repo: null, mode: 'existing' })
    expect(parseLocation('/repo/vercel/next.js', '')).toEqual({ name: 'repo', owner: 'vercel', repo: 'next.js' })
    expect(parseLocation('/token/0x1111111111111111111111111111111111111111', '')).toEqual({
      name: 'token', address: '0x1111111111111111111111111111111111111111',
    })
    expect(parseLocation('/dashboard/launches', '')).toEqual({ name: 'launches' })
  })

  it('does not send unknown paths to home', () => {
    expect(parseLocation('/this-is-not-a-route', '')).toEqual({ name: 'notFound' })
    expect(parseLocation('/token/not-an-address', '')).toEqual({ name: 'notFound' })
  })
})
