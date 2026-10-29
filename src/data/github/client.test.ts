import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fetchRepository,
  loadAllCommitHistory,
  loadEarlierHistory,
  parseRepositoryInput,
} from './client'

const repoRecord = {
  name: 'project',
  full_name: 'garden/project',
  description: null,
  html_url: 'https://github.com/garden/project',
  default_branch: 'main',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
  pushed_at: '2024-01-02T00:00:00Z',
  stargazers_count: 2,
  forks_count: 1,
  open_issues_count: 0,
  owner: { login: 'garden' },
}

function response(
  body: unknown,
  options: { status?: number; headers?: Record<string, string> } = {},
) {
  return new Response(JSON.stringify(body), {
    status: options.status ?? 200,
    headers: {
      'content-type': 'application/json',
      'x-ratelimit-remaining': '50',
      ...options.headers,
    },
  })
}

function commitRecord(sha: string, date: string) {
  return {
    sha,
    html_url: `https://github.com/garden/project/commit/${sha}`,
    author: null,
    commit: {
      message: `Commit ${sha}`,
      author: { name: 'A gardener', date },
      committer: { name: 'A gardener', date },
    },
    parents: [],
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('GitHub repository access', () => {
  it('accepts repository URLs and owner/name input, and rejects unrelated URLs', () => {
    expect(parseRepositoryInput('github.com/owner/repo')).toEqual({
      owner: 'owner',
      name: 'repo',
      fullName: 'owner/repo',
    })
    expect(parseRepositoryInput('https://github.com/Owner/Repo/tree/main')).toEqual({
      owner: 'Owner',
      name: 'Repo',
      fullName: 'Owner/Repo',
    })
    expect(parseRepositoryInput('owner/repo.git')).toEqual({
      owner: 'owner',
      name: 'repo',
      fullName: 'owner/repo',
    })
    expect(parseRepositoryInput('git@github.com:owner/repo.git')).toEqual({
      owner: 'owner',
      name: 'repo',
      fullName: 'owner/repo',
    })
    expect(parseRepositoryInput('https://gitlab.com/owner/repo')).toBeNull()
    expect(parseRepositoryInput('owner')).toBeNull()
  })

  it('loads one page of each signal in sequence and records available older pages', async () => {
    const calls: string[] = []
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      calls.push(url)
      if (url.endsWith('/repos/garden/project')) return response(repoRecord)
      if (url.includes('/commits?'))
        return response([], {
          headers: {
            link: '<https://api.github.com/repos/garden/project/commits?page=2>; rel="next"',
          },
        })
      if (url.includes('/branches?')) return response([])
      if (url.includes('/pulls?')) return response([])
      if (url.includes('/issues?')) return response([])
      if (url.includes('/releases?')) return response([])
      if (url.includes('/contributors?')) return response([])
      throw new Error(`Unexpected request: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const bundle = await fetchRepository('garden/project', true)
    expect(calls).toHaveLength(7)
    expect(bundle.repository.fullName).toBe('garden/project')
    expect(bundle.categories.commits.nextPage).toContain('page=2')
    expect(bundle.loadedPages.commits).toBe(1)
  })

  it('loads all commit pages sequentially and publishes complete coverage', async () => {
    const calls: string[] = []
    const firstCommit = commitRecord('a'.repeat(40), '2024-01-02T00:00:00Z')
    const secondCommit = commitRecord('b'.repeat(40), '2024-01-01T00:00:00Z')
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      calls.push(url)
      if (url.endsWith('/repos/garden/project')) return response(repoRecord)
      if (url.includes('/commits?') && url.includes('page=2')) return response([secondCommit])
      if (url.includes('/commits?'))
        return response([firstCommit], {
          headers: {
            link: '<https://api.github.com/repos/garden/project/commits?page=2>; rel="next"',
          },
        })
      if (
        url.includes('/branches?') ||
        url.includes('/pulls?') ||
        url.includes('/issues?') ||
        url.includes('/releases?') ||
        url.includes('/contributors?')
      )
        return response([])
      throw new Error(`Unexpected request: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const initial = await fetchRepository('garden/project', true)
    expect(initial.commits).toHaveLength(1)
    expect(initial.commitHistory).toMatchObject({
      loadedCount: 1,
      totalCount: null,
      isComplete: false,
    })
    expect(calls).toHaveLength(7)
    const updates: number[] = []
    const complete = await loadAllCommitHistory(initial, progress =>
      updates.push(progress.commitHistory.loadedCount),
    )
    expect(complete.commits.map(commit => commit.sha)).toEqual([firstCommit.sha, secondCommit.sha])
    expect(complete.categories.commits.nextPage).toBeNull()
    expect(complete.loadedPages.commits).toBe(2)
    expect(complete.commitHistory).toMatchObject({
      loadedCount: 2,
      totalCount: 2,
      isLoading: false,
      isComplete: true,
      message: null,
    })
    expect(updates).toContain(1)
    expect(updates).toContain(2)
    expect(calls).toHaveLength(8)
  })

  it('keeps loaded commits after a quota error and resumes without duplicating overlapping pages', async () => {
    let commitPageTwoAttempts = 0
    const firstCommit = commitRecord('a'.repeat(40), '2024-01-02T00:00:00Z')
    const secondCommit = commitRecord('b'.repeat(40), '2024-01-01T00:00:00Z')
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/repos/garden/project')) return response(repoRecord)
      if (url.includes('/commits?') && url.includes('page=2')) {
        commitPageTwoAttempts += 1
        if (commitPageTwoAttempts === 1) {
          return response(
            { message: 'API rate limit exceeded' },
            {
              status: 403,
              headers: {
                'x-ratelimit-remaining': '0',
                'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600),
              },
            },
          )
        }
        return response([firstCommit, secondCommit], { headers: { 'x-ratelimit-remaining': '40' } })
      }
      if (url.includes('/commits?'))
        return response([firstCommit], {
          headers: {
            link: '<https://api.github.com/repos/garden/project/commits?page=2>; rel="next"',
          },
        })
      if (
        url.includes('/branches?') ||
        url.includes('/pulls?') ||
        url.includes('/issues?') ||
        url.includes('/releases?') ||
        url.includes('/contributors?')
      )
        return response([])
      throw new Error(`Unexpected request: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const initial = await fetchRepository('garden/project', true)
    const paused = await loadAllCommitHistory(initial)
    expect(paused.commits).toHaveLength(1)
    expect(paused.commitHistory.isComplete).toBe(false)
    expect(paused.commitHistory.message).toContain('API rate limit exceeded')
    expect(paused.categories.commits.nextPage).toContain('page=2')

    const resumed = await loadAllCommitHistory(paused, undefined, undefined, true)
    expect(resumed.commits.map(commit => commit.sha)).toEqual([firstCommit.sha, secondCommit.sha])
    expect(resumed.commitHistory).toMatchObject({
      loadedCount: 2,
      totalCount: 2,
      isComplete: true,
      message: null,
    })
    expect(commitPageTwoAttempts).toBe(2)
  })

  it('preserves the pending page after a network error and can continue from it', async () => {
    let commitPageTwoAttempts = 0
    const firstCommit = commitRecord('a'.repeat(40), '2024-01-02T00:00:00Z')
    const secondCommit = commitRecord('b'.repeat(40), '2024-01-01T00:00:00Z')
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/repos/garden/project')) return response(repoRecord)
      if (url.includes('/commits?') && url.includes('page=2')) {
        commitPageTwoAttempts += 1
        if (commitPageTwoAttempts === 1) throw new TypeError('offline')
        return response([secondCommit])
      }
      if (url.includes('/commits?'))
        return response([firstCommit], {
          headers: {
            link: '<https://api.github.com/repos/garden/project/commits?page=2>; rel="next"',
          },
        })
      if (
        url.includes('/branches?') ||
        url.includes('/pulls?') ||
        url.includes('/issues?') ||
        url.includes('/releases?') ||
        url.includes('/contributors?')
      )
        return response([])
      throw new Error(`Unexpected request: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const initial = await fetchRepository('garden/project', true)
    const paused = await loadAllCommitHistory(initial)
    expect(paused.commitHistory.message).toBe('offline')
    expect(paused.commits).toHaveLength(1)
    expect(paused.categories.commits.nextPage).toContain('page=2')

    const resumed = await loadAllCommitHistory(paused, undefined, undefined, true)
    expect(resumed.commitHistory).toMatchObject({ loadedCount: 2, totalCount: 2, isComplete: true })
    expect(resumed.commits.map(commit => commit.sha)).toEqual([firstCommit.sha, secondCommit.sha])
  })

  it('marks a repository with no commits complete without requesting another page', async () => {
    const calls: string[] = []
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      calls.push(url)
      if (url.endsWith('/repos/garden/project')) return response(repoRecord)
      if (url.includes('/commits?')) return response([])
      if (
        url.includes('/branches?') ||
        url.includes('/pulls?') ||
        url.includes('/issues?') ||
        url.includes('/releases?') ||
        url.includes('/contributors?')
      )
        return response([])
      throw new Error(`Unexpected request: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const bundle = await fetchRepository('garden/project', true)
    expect(bundle.commitHistory).toMatchObject({
      loadedCount: 0,
      totalCount: 0,
      isComplete: true,
      isLoading: false,
    })
    expect(calls.filter(url => url.includes('/commits?'))).toHaveLength(1)
  })

  it('keeps commit pagination separate from older pull request, issue, and release pages', async () => {
    const calls: string[] = []
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      calls.push(url)
      if (url.endsWith('/repos/garden/project')) return response(repoRecord)
      if (url.includes('/commits?'))
        return response([commitRecord('a'.repeat(40), '2024-01-02T00:00:00Z')], {
          headers: {
            link: '<https://api.github.com/repos/garden/project/commits?page=2>; rel="next"',
          },
        })
      if (url.includes('/pulls?') && url.includes('page=2')) return response([{ number: 1 }])
      if (url.includes('/pulls?'))
        return response([], {
          headers: {
            link: '<https://api.github.com/repos/garden/project/pulls?page=2>; rel="next"',
          },
        })
      if (
        url.includes('/branches?') ||
        url.includes('/issues?') ||
        url.includes('/releases?') ||
        url.includes('/contributors?')
      )
        return response([])
      throw new Error(`Unexpected request: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const initial = await fetchRepository('garden/project', true)
    const extended = await loadEarlierHistory(initial)
    expect(extended.pullRequests).toHaveLength(1)
    expect(extended.categories.commits.nextPage).toContain('commits?page=2')
    expect(calls.some(url => url.includes('commits?page=2'))).toBe(false)
  })

  it('stops on an inaccessible repository and preserves GitHub status details', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response({ message: 'Not Found' }, { status: 404 })),
    )
    await expect(fetchRepository('private/project', true)).rejects.toMatchObject({ status: 404 })
  })

  it('surfaces a rate-limit response for recovery messaging', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        response(
          { message: 'API rate limit exceeded' },
          {
            status: 403,
            headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1900000000' },
          },
        ),
      ),
    )
    await expect(fetchRepository('garden/project', true)).rejects.toMatchObject({
      status: 403,
      remaining: 0,
    })
  })
})
