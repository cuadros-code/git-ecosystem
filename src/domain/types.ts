export type EventKind = 'commit' | 'branch' | 'pull_request' | 'bug' | 'contributor' | 'release'

export interface RepositorySnapshot {
  owner: string
  name: string
  fullName: string
  description: string | null
  htmlUrl: string
  defaultBranch: string
  createdAt: string
  updatedAt: string
  pushedAt: string | null
  stars: number
  forks: number
  openIssues: number
  sizeKb: number
}

export interface TimelineEventBase {
  id: string
  kind: EventKind
  at: string
  title: string
  detail: string
  author: string | null
  url: string | null
  inferred?: boolean
}

export interface CommitEvent extends TimelineEventBase {
  kind: 'commit'
  sha: string
  parents: string[]
}

export interface BranchEvent extends TimelineEventBase {
  kind: 'branch'
  branchName: string
  headSha: string
}

export interface PullRequestEvent extends TimelineEventBase {
  kind: 'pull_request'
  number: number
  closedAt: string | null
  mergedAt: string | null
  baseBranch: string
  headBranch: string
}

export interface BugEvent extends TimelineEventBase {
  kind: 'bug'
  number: number
  closedAt: string | null
  labels: string[]
}

export interface ContributorEvent extends TimelineEventBase {
  kind: 'contributor'
  login: string | null
  avatarUrl: string | null
}

export interface ReleaseEvent extends TimelineEventBase {
  kind: 'release'
  tagName: string
  isPrerelease: boolean
}

export type TimelineEvent = CommitEvent | BranchEvent | PullRequestEvent | BugEvent | ContributorEvent | ReleaseEvent

export interface WorldState {
  date: string
  commitCount: number
  knownCommitCount: number
  branchCount: number
  openPullRequests: number
  resolvedPullRequests: number
  openBugs: number
  resolvedBugs: number
  contributorCount: number
  releaseCount: number
  milestoneCount: number
  commitsToNextMilestone: number
  stationProgress: number
  stationStage: 0 | 1 | 2 | 3 | 4
  stationStageName: string
  moduleCount: number
  selectedEvents: TimelineEvent[]
}

