import type { CommitEvent, PullRequestEvent, BugEvent, ReleaseEvent, ContributorEvent, TimelineEvent, WorldState } from './types'
import { buildStationModules, COMMITS_PER_MODULE } from './station'
import { iso } from './date'

export function buildWorldState(events: TimelineEvent[], date: string): WorldState {
  const time = Date.parse(date)
  const selectedEvents = events.filter((event) => Date.parse(event.at) <= time)
  const commits = selectedEvents.filter((event): event is CommitEvent => event.kind === 'commit')
  const branches = selectedEvents.filter((event) => event.kind === 'branch')
  const pullRequests = selectedEvents.filter((event): event is PullRequestEvent => event.kind === 'pull_request')
  const bugs = selectedEvents.filter((event): event is BugEvent => event.kind === 'bug')
  const releases = selectedEvents.filter((event): event is ReleaseEvent => event.kind === 'release')
  const contributorEvents = selectedEvents.filter((event): event is ContributorEvent => event.kind === 'contributor')

  const openPullRequests = pullRequests.filter((event) => !event.closedAt || Date.parse(event.closedAt) > time)
  const resolvedPullRequests = pullRequests.filter((event) => event.mergedAt && Date.parse(event.mergedAt) <= time)
  const openBugs = bugs.filter((event) => !event.closedAt || Date.parse(event.closedAt) > time)
  const resolvedBugs = bugs.filter((event) => event.closedAt && Date.parse(event.closedAt) <= time)
  const contributorIds = new Set<string>()
  for (const event of commits) if (event.author) contributorIds.add(event.author.toLowerCase())
  for (const event of contributorEvents) if (event.login) contributorIds.add(event.login.toLowerCase())

  const knownCommitCount = events.filter((event) => event.kind === 'commit').length
  const stationProgress = knownCommitCount ? commits.length / knownCommitCount : 0
  const milestoneCount = Math.floor(commits.length / 100)
  const commitsToNextMilestone = 100 - (commits.length % 100)
  const stationStage = (commits.length === 0 ? 0 : commits.length <= COMMITS_PER_MODULE ? 1 : commits.length <= COMMITS_PER_MODULE * 3 ? 2 : commits.length <= COMMITS_PER_MODULE * 7 ? 3 : 4) as WorldState['stationStage']
  const stationStageName = ['Awaiting launch', 'First module', 'Growing station', 'Orbital outpost', 'Established station'][stationStage]
  const moduleCount = buildStationModules(events, date).length

  return {
    date: new Date(time).toISOString(),
    commitCount: commits.length,
    knownCommitCount,
    branchCount: branches.length,
    openPullRequests: openPullRequests.length,
    resolvedPullRequests: resolvedPullRequests.length,
    openBugs: openBugs.length,
    resolvedBugs: resolvedBugs.length,
    contributorCount: contributorIds.size,
    releaseCount: releases.length,
    milestoneCount,
    commitsToNextMilestone,
    stationProgress,
    stationStage,
    stationStageName,
    moduleCount,
    selectedEvents,
  }
}

export function timelineBounds(events: TimelineEvent[], fallbackStart: string, fallbackEnd: string): [string, string] {
  if (events.length === 0) return [iso(fallbackStart, fallbackStart), iso(fallbackEnd, fallbackStart)]
  const times = events.map((event) => Date.parse(event.at)).filter(Number.isFinite)
  if (!times.length) return [fallbackStart, fallbackEnd]
  return [new Date(Math.min(...times)).toISOString(), new Date(Math.max(...times)).toISOString()]
}

export function relativePercent(value: string, start: string, end: string): number {
  const from = Date.parse(start)
  const to = Date.parse(end)
  const current = Date.parse(value)
  if (!Number.isFinite(from) || !Number.isFinite(to) || !Number.isFinite(current) || from === to) return 100
  return Math.min(100, Math.max(0, ((current - from) / (to - from)) * 100))
}
