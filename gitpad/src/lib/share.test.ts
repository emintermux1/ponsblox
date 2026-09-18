import { describe, expect, it } from 'vitest'
import { submittedHash } from './deployPhase.ts'
import { defaultLaunchPost, layoutForFormat } from './share.ts'
import { parseLocation } from './router.ts'
import { shareCardSvg } from '../server/og.ts'

describe('launch share copy', () => {
  it('suggests editable X copy and never claims auto-post', () => {
    const text = defaultLaunchPost({
      displayName: 'OpenClaw By GitLab',
      symbol: 'CLAW',
      owner: 'openclaw',
      repo: 'openclaw',
      token: '0x1111111111111111111111111111111111111111',
      stars: 92400,
    })
    expect(text).toContain('OpenClaw is now live on GitPad.')
    expect(text).toContain('OpenClaw By GitLab $CLAW')
    expect(text).toContain('Paired with: openclaw/openclaw')
    expect(text).toContain('CA: 0x1111111111111111111111111111111111111111')
  })
})

describe('share formats', () => {
  it('maps X / square / OpenGraph', () => {
    expect(layoutForFormat('x')).toBe('launch')
    expect(layoutForFormat('square')).toBe('square')
    expect(layoutForFormat('og')).toBe('og')
    expect(shareCardSvg({ title: 'OpenClaw By GitLab', ticker: '$CLAW', repo: 'openclaw/openclaw', layout: 'square' })).toContain('width="1200" height="1200"')
    expect(shareCardSvg({ title: 'OpenClaw By GitLab', layout: 'og' })).toContain('NOW LIVE ON GITPAD')
    expect(shareCardSvg({ title: 'GitPad', layout: 'home' })).toContain('trending GitHub repositories')
  })
})

describe('deploy hash parse', () => {
  it('reads a submitted hash and ignores other lines', () => {
    expect(submittedHash('transaction submitted 0x' + 'ab'.repeat(32))).toMatch(/^0x[a-f0-9]{64}$/)
    expect(submittedHash('waiting for Pons V2')).toBeNull()
  })
})

describe('dashboard route', () => {
  it('opens /dashboard/launches', () => {
    expect(parseLocation('/dashboard/launches', '')).toEqual({ name: 'launches' })
    expect(parseLocation('/dashboard', '')).toEqual({ name: 'launches' })
  })
})
