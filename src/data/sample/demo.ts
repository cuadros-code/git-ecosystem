import type { RepositorySnapshot, TimelineEvent } from '../../domain/types'

export const DEMO_REPOSITORY: RepositorySnapshot = {
  owner: 'orbit-labs',
  name: 'station-kit',
  fullName: 'orbit-labs/station-kit',
  description: 'A fictional toolkit for building orbital simulations.',
  htmlUrl: 'https://github.com/orbit-labs/station-kit',
  defaultBranch: 'main',
  createdAt: '2022-11-08T10:00:00Z',
  updatedAt: '2025-04-16T14:30:00Z',
  pushedAt: '2025-04-16T14:30:00Z',
  stars: 286,
  forks: 34,
  openIssues: 3,
}

const contributors = [
  { login: 'mira-chen', date: '2022-11-12T09:24:00Z', avatarUrl: null },
  { login: 'samira-dev', date: '2023-02-02T13:17:00Z', avatarUrl: null },
  { login: 'pavel-k', date: '2023-05-20T08:01:00Z', avatarUrl: null },
  { login: 'juniper-w', date: '2024-01-16T15:40:00Z', avatarUrl: null },
  { login: 'eli-garcia', date: '2024-09-05T11:09:00Z', avatarUrl: null },
]

const commitMessages = [
  ['2022-11-12T09:24:00Z', 'Launch the first station module'],
  ['2022-11-16T16:08:00Z', 'Sketch mission control'],
  ['2022-12-04T12:14:00Z', 'Add a compact tileset registry'],
  ['2023-01-09T10:33:00Z', 'Build the world index'],
  ['2023-02-02T13:17:00Z', 'Welcome the first crew members'],
  ['2023-02-18T18:40:00Z', 'Connect the communications array'],
  ['2023-03-03T08:25:00Z', 'Make the sprite archive easier to scan'],
  ['2023-04-11T14:58:00Z', 'Add the northern solar array'],
  ['2023-05-20T08:01:00Z', 'Invite more crew to the mission'],
  ['2023-07-06T11:22:00Z', 'Connect the research module'],
  ['2023-09-17T16:31:00Z', 'Give every module a tile footprint'],
  ['2023-11-02T09:11:00Z', 'Add the orbital sunrise palette'],
  ['2024-01-16T15:40:00Z', 'Open a channel to the eastern array'],
  ['2024-03-08T10:12:00Z', 'Make station exports work offline'],
  ['2024-04-21T12:46:00Z', 'Sketch an accessible color key'],
  ['2024-06-15T17:09:00Z', 'Add navigation lights to the palette'],
  ['2024-08-23T07:54:00Z', 'Add a quiet mode for night operations'],
  ['2024-09-05T11:09:00Z', 'Deploy the western solar panel'],
  ['2024-10-13T16:20:00Z', 'Let crews save station layouts'],
  ['2024-11-29T13:05:00Z', 'Add low-light mode to mission control'],
  ['2025-01-11T08:43:00Z', 'Rework the station for small screens'],
  ['2025-02-07T14:28:00Z', 'Add module search to the map'],
  ['2025-03-02T10:19:00Z', 'Share a station plan with one link'],
  ['2025-04-16T14:30:00Z', 'Let the community build the next module'],
]

const commits: TimelineEvent[] = commitMessages.map(([at, message], index) => {
  const author = contributors.find((person) => Date.parse(person.date) <= Date.parse(at))?.login ?? 'mira-chen'
  const sha = `${(index + 1).toString(16).padStart(2, '0').repeat(20)}`
  return {
    id: `demo-commit-${index}`,
    kind: 'commit',
    at,
    title: message,
    detail: `Commit ${sha.slice(0, 7)}`,
    author,
    url: 'https://github.com/orbit-labs/station-kit/commits/main',
    sha,
    parents: index ? [`${index.toString(16).padStart(2, '0').repeat(20)}`] : [],
  }
})

const contributorEvents: TimelineEvent[] = contributors.map((person) => ({
  id: `demo-contributor-${person.login}`,
  kind: 'contributor',
  at: person.date,
  title: `${person.login} joined the crew`,
  detail: 'A new contributor joins the mission crew.',
  author: person.login,
  url: `https://github.com/${person.login}`,
  login: person.login,
  avatarUrl: person.avatarUrl,
}))

