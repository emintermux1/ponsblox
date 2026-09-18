import { describe, expect, it } from 'vitest'
import { renderReadme } from './Readme.tsx'

describe('renderReadme', () => {
  it('renders GitHub HTML badges instead of escaping them', () => {
    const html = renderReadme(
      '<p align="center"><a href="https://trendshift.io/repositories/1"><img src="https://trendshift.io/badge.svg" alt="Trendshift" width="250" height="55" /></a></p>',
    )
    expect(html).toContain('<img src="https://trendshift.io/badge.svg"')
    expect(html).toContain('href="https://trendshift.io/repositories/1"')
    expect(html).not.toContain('&lt;a')
    expect(html).not.toContain('&lt;img')
  })

  it('still renders markdown', () => {
    expect(renderReadme('**bold**')).toContain('<strong>bold</strong>')
    expect(renderReadme('![logo](https://example.com/a.png)')).toContain('<img src="https://example.com/a.png"')
  })

  it('rewrites relative images onto the GitHub raw host', () => {
    const html = renderReadme('<img src="docs/story.gif" alt="demo" />', 'https://raw.githubusercontent.com/acme/kit/HEAD/')
    expect(html).toContain('src="https://raw.githubusercontent.com/acme/kit/HEAD/docs/story.gif"')
  })

  it('drops script and javascript URLs', () => {
    expect(renderReadme('<script>alert(1)</script>hello')).toBe('<p>hello</p>')
    expect(renderReadme('<a href="javascript:alert(1)">x</a>')).not.toContain('javascript:')
    expect(renderReadme('<img src="https://x.com/a.png" onerror="alert(1)" />')).not.toContain('onerror')
  })
})
