import type {
  CategoryStatus,
  CommitHistoryCoverage,
  GitHubBundle,
  HistoryCategory,
  ParsedRepository,
  RateLimitState,
} from './types'
import type { RepositorySnapshot } from '../../domain/types'

const API_ROOT = 'https://api.github.com'
const API_VERSION = '2022-11-28'
const cache = new Map<string, GitHubBundle>()

interface GitHubRepositoryRecord {
  name: string
  full_name: string
  description: string | null
  html_url: string
  default_branch: string
  created_at: string
  updated_at: string
  pushed_at: string | null
  stargazers_count: number
  forks_count: number
  open_issues_count: number
  size?: number
  owner: { login: string }
}

export class GitHubRequestError extends Error {
  status: number
  resetAt: string | null
  remaining: number | null

  constructor(message: string, status: number, resetAt: string | null, remaining: number | null) {
    super(message)
    this.name = 'GitHubRequestError'
    this.status = status
    this.resetAt = resetAt
    this.remaining = remaining
  }
}

export function parseRepositoryInput(input: string): ParsedRepository | null {
  const value = input.trim()
  if (!value) return null

  let owner = ''
  let name = ''

  try {
    if (value.startsWith('git@github.com:')) {
      const path = value.slice('git@github.com:'.length).replace(/\.git\/?$/, '')
      ;[owner, name] = path.split('/')
    } else if (/^(https?:\/\/)?github\.com\//i.test(value)) {
      const normalized = value.includes('://') ? value : `https://${value}`
      const url = new URL(normalized)
      if (url.hostname.toLowerCase() !== 'github.com') return null
      const segments = url.pathname.split('/').filter(Boolean)
      ;[owner, name] = segments
    } else {
      const path = value.replace(/\.git\/?$/, '').replace(/^\/+|\/+$/g, '')
      const segments = path.split('/')
      if (segments.length !== 2) return null
      ;[owner, name] = segments
    }
  } catch {
    return null
  }

  if (!owner || !name) return null
  if (!/^[a-z\d_.-]+$/i.test(owner) || !/^[a-z\d_.-]+$/i.test(name)) return null
  return { owner, name, fullName: `${owner}/${name}` }
}

function readRateLimit(headers: Headers): RateLimitState {
  const remainingValue = headers.get('x-ratelimit-remaining')
  const resetValue = headers.get('x-ratelimit-reset')
  const resetEpoch = resetValue ? Number(resetValue) : NaN
  return {
    remaining: remainingValue === null ? null : Number(remainingValue),
    resetAt: Number.isFinite(resetEpoch) ? new Date(resetEpoch * 1000).toISOString() : null,
  }
}

function nextLink(linkHeader: string | null): string | null {
  if (!linkHeader) return null
  const next = linkHeader.split(',').find((part) => /rel="next"/.test(part))
  return next?.match(/<([^>]+)>/)?.[1] ?? null
}

async function requestJson<T>(url: string, signal?: AbortSignal): Promise<{ data: T; rateLimit: RateLimitState; nextPage: string | null }> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': API_VERSION,
    },
    signal,
  })
  const rateLimit = readRateLimit(response.headers)
  if (!response.ok) {
    let message = response.statusText || 'GitHub could not load this repository.'
    try {
      const payload = (await response.json()) as { message?: string }
      if (payload.message) message = payload.message
    } catch {
      // Keep the HTTP status text when GitHub returns no JSON body.
    }
    throw new GitHubRequestError(message, response.status, rateLimit.resetAt, rateLimit.remaining)
  }
  return { data: (await response.json()) as T, rateLimit, nextPage: nextLink(response.headers.get('link')) }
}

function toSnapshot(record: GitHubRepositoryRecord): RepositorySnapshot {
  return {
    owner: record.owner.login,
    name: record.name,
    fullName: record.full_name,
    description: record.description,
    htmlUrl: record.html_url,
    defaultBranch: record.default_branch,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    pushedAt: record.pushed_at,
    stars: record.stargazers_count,
    forks: record.forks_count,
    openIssues: record.open_issues_count,
    sizeKb: record.size ?? 0,
  }
}

function emptyCategories(): Record<HistoryCategory, CategoryStatus> {
  return {
    commits: { nextPage: null, message: null },
    pullRequests: { nextPage: null, message: null },
    issues: { nextPage: null, message: null },
    releases: { nextPage: null, message: null },
  }
}