const demoEvents: TimelineEvent[] = [
  ...commits,
  ...contributorEvents,
  {
    id: 'demo-branch-mushrooms', kind: 'branch', at: '2023-02-18T18:40:00Z', title: 'communications antenna', detail: 'An antenna represents this branch.', author: null, url: null, inferred: true, branchName: 'market-square', headSha: 'a'.repeat(40),
  },
  {
    id: 'demo-branch-wetlands', kind: 'branch', at: '2024-01-16T15:40:00Z', title: 'eastern array antenna', detail: 'A second antenna represents this branch.', author: null, url: null, inferred: true, branchName: 'eastern-ward', headSha: 'b'.repeat(40),
  },
  {
    id: 'demo-branch-prairie', kind: 'branch', at: '2024-09-05T11:09:00Z', title: 'solar array antenna', detail: 'An antenna represents this branch.', author: null, url: null, inferred: true, branchName: 'western-wall', headSha: 'c'.repeat(40),
  },
  {
    id: 'demo-pr-1', kind: 'pull_request', at: '2023-02-17T11:10:00Z', title: 'Build the communications array', detail: 'Connect the communications module to mission control.', author: 'samira-dev', url: 'https://github.com/orbit-labs/station-kit/pull/12', number: 12, closedAt: '2023-02-21T17:00:00Z', mergedAt: '2023-02-21T17:00:00Z', baseBranch: 'main', headBranch: 'market-square',
  },
  {
    id: 'demo-pr-2', kind: 'pull_request', at: '2023-10-01T09:20:00Z', title: 'Connect the research module', detail: 'A connection links the laboratory to mission control.', author: 'pavel-k', url: 'https://github.com/orbit-labs/station-kit/pull/38', number: 38, closedAt: '2023-10-08T12:14:00Z', mergedAt: '2023-10-08T12:14:00Z', baseBranch: 'main', headBranch: 'river-crossing',
  },
  {
    id: 'demo-pr-3', kind: 'pull_request', at: '2024-03-02T14:16:00Z', title: 'Make blueprints work offline', detail: 'Cache the station map and recent module plans.', author: 'juniper-w', url: 'https://github.com/orbit-labs/station-kit/pull/71', number: 71, closedAt: '2024-03-09T09:42:00Z', mergedAt: '2024-03-09T09:42:00Z', baseBranch: 'main', headBranch: 'offline-blueprints',
  },
  {
    id: 'demo-pr-4', kind: 'pull_request', at: '2024-08-23T07:54:00Z', title: 'Add a quieter reading mode', detail: 'Reduce motion and soften the night palette.', author: 'eli-garcia', url: 'https://github.com/orbit-labs/station-kit/pull/104', number: 104, closedAt: '2024-08-28T18:05:00Z', mergedAt: '2024-08-28T18:05:00Z', baseBranch: 'main', headBranch: 'quiet-mode',
  },
  {
    id: 'demo-pr-5', kind: 'pull_request', at: '2025-02-06T12:20:00Z', title: 'Find a module by name', detail: 'Search for a module and highlight it on the map.', author: 'mira-chen', url: 'https://github.com/orbit-labs/station-kit/pull/146', number: 146, closedAt: null, mergedAt: null, baseBranch: 'main', headBranch: 'building-search',
  },
  {
    id: 'demo-pr-6', kind: 'pull_request', at: '2025-03-12T10:00:00Z', title: 'Share a station plan', detail: 'A compact link opens a saved station layout.', author: 'samira-dev', url: 'https://github.com/orbit-labs/station-kit/pull/158', number: 158, closedAt: '2025-03-17T15:24:00Z', mergedAt: null, baseBranch: 'main', headBranch: 'share-blueprint',
  },
  {
    id: 'demo-bug-1', kind: 'bug', at: '2023-06-02T08:12:00Z', title: 'Station legend slips behind the map', detail: 'On smaller screens, the layer key is hard to reach.', author: 'coast-watcher', url: 'https://github.com/orbit-labs/station-kit/issues/29', number: 29, closedAt: '2023-06-05T13:00:00Z', labels: ['bug', 'mobile'],
  },
  {
    id: 'demo-bug-2', kind: 'bug', at: '2024-04-19T10:40:00Z', title: 'Long module names are clipped', detail: 'A narrow inspector hides the end of some structure names.', author: 'eli-garcia', url: 'https://github.com/orbit-labs/station-kit/issues/79', number: 79, closedAt: '2024-04-24T16:22:00Z', labels: ['bug', 'accessibility'],
  },
  {
    id: 'demo-bug-3', kind: 'bug', at: '2024-12-03T09:12:00Z', title: 'Map remembers the wrong zoom', detail: 'The saved view can point beyond the station.', author: 'juniper-w', url: 'https://github.com/orbit-labs/station-kit/issues/133', number: 133, closedAt: '2024-12-09T12:30:00Z', labels: ['bug'],
  },
  {
    id: 'demo-bug-4', kind: 'bug', at: '2025-04-02T11:52:00Z', title: 'Search skips names with accents', detail: 'A few module names are missing from quick search.', author: 'samira-dev', url: 'https://github.com/orbit-labs/station-kit/issues/167', number: 167, closedAt: null, labels: ['bug', 'search'],
  },
  {
    id: 'demo-release-1', kind: 'release', at: '2023-03-03T08:25:00Z', title: 'Station Kit 0.1 — First launch', detail: 'The first collection of station modules.', author: 'mira-chen', url: 'https://github.com/orbit-labs/station-kit/releases/tag/v0.1', tagName: 'v0.1', isPrerelease: false,
  },
  {
    id: 'demo-release-2', kind: 'release', at: '2023-10-08T12:14:00Z', title: 'Station Kit 0.5 — Orbital research', detail: 'New connections and research modules.', author: 'pavel-k', url: 'https://github.com/orbit-labs/station-kit/releases/tag/v0.5', tagName: 'v0.5', isPrerelease: false,
  },
  {
    id: 'demo-release-3', kind: 'release', at: '2024-03-09T09:42:00Z', title: 'Station Kit 1.0 — Open station', detail: 'Station plans can now be shared.', author: 'juniper-w', url: 'https://github.com/orbit-labs/station-kit/releases/tag/v1.0', tagName: 'v1.0', isPrerelease: false,
  },
  {
    id: 'demo-release-4', kind: 'release', at: '2024-11-29T13:05:00Z', title: 'Station Kit 1.4 — Night operations', detail: 'A calmer palette for long mission sessions.', author: 'eli-garcia', url: 'https://github.com/orbit-labs/station-kit/releases/tag/v1.4', tagName: 'v1.4', isPrerelease: false,
  },
]

export const DEMO_EVENTS = demoEvents.sort((left, right) => Date.parse(left.at) - Date.parse(right.at))
