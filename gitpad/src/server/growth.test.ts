import { describe, expect, it } from 'vitest'
import { emptyStore } from './models.ts'
import { buildDaily, buildFeed, buildPulse } from './growth.ts'

describe('growth index', () => {
  it('pulse counts only what is in the store', () => {
    const store = emptyStore()
    store.repositories.push({
      githubId: 1, owner: 'acme', name: 'kit', fullName: 'acme/kit', htmlUrl: '',
      description: '', language: 'Go', archived: false, fork: false, mirror: false,
      parentFullName: null, renamedFrom: null, lastSeenAt: Date.now(),
    })
    store.tokens.push({
      address: '0x1111111111111111111111111111111111111111',
      githubId: 1, owner: 'acme', name: 'kit', symbol: 'KIT',
      displayName: 'Kit By GitLab', kind: 'canonical', deployer: '',
      deployedAt: Date.now(),
    })
    store.activity.push({
      id: '1', kind: 'trending_detected', at: Date.now(),
      title: 'acme/kit is moving', body: 'score 70', owner: 'acme', name: 'kit',
    })
    const pulse = buildPulse(store)
    expect(pulse.repositoriesTracked).toBe(1)
    expect(pulse.tokenizedRepositories).toBe(1)
    expect(pulse.trendingToday).toBe(1)
    expect(pulse.launchesToday).toBe(1)
    expect(pulse.source).toBe('indexed store')
  })

  it('does not invent feed volume lines', () => {
    const store = emptyStore()
    const feed = buildFeed(store, 'all')
    expect(feed).toEqual([])
  })

  it('daily empty sections stay empty without snapshots', () => {
    const daily = buildDaily(emptyStore(), [])
    const moves = daily.sections.find((s) => s.id === 'moves')
    expect(moves?.lines).toEqual([])
    expect(moves?.empty).toMatch(/No token moves/)
  })
})