function emptyLoadedPages(): GitHubBundle['loadedPages'] {
  return { commits: 0, pullRequests: 0, issues: 0, releases: 0 }
}

function emptyCommitHistory(): CommitHistoryCoverage {
  return { loadedCount: 0, totalCount: null, isLoading: false, isComplete: false, message: null }
}

function rateNote(rateLimit: RateLimitState): string | null {
  if (rateLimit.remaining === null || rateLimit.remaining > 0) return null
  if (rateLimit.resetAt && Date.parse(rateLimit.resetAt) <= Date.now()) return null
  return rateLimit.resetAt
    ? `GitHub's request limit has been reached. Try again after ${new Date(rateLimit.resetAt).toLocaleTimeString()}.`
    : "GitHub's request limit has been reached. Try again later."
}

function categoryUrl(owner: string, repo: string, key: HistoryCategory, defaultBranch: string): string {
  const root = `${API_ROOT}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
  const queries: Record<HistoryCategory, string> = {
    commits: `commits?sha=${encodeURIComponent(defaultBranch)}&per_page=100`,
    pullRequests: 'pulls?state=all&sort=created&direction=desc&per_page=100',
    issues: 'issues?state=all&sort=created&direction=desc&per_page=100',
    releases: 'releases?per_page=100',
  }
  return `${root}/${queries[key]}`
}

function setCategoryPage(bundle: GitHubBundle, key: HistoryCategory, items: unknown[]) {
  if (key === 'commits') bundle.commits = [...bundle.commits, ...(items as GitHubBundle['commits'])]
  else if (key === 'pullRequests') bundle.pullRequests = [...bundle.pullRequests, ...(items as GitHubBundle['pullRequests'])]
  else if (key === 'issues') bundle.issues = [...bundle.issues, ...(items as GitHubBundle['issues'])]
  else bundle.releases = [...bundle.releases, ...(items as GitHubBundle['releases'])]
}

function setFirstCategoryPage(bundle: GitHubBundle, key: HistoryCategory, items: unknown[]) {
  if (key === 'commits') bundle.commits = items as GitHubBundle['commits']
  else if (key === 'pullRequests') bundle.pullRequests = items as GitHubBundle['pullRequests']
  else if (key === 'issues') bundle.issues = items as GitHubBundle['issues']
  else bundle.releases = items as GitHubBundle['releases']
}

export async function fetchRepository(input: string, forceRefresh = false): Promise<GitHubBundle> {
  const parsed = parseRepositoryInput(input)
  if (!parsed) throw new GitHubRequestError('Enter a GitHub repository URL, like github.com/owner/repo.', 400, null, null)
  const cacheKey = parsed.fullName.toLowerCase()
  const cached = cache.get(cacheKey)
  if (cached && !forceRefresh) return cached

  const baseUrl = `${API_ROOT}/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.name)}`
  const repoResult = await requestJson<GitHubRepositoryRecord>(baseUrl)
  const repository = toSnapshot(repoResult.data)
  const categories = emptyCategories()
  const loadedPages = emptyLoadedPages()
  const notes: string[] = []
  let rateLimit = repoResult.rateLimit

  const bundle: GitHubBundle = {
    repository,
    commits: [],
    branches: [],
    pullRequests: [],
    issues: [],
    releases: [],
    contributors: [],
    categories,
    commitHistory: emptyCommitHistory(),
    rateLimit,
    loadedPages,
    notes,
  }

  const pageKeys: HistoryCategory[] = ['commits', 'pullRequests', 'issues', 'releases']
  for (const key of pageKeys) {
    const limited = rateNote(rateLimit)
    if (limited) {
      categories[key].message = limited
      if (key === 'commits') bundle.commitHistory.message = limited
      notes.push(limited)
      continue
    }
    try {
      const result = await requestJson<unknown[]>(categoryUrl(parsed.owner, parsed.name, key, repository.defaultBranch))
      setFirstCategoryPage(bundle, key, result.data)
      categories[key] = { nextPage: result.nextPage, message: null }
      loadedPages[key] = 1
      if (key === 'commits') {
        const commitCount = bundle.commits.length
        bundle.commitHistory = {
          loadedCount: commitCount,
          totalCount: result.nextPage ? null : commitCount,
          isLoading: false,
          isComplete: !result.nextPage,
          message: null,
        }
      }
      rateLimit = result.rateLimit
      bundle.rateLimit = rateLimit
    } catch (error) {
      const message = error instanceof Error ? error.message : 'This event history could not be loaded.'
      categories[key] = { nextPage: null, message }
      if (key === 'commits') bundle.commitHistory.message = message
      notes.push(`${key}: ${message}`)
      if (error instanceof GitHubRequestError) {
        rateLimit = { remaining: error.remaining, resetAt: error.resetAt }
        bundle.rateLimit = rateLimit
      }
    }
  }

  if (!rateNote(rateLimit)) {
    const extras = [
      { key: 'branches', path: 'branches?per_page=100' },
      { key: 'contributors', path: 'contributors?per_page=100' },
    ] as const
    for (const extra of extras) {
      const limited = rateNote(rateLimit)
      if (limited) {
        notes.push(limited)
        break
      }
      try {
        const result = await requestJson<unknown[]>(`${baseUrl}/${extra.path}`)
        if (extra.key === 'branches') bundle.branches = result.data as GitHubBundle['branches']
        else bundle.contributors = result.data as GitHubBundle['contributors']
        if (result.nextPage) notes.push(`Only the first 100 ${extra.key} are included in this view.`)
        rateLimit = result.rateLimit
        bundle.rateLimit = rateLimit
      } catch (error) {
        const message = error instanceof Error ? error.message : 'This repository signal could not be loaded.'
        notes.push(`${extra.key}: ${message}`)
        if (error instanceof GitHubRequestError) {
          rateLimit = { remaining: error.remaining, resetAt: error.resetAt }
          bundle.rateLimit = rateLimit
        }
      }
    }
  } else {
    notes.push(rateNote(rateLimit)!)
  }

  cache.set(cacheKey, bundle)
  return bundle
}

export async function loadEarlierHistory(bundle: GitHubBundle): Promise<GitHubBundle> {
  const updated: GitHubBundle = {
    ...bundle,
    commits: [...bundle.commits],
    pullRequests: [...bundle.pullRequests],
    issues: [...bundle.issues],
    releases: [...bundle.releases],
    categories: { ...bundle.categories },
    loadedPages: { ...bundle.loadedPages },
    notes: [...bundle.notes],
  }
  const keys: HistoryCategory[] = ['pullRequests', 'issues', 'releases']

  for (const key of keys) {
    const status = updated.categories[key]
    if (!status.nextPage || status.message) continue
    const limited = rateNote(updated.rateLimit)
    if (limited) {
      status.message = limited
      updated.notes.push(limited)
      break
    }
    try {
      const result = await requestJson<unknown[]>(status.nextPage)
      setCategoryPage(updated, key, result.data)
      updated.categories[key] = { nextPage: result.nextPage, message: null }
      updated.loadedPages[key] += 1
      updated.rateLimit = result.rateLimit
      const quotaNote = rateNote(updated.rateLimit)
      if (quotaNote) {
        updated.notes.push(quotaNote)
        break
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Earlier history could not be loaded.'
      updated.categories[key] = { ...status, message }
      updated.notes.push(`${key}: ${message}`)
      if (error instanceof GitHubRequestError) {
        updated.rateLimit = { remaining: error.remaining, resetAt: error.resetAt }
      }
      break
    }
  }

  const latest = cache.get(bundle.repository.fullName.toLowerCase())
  if (latest) {
    updated.commits = latest.commits
    updated.categories.commits = latest.categories.commits
    updated.commitHistory = latest.commitHistory
    updated.loadedPages.commits = latest.loadedPages.commits
  }
  cache.set(bundle.repository.fullName.toLowerCase(), updated)
  return updated
}

function cloneBundle(bundle: GitHubBundle): GitHubBundle {
  return {
    ...bundle,
    commits: [...bundle.commits],
    pullRequests: [...bundle.pullRequests],
    issues: [...bundle.issues],
    releases: [...bundle.releases],
    branches: [...bundle.branches],
    contributors: [...bundle.contributors],
    categories: {
      commits: { ...bundle.categories.commits },
      pullRequests: { ...bundle.categories.pullRequests },
      issues: { ...bundle.categories.issues },
      releases: { ...bundle.categories.releases },
    },
    commitHistory: { ...bundle.commitHistory },
    loadedPages: { ...bundle.loadedPages },
    notes: [...bundle.notes],
  }
}

function uniqueCommits(existing: GitHubBundle['commits'], incoming: GitHubBundle['commits']): GitHubBundle['commits'] {
  const known = new Set(existing.map((commit) => commit.sha))
  const unique = [...existing]
  for (const commit of incoming) {
    if (known.has(commit.sha)) continue
    known.add(commit.sha)
    unique.push(commit)
  }
  return unique
}

function saveCommitHistory(bundle: GitHubBundle, onProgress?: (bundle: GitHubBundle) => void): GitHubBundle {
  const key = bundle.repository.fullName.toLowerCase()
  const latest = cache.get(key)
  const saved = latest
    ? {
        ...bundle,
        pullRequests: latest.pullRequests,
        issues: latest.issues,
        releases: latest.releases,
        categories: {
          ...bundle.categories,
          pullRequests: latest.categories.pullRequests,
          issues: latest.categories.issues,
          releases: latest.categories.releases,
        },
        loadedPages: {
          ...bundle.loadedPages,
          pullRequests: latest.loadedPages.pullRequests,
          issues: latest.loadedPages.issues,
          releases: latest.loadedPages.releases,
        },
        notes: [...new Set([...bundle.notes, ...latest.notes])],
      }
    : bundle
  cache.set(key, saved)
  onProgress?.(saved)
  return saved
}

/** Loads the default branch's remaining commit pages, publishing an immutable snapshot after each page. */
export async function loadAllCommitHistory(
  bundle: GitHubBundle,
  onProgress?: (bundle: GitHubBundle) => void,
  signal?: AbortSignal,
  retryQuotaOnce = false,
): Promise<GitHubBundle> {
  let current = cloneBundle(bundle)
  current.commitHistory = {
    ...current.commitHistory,
    loadedCount: current.commits.length,
    totalCount: null,
    isLoading: true,
    isComplete: false,
    message: null,
  }
  current = saveCommitHistory(current, onProgress)

  let canAttemptDespiteCachedQuota = retryQuotaOnce
  while (current.categories.commits.nextPage) {
    if (signal?.aborted) {
      current = {
        ...current,
        commitHistory: { ...current.commitHistory, isLoading: false },
      }
      return saveCommitHistory(current, onProgress)
    }

    const limited = rateNote(current.rateLimit)
    if (limited && !canAttemptDespiteCachedQuota) {
      current = {
        ...current,
        commitHistory: { ...current.commitHistory, isLoading: false, message: limited },
      }
      return saveCommitHistory(current, onProgress)
    }
    canAttemptDespiteCachedQuota = false

    let result: Awaited<ReturnType<typeof requestJson<GitHubBundle['commits']>>>
    try {
      result = await requestJson<GitHubBundle['commits']>(current.categories.commits.nextPage, signal)
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        current = {
          ...current,
          commitHistory: { ...current.commitHistory, isLoading: false },
        }
        return saveCommitHistory(current, onProgress)
      }
      const message = error instanceof Error ? error.message : 'Earlier commits could not be loaded.'
      current = {
        ...current,
        rateLimit: error instanceof GitHubRequestError
          ? { remaining: error.remaining, resetAt: error.resetAt }
          : current.rateLimit,
        commitHistory: { ...current.commitHistory, isLoading: false, message },
      }
      return saveCommitHistory(current, onProgress)
    }

    const commits = uniqueCommits(current.commits, result.data)
    const isComplete = result.nextPage === null
    current = {
      ...current,
      commits,
      categories: { ...current.categories, commits: { nextPage: result.nextPage, message: null } },
      loadedPages: { ...current.loadedPages, commits: current.loadedPages.commits + 1 },
      rateLimit: result.rateLimit,
      commitHistory: {
        loadedCount: commits.length,
        totalCount: isComplete ? commits.length : null,
        isLoading: !isComplete,
        isComplete,
        message: null,
      },
    }
    current = saveCommitHistory(current, onProgress)
  }

  if (!current.commitHistory.isComplete) {
    current = {
      ...current,
      commitHistory: {
        loadedCount: current.commits.length,
        totalCount: current.commits.length,
        isLoading: false,
        isComplete: true,
        message: null,
      },
    }
    current = saveCommitHistory(current, onProgress)
  }
  return current
}
