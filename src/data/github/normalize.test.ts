import { describe, expect, it } from 'vitest'
import { DEMO_EVENTS, DEMO_REPOSITORY } from '../sample/demo'
import { buildWorldState, relativePercent, timelineBounds } from '../../domain/timeline'
import { normalizeBundle } from './normalize'
import type { GitHubBundle } from './types'

function fixture(): GitHubBundle {
  return {
    repository: { ...DEMO_REPOSITORY, fullName: 'garden/project', owner: 'garden', name: 'project' },
    commits: [
      {
        sha: 'a'.repeat(40), html_url: 'https://github.com/garden/project/commit/aaaa',
        author: { login: 'mira', avatar_url: '', html_url: 'https://github.com/mira' },
        commit: { message: 'Grow the first path\n\nDetails', author: { name: 'Mira', date: '2024-01-02T10:00:00Z' }, committer: { name: 'Mira', date: '2024-01-02T11:00:00Z' } },
        parents: [],
      },
    ],
    branches: [{ name: 'side-garden', commit: { sha: 'b'.repeat(40), url: 'https://api.github.com/repos/garden/project/commits/bbbb' } }],
    pullRequests: [{
      number: 4, title: 'Connect two trails', body: 'A useful crossing', html_url: 'https://github.com/garden/project/pull/4', created_at: '2024-01-04T10:00:00Z', closed_at: '2024-01-06T10:00:00Z', merged_at: '2024-01-06T10:00:00Z',
      user: { login: 'mira', avatar_url: '', html_url: 'https://github.com/mira' }, head: { ref: 'side-garden' }, base: { ref: 'main' },
    }],
    issues: [
      { number: 7, title: 'A bug in the map', body: null, html_url: 'https://github.com/garden/project/issues/7', created_at: '2024-01-05T10:00:00Z', closed_at: '2024-01-07T10:00:00Z', user: null, labels: [{ name: 'Bug' }] },
      { number: 8, title: 'A question', body: null, html_url: 'https://github.com/garden/project/issues/8', created_at: '2024-01-05T11:00:00Z', closed_at: null, user: null, labels: [{ name: 'question' }] },
      { number: 9, title: 'Pull request mirror', body: null, html_url: 'https://github.com/garden/project/pull/9', created_at: '2024-01-05T12:00:00Z', closed_at: null, user: null, labels: [{ name: 'bug' }], pull_request: { url: 'https://api.github.com/pulls/9' } },
    ],
    releases: [{ id: 12, name: 'First clearing', tag_name: 'v1.0', body: null, html_url: 'https://github.com/garden/project/releases/tag/v1.0', created_at: '2024-01-08T10:00:00Z', published_at: '2024-01-08T11:00:00Z', prerelease: false, author: null }],
    contributors: [{ login: 'mira', avatar_url: '', html_url: 'https://github.com/mira', contributions: 4 }],
    categories: { commits: { nextPage: null, message: null }, pullRequests: { nextPage: null, message: null }, issues: { nextPage: null, message: null }, releases: { nextPage: null, message: null } },
    rateLimit: { remaining: 53, resetAt: null },
    loadedPages: { commits: 1, pullRequests: 1, issues: 1, releases: 1 },
    notes: [],
  }
}

describe('timeline mapping', () => {
  it('turns commits, active branches, pull requests, bug-labeled issues, contributors and releases into signals', () => {
    const events = normalizeBundle(fixture())
    expect(events.map((event) => event.kind)).toEqual(['branch', 'commit', 'contributor', 'pull_request', 'bug', 'release'])
    expect(events.find((event) => event.kind === 'commit')?.title).toBe('Grow the first path')
    expect(events.filter((event) => event.kind === 'bug')).toHaveLength(1)
    expect(events.find((event) => event.kind === 'branch')?.inferred).toBe(true)
  })

  it('reconstructs open and resolved signals at a selected date', () => {
    const events = normalizeBundle(fixture())
    const beforeClosure = buildWorldState(events, '2024-01-05T18:00:00Z')
    const afterClosure = buildWorldState(events, '2024-01-08T12:00:00Z')
    expect(beforeClosure.openPullRequests).toBe(1)
    expect(beforeClosure.openBugs).toBe(1)
    expect(afterClosure.resolvedPullRequests).toBe(1)
    expect(afterClosure.resolvedBugs).toBe(1)
    expect(afterClosure.releaseCount).toBe(1)
  })

  it('keeps a deterministic world state and returns timeline bounds', () => {
    const first = buildWorldState(DEMO_EVENTS, '2024-11-30T00:00:00Z')
    const second = buildWorldState(DEMO_EVENTS, '2024-11-30T00:00:00Z')
    expect(first).toEqual(second)
    expect(first.stationStageName).toBe('First module')
    expect(timelineBounds(DEMO_EVENTS, DEMO_REPOSITORY.createdAt, DEMO_REPOSITORY.updatedAt)[0]).toBe(new Date(DEMO_EVENTS[0].at).toISOString())
    expect(relativePercent(DEMO_EVENTS[0].at, DEMO_EVENTS[0].at, DEMO_EVENTS.at(-1)!.at)).toBe(0)
  })

  it('handles a repository with no available events', () => {
    const empty = fixture()
    empty.commits = []
    empty.branches = []
    empty.pullRequests = []
    empty.issues = []
    empty.releases = []
    empty.contributors = []
    const events = normalizeBundle(empty)
    const state = buildWorldState(events, '2024-01-10T00:00:00Z')
    expect(events).toEqual([])
    expect(state.commitCount).toBe(0)
    expect(state.contributorCount).toBe(0)
    expect(state.stationStageName).toBe('Awaiting launch')
    expect(state.moduleCount).toBe(0)
  })

  it('builds one shared station from commits and counts crew independently of branches', () => {
    const events = normalizeBundle(fixture())
    const date = '2024-01-08T12:00:00Z'
    const full = buildWorldState(events, date)
    const withoutBranchEvents = buildWorldState(events.filter((event) => event.kind !== 'branch'), date)
    expect(full.stationStage).toBe(withoutBranchEvents.stationStage)
    expect(full.moduleCount).toBe(withoutBranchEvents.moduleCount)
    expect(full.contributorCount).toBe(1)
    expect(full.stationProgress).toBe(1)
  })
})
