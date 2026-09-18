import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { SITE_URL, tweetIntent, X_AT, X_HANDLE, X_URL } from './social.ts'

const root = dirname(fileURLToPath(import.meta.url))

const SURFACES = [
  '../../index.html',
  '../components/Nav.tsx',
  '../components/Footer.tsx',
  '../components/XLink.tsx',
  '../pages/Studio.tsx',
  '../pages/Docs.tsx',
  '../components/PadLive.tsx',
] as const

describe('social', () => {
  it('keeps the official X handle', () => {
    expect(X_HANDLE).toBe('launcherfamily')
    expect(X_AT).toBe('@launcherfamily')
    expect(X_URL).toBe('https://x.com/launcherfamily')
    expect(SITE_URL).toBe('https://launcher.family')
  })

  it('attributes share intents to the official handle', () => {
    const href = tweetIntent('Steel is live on Robinhood.', 'https://steel.launcher.family/')
    const parsed = new URL(href)
    expect(parsed.origin + parsed.pathname).toBe('https://twitter.com/intent/tweet')
    expect(parsed.searchParams.get('via')).toBe(X_HANDLE)
    expect(parsed.searchParams.get('text')).toBe('Steel is live on Robinhood.')
    expect(parsed.searchParams.get('url')).toBe('https://steel.launcher.family/')
  })

  it('publishes the handle on product surfaces', () => {
    for (const rel of SURFACES) {
      const text = readFileSync(join(root, rel), 'utf8')
      expect(text, rel).toMatch(/@launcherfamily|X_AT|X_URL|XLink|tweetIntent/)
    }
    const html = readFileSync(join(root, '../../index.html'), 'utf8')
    expect(html).toContain('name="twitter:site" content="@launcherfamily"')
    expect(html).toContain('name="twitter:creator" content="@launcherfamily"')
  })
})
