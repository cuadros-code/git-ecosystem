import type { RepositorySnapshot } from '../../domain/types'

export type HistoryCategory = 'commits' | 'pullRequests' | 'issues' | 'releases'

export interface CategoryStatus {
  nextPage: string | null
  message: string | null
}

export interface CommitHistoryCoverage {
  loadedCount: number
  totalCount: number | null
  isLoading: boolean
  isComplete: boolean
  message: string | null
}

export interface RateLimitState {
  remaining: number | null
  resetAt: string | null
}

export interface GitHubIdentity {
  login: string
  avatar_url: string
  html_url: string
}

export interface GitHubCommitRecord {
  sha: string
  html_url: string
  author: GitHubIdentity | null
  commit: {
    message: string
    author: { name: string; date: string } | null
    committer: { name: string; date: string } | null
  }
  parents: Array<{ sha: string }>
}

export interface GitHubBranchRecord {
  name: string
  commit: {
    sha: string
    url: string
  }
}

export interface GitHubPullRequestRecord {
  number: number
  title: string
  body: string | null
  html_url: string
  created_at: string
  closed_at: string | null
  merged_at: string | null
  user: GitHubIdentity | null
  head: { ref: string }
  base: { ref: string }
}

export interface GitHubIssueRecord {
  number: number
  title: string
  body: string | null
  html_url: string
  created_at: string
  closed_at: string | null
  user: GitHubIdentity | null
  labels: Array<{ name: string }>
  pull_request?: { url: string }
}

export interface GitHubReleaseRecord {
  id: number
  name: string | null
  tag_name: string
  body: string | null
  html_url: string
  created_at: string
  published_at: string | null
  prerelease: boolean
  author: GitHubIdentity | null
}

export interface GitHubContributorRecord extends GitHubIdentity {
  contributions: number
}

export interface GitHubBundle {
  repository: RepositorySnapshot
  commits: GitHubCommitRecord[]
  branches: GitHubBranchRecord[]
  pullRequests: GitHubPullRequestRecord[]
  issues: GitHubIssueRecord[]
  releases: GitHubReleaseRecord[]
  contributors: GitHubContributorRecord[]
  categories: Record<HistoryCategory, CategoryStatus>
  commitHistory: CommitHistoryCoverage
  rateLimit: RateLimitState
  loadedPages: Record<HistoryCategory, number>
  notes: string[]
}

export interface ParsedRepository {
  owner: string
  name: string
  fullName: string
}
