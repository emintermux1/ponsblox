import { describe, expect, it } from 'vitest'
import { byGitlabName, parseGithubInput, stripGitlabSuffix } from './naming.ts'

describe('By GitLab naming', () => {
  it('appends the suffix once', () => {
    expect(byGitlabName('React')).toBe('React By GitLab')
    expect(byGitlabName('React By GitLab')).toBe('React By GitLab')
  })

  it('strips a pasted suffix so the user cannot edit it away', () => {
    expect(stripGitlabSuffix('React By GitLab')).toBe('React')
  })

  it('parses github urls and owner/name', () => {
    expect(parseGithubInput('https://github.com/facebook/react')).toEqual({ owner: 'facebook', name: 'react' })
    expect(parseGithubInput('facebook/react.git')).toEqual({ owner: 'facebook', name: 'react' })
    expect(parseGithubInput('not a repo')).toBeNull()
  })
})
