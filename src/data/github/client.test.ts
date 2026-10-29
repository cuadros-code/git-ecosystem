import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchRepository, loadEarlierHistory, parseRepositoryInput } from './client'

const repoRecord = {
  name: 'project', full_name: 'garden/project', description: null, html_url: 'https://github.com/garden/project',
  default_branch: 'main', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-02T00:00:00Z', pushed_at: '2024-01-02T00:00:00Z',
  stargazers_count: 2, forks_count: 1, open_issues_count: 0, owner: { login: 'garden' },
}

function response(body: unknown, options: { status?: number; headers?: Record<string, string> } = {}) {
  return new Response(JSON.stringify(body), {
    status: options.status ?? 200,
    headers: { 'content-type': 'application/json', 'x-ratelimit-remaining': '50', ...options.headers },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('GitHub repository access', () => {
  it('accepts repository URLs and owner/name input, and rejects unrelated URLs', () => {
    expect(parseRepositoryInput('github.com/owner/repo')).toEqual({ owner: 'owner', name: 'repo', fullName: 'owner/repo' })
    expect(parseRepositoryInput('https://github.com/Owner/Repo/tree/main')).toEqual({ owner: 'Owner', name: 'Repo', fullName: 'Owner/Repo' })
    expect(parseRepositoryInput('owner/repo.git')).toEqual({ owner: 'owner', name: 'repo', fullName: 'owner/repo' })
    expect(parseRepositoryInput('git@github.com:owner/repo.git')).toEqual({ owner: 'owner', name: 'repo', fullName: 'owner/repo' })
    expect(parseRepositoryInput('https://gitlab.com/owner/repo')).toBeNull()
    expect(parseRepositoryInput('owner')).toBeNull()
  })

  it('loads one page of each signal in sequence and records available older pages', async () => {
    const calls: string[] = []
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      calls.push(url)
      if (url.endsWith('/repos/garden/project')) return response(repoRecord)
      if (url.includes('/commits?')) return response([], { headers: { link: '<https://api.github.com/repos/garden/project/commits?page=2>; rel="next"' } })
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

  it('loads an older page only when requested and advances its cursor', async () => {
    const calls: string[] = []
    const olderCommit = {
      sha: 'c'.repeat(40), html_url: 'https://github.com/garden/project/commit/cccc', author: null,
      commit: { message: 'An older seed', author: { name: 'A gardener', date: '2023-01-01T00:00:00Z' }, committer: { name: 'A gardener', date: '2023-01-01T00:00:00Z' } }, parents: [],
    }
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      calls.push(url)
      if (url.endsWith('/repos/garden/project')) return response(repoRecord)
      if (url.includes('/commits?') && url.includes('page=2')) return response([olderCommit])
      if (url.includes('/commits?')) return response([], { headers: { link: '<https://api.github.com/repos/garden/project/commits?page=2>; rel="next"' } })
      if (url.includes('/branches?') || url.includes('/pulls?') || url.includes('/issues?') || url.includes('/releases?') || url.includes('/contributors?')) return response([])
      throw new Error(`Unexpected request: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const initial = await fetchRepository('garden/project', true)
    expect(initial.commits).toHaveLength(0)
    expect(calls).toHaveLength(7)
    const extended = await loadEarlierHistory(initial)
    expect(extended.commits).toHaveLength(1)
    expect(extended.categories.commits.nextPage).toBeNull()
    expect(calls).toHaveLength(8)
  })

  it('stops on an inaccessible repository and preserves GitHub status details', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response({ message: 'Not Found' }, { status: 404 })))
    await expect(fetchRepository('private/project', true)).rejects.toMatchObject({ status: 404 })
  })

  it('surfaces a rate-limit response for recovery messaging', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response({ message: 'API rate limit exceeded' }, { status: 403, headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1900000000' } })))
    await expect(fetchRepository('garden/project', true)).rejects.toMatchObject({ status: 403, remaining: 0 })
  })
})
