import type {
  BugEvent,
  CommitEvent,
  ContributorEvent,
  PullRequestEvent,
  ReleaseEvent,
  TimelineEvent,
} from '../../domain/types'
import type { GitHubBundle, GitHubCommitRecord } from './types'
import { iso } from '../../domain/date'

function summary(value: string | null | undefined, fallback: string): string {
  const firstLine = value?.trim().split('\n')[0]?.trim()
  return firstLine || fallback
}

function authorName(commit: GitHubCommitRecord): string | null {
  return commit.author?.login || commit.commit.author?.name || null
}

export function normalizeBundle(bundle: GitHubBundle): TimelineEvent[] {
  const fallbackDate = bundle.repository.pushedAt || bundle.repository.createdAt
  const events: TimelineEvent[] = []
  const seenContributors = new Map<string, CommitEvent>()

  for (const commit of bundle.commits) {
    const at = iso(commit.commit.committer?.date ?? commit.commit.author?.date, fallbackDate)
    const author = authorName(commit)
    const event: CommitEvent = {
      id: `commit-${commit.sha}`,
      kind: 'commit',
      at,
      title: summary(commit.commit.message, 'A new part of the island took shape'),
      detail: `Commit ${commit.sha.slice(0, 7)}`,
      author,
      url: commit.html_url,
      sha: commit.sha,
      parents: commit.parents.map(parent => parent.sha),
    }
    events.push(event)
    if (author) {
      const key = author.toLowerCase()
      const prior = seenContributors.get(key)
      if (!prior || Date.parse(event.at) < Date.parse(prior.at)) seenContributors.set(key, event)
    }
  }

  for (const [login, firstCommit] of seenContributors) {
    const identity = bundle.contributors.find(
      contributor => contributor.login.toLowerCase() === login,
    )
    const event: ContributorEvent = {
      id: `contributor-${login}`,
      kind: 'contributor',
      at: firstCommit.at,
      title: `${identity?.login ?? login} joined the project`,
      detail: 'First contribution in the loaded commit history; arrival date is estimated',
      author: identity?.login ?? login,
      url: identity?.html_url ?? null,
      login: identity?.login ?? login,
      avatarUrl: identity?.avatar_url ?? null,
      inferred: true,
    }
    events.push(event)
  }

  const latestLoadedCommit = [...events]
    .filter((event): event is CommitEvent => event.kind === 'commit')
    .sort((left, right) => Date.parse(right.at) - Date.parse(left.at))[0]
  if (latestLoadedCommit) {
    for (const contributor of bundle.contributors) {
      if (seenContributors.has(contributor.login.toLowerCase())) continue
      events.push({
        id: `contributor-${contributor.login}`,
        kind: 'contributor',
        at: latestLoadedCommit.at,
        title: `${contributor.login} joined the project`,
        detail:
          'Current contributor; their first contribution date is not available from this public endpoint',
        author: contributor.login,
        url: contributor.html_url,
        login: contributor.login,
        avatarUrl: contributor.avatar_url,
        inferred: true,
      })
    }
  }

  for (const branch of bundle.branches) {
    const matchingCommit = bundle.commits.find(commit => commit.sha === branch.commit.sha)
    const branchAnchor =
      matchingCommit?.commit.committer?.date ??
      bundle.commits
        .map(commit => commit.commit.committer?.date)
        .filter((date): date is string => Boolean(date))
        .sort()
        .at(-1) ??
      bundle.repository.pushedAt ??
      fallbackDate
    events.push({
      id: `branch-${branch.name}`,
      kind: 'branch',
      at: iso(branchAnchor, fallbackDate),
      title: `${branch.name} trail`,
      detail: matchingCommit
        ? 'Active trail; its start is inferred from the observed head commit'
        : 'Active trail; GitHub does not expose its historical start date, so its position is estimated',
      author: null,
      url: `${bundle.repository.htmlUrl}/tree/${branch.name.split('/').map(encodeURIComponent).join('/')}`,
      inferred: true,
      branchName: branch.name,
      headSha: branch.commit.sha,
    })
  }

  for (const pull of bundle.pullRequests) {
    const event: PullRequestEvent = {
      id: `pull-${pull.number}`,
      kind: 'pull_request',
      at: iso(pull.created_at, fallbackDate),
      title: pull.title,
      detail: summary(pull.body, `Pull request #${pull.number}`),
      author: pull.user?.login ?? null,
      url: pull.html_url,
      number: pull.number,
      closedAt: pull.closed_at ? iso(pull.closed_at, fallbackDate) : null,
      mergedAt: pull.merged_at ? iso(pull.merged_at, fallbackDate) : null,
      baseBranch: pull.base.ref,
      headBranch: pull.head.ref,
    }
    events.push(event)
  }

  for (const issue of bundle.issues) {
    if (issue.pull_request) continue
    const labels = issue.labels.map(label => label.name)
    if (!labels.some(label => label.toLowerCase() === 'bug')) continue
    const event: BugEvent = {
      id: `bug-${issue.number}`,
      kind: 'bug',
      at: iso(issue.created_at, fallbackDate),
      title: issue.title,
      detail: summary(issue.body, `Bug report #${issue.number}`),
      author: issue.user?.login ?? null,
      url: issue.html_url,
      number: issue.number,
      closedAt: issue.closed_at ? iso(issue.closed_at, fallbackDate) : null,
      labels,
    }
    events.push(event)
  }

  for (const release of bundle.releases) {
    const event: ReleaseEvent = {
      id: `release-${release.id}`,
      kind: 'release',
      at: iso(release.published_at ?? release.created_at, fallbackDate),
      title: release.name || release.tag_name,
      detail: summary(release.body, `Release ${release.tag_name}`),
      author: release.author?.login ?? null,
      url: release.html_url,
      tagName: release.tag_name,
      isPrerelease: release.prerelease,
    }
    events.push(event)
  }

  return events.sort(
    (left, right) => Date.parse(left.at) - Date.parse(right.at) || left.id.localeCompare(right.id),
  )
}
