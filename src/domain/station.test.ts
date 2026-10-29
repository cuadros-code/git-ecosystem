import { describe, expect, it } from 'vitest'
import { buildStationLayout, buildStationModules, selectStationSignals, solarArrayCount } from './station'
import { buildWorldState } from './timeline'
import type { TimelineEvent } from './types'

const commits: TimelineEvent[] = Array.from({ length: 320 }, (_, index) => ({
  id: `commit-${index}`, kind: 'commit', at: new Date(Date.UTC(2024, 0, index + 1)).toISOString(),
  title: 'Commit', detail: '', author: null, url: null, sha: `${index}`, parents: [],
}))

describe('station layout', () => {
  it('keeps fixed coordinates for the same repository regardless of date', () => {
    expect(buildStationLayout('owner/repo')).toEqual(buildStationLayout('OWNER/REPO'))
    expect(buildStationLayout('owner/repo').modules).toHaveLength(8)
  })
  it('grows chronological groups independently as commits arrive', () => {
    const early = buildStationModules(commits, commits[0].at)
    expect(early).toHaveLength(1)
    expect(early[0].stage).toBe(1)
    expect(buildStationModules(commits, commits[6].at)[0].stage).toBe(2)
    expect(buildStationModules(commits, commits[13].at)[0].stage).toBe(3)
    const middle = buildStationModules(commits, commits[20].at)
    expect(middle.map((group) => group.stage)).toEqual([3, 1])
    expect(buildStationModules(commits, commits[159].at).map((group) => group.stage)).toEqual(Array(8).fill(3))
    expect(buildStationModules(commits, '2023-01-01')).toEqual([])
  })
  it('handles empty repositories and unordered commits deterministically', () => {
    expect(buildStationModules([], '2024-01-01')).toEqual([])
    expect(buildStationModules([...commits].reverse(), commits[10].at)).toEqual(buildStationModules(commits, commits[10].at))
  })
  it('expands as commits grow from 100 to 300 without redistributing existing groups', () => {
    const oneHundred = commits.slice(0, 100)
    const threeHundred = commits.slice(0, 300)
    const first = buildStationModules(oneHundred, oneHundred[99].at)
    const later = buildStationModules(threeHundred, threeHundred[299].at)
    expect(first).toHaveLength(5)
    expect(later).toHaveLength(8)
    expect(buildStationModules(threeHundred, oneHundred[99].at)).toEqual(first)
    expect(solarArrayCount(100)).toBe(0)
    expect(solarArrayCount(300)).toBe(3)
    expect(solarArrayCount(1000)).toBe(4)
  })
  it('keeps the summary count aligned with uneven commit groups', () => {
    const uneven = commits.slice(0, 9)
    expect(buildWorldState(uneven, uneven[1].at).moduleCount).toBe(buildStationModules(uneven, uneven[1].at).length)
  })
  it('limits crew and releases and removes closed or future alerts', () => {
    const crew: TimelineEvent[] = Array.from({ length: 8 }, (_, index) => ({ id: `crew-${index}`, kind: 'contributor', at: '2024-01-01T00:00:00Z', title: 'Crew', detail: '', author: null, url: null, login: `crew-${index}`, avatarUrl: null }))
    const releases: TimelineEvent[] = Array.from({ length: 4 }, (_, index) => ({ id: `release-${index}`, kind: 'release', at: '2024-01-01T00:00:00Z', title: 'Release', detail: '', author: null, url: null, tagName: `${index}`, isPrerelease: false }))
    const bug: TimelineEvent = { id: 'bug', kind: 'bug', at: '2024-01-02T00:00:00Z', title: 'Alert', detail: '', author: null, url: null, number: 1, closedAt: '2024-01-04T00:00:00Z', labels: ['bug'] }
    const kinds = new Set(['contributor', 'release', 'bug'] as const)
    const before = selectStationSignals([...crew, ...releases, bug], '2024-01-03T00:00:00Z', kinds)
    expect(before.crew).toHaveLength(6)
    expect(before.sections).toHaveLength(3)
    expect(before.openAlerts).toHaveLength(1)
    expect(selectStationSignals([bug], '2024-01-01T00:00:00Z', kinds).openAlerts).toHaveLength(0)
    expect(selectStationSignals([bug], '2024-01-05T00:00:00Z', kinds).openAlerts).toHaveLength(0)
  })
})
