import type { RepositorySnapshot, TimelineEvent } from '../../domain/types'

export const DEMO_REPOSITORY: RepositorySnapshot = {
  owner: 'world-garden',
  name: 'island-world',
  fullName: 'world-garden/island-world',
  description: 'A fictional toolkit for growing procedural voxel islands.',
  htmlUrl: 'https://github.com/world-garden/island-world',
  defaultBranch: 'main',
  createdAt: '2022-11-08T10:00:00Z',
  updatedAt: '2025-04-16T14:30:00Z',
  pushedAt: '2025-04-16T14:30:00Z',
  stars: 286,
  forks: 34,
  openIssues: 3,
  sizeKb: 8_400,
}

const contributors = [
  { login: 'mira-chen', date: '2022-11-12T09:24:00Z', avatarUrl: null },
  { login: 'samira-dev', date: '2023-02-02T13:17:00Z', avatarUrl: null },
  { login: 'pavel-k', date: '2023-05-20T08:01:00Z', avatarUrl: null },
  { login: 'juniper-w', date: '2024-01-16T15:40:00Z', avatarUrl: null },
  { login: 'eli-garcia', date: '2024-09-05T11:09:00Z', avatarUrl: null },
]

const commitMessages = [
  ['2022-11-12T09:24:00Z', 'Lay the first shoreline tile'],
  ['2022-11-16T16:08:00Z', 'Sketch a seed-based island map'],
  ['2022-12-04T12:14:00Z', 'Add a compact voxel palette'],
  ['2023-01-09T10:33:00Z', 'Build the terrain index'],
  ['2023-02-02T13:17:00Z', 'Plant the first grove'],
  ['2023-02-18T18:40:00Z', 'Connect the northern footpath'],
  ['2023-03-03T08:25:00Z', 'Make the block archive easier to scan'],
  ['2023-04-11T14:58:00Z', 'Add a pocket of beach grass'],
  ['2023-05-20T08:01:00Z', 'Welcome another island builder'],
  ['2023-07-06T11:22:00Z', 'Raise the lookout on the ridge'],
  ['2023-09-17T16:31:00Z', 'Give each block a stable position'],
  ['2023-11-02T09:11:00Z', 'Add a warm sunrise palette'],
  ['2024-01-16T15:40:00Z', 'Open the eastern trail'],
  ['2024-03-08T10:12:00Z', 'Make island exports work offline'],
  ['2024-04-21T12:46:00Z', 'Sketch an accessible terrain key'],
  ['2024-06-15T17:09:00Z', 'Add lanterns along the coast'],
  ['2024-08-23T07:54:00Z', 'Add a quiet mode for night walks'],
  ['2024-09-05T11:09:00Z', 'Build the western footbridge'],
  ['2024-10-13T16:20:00Z', 'Let builders save world layouts'],
  ['2024-11-29T13:05:00Z', 'Add a low-light view of the cove'],
  ['2025-01-11T08:43:00Z', 'Rework the island for small screens'],
  ['2025-02-07T14:28:00Z', 'Add landmark search to the map'],
  ['2025-03-02T10:19:00Z', 'Share an island seed with one link'],
  ['2025-04-16T14:30:00Z', 'Invite the community to shape the next shore'],
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
    url: 'https://github.com/world-garden/island-world/commits/main',
    sha,
    parents: index ? [`${index.toString(16).padStart(2, '0').repeat(20)}`] : [],
  }
})

const contributorEvents: TimelineEvent[] = contributors.map((person) => ({
  id: `demo-contributor-${person.login}`,
  kind: 'contributor',
  at: person.date,
  title: `${person.login} joined the island project`,
  detail: 'A new contributor adds another tree to the growing island.',
  author: person.login,
  url: `https://github.com/${person.login}`,
  login: person.login,
  avatarUrl: person.avatarUrl,
}))

const demoEvents: TimelineEvent[] = [
  ...commits,
  ...contributorEvents,
  {
    id: 'demo-branch-mushrooms', kind: 'branch', at: '2023-02-18T18:40:00Z', title: 'north trail', detail: 'A wooden path represents this branch.', author: null, url: null, inferred: true, branchName: 'north-trail', headSha: 'a'.repeat(40),
  },
  {
    id: 'demo-branch-wetlands', kind: 'branch', at: '2024-01-16T15:40:00Z', title: 'east ridge trail', detail: 'A second wooden path represents this branch.', author: null, url: null, inferred: true, branchName: 'east-ridge', headSha: 'b'.repeat(40),
  },
  {
    id: 'demo-branch-prairie', kind: 'branch', at: '2024-09-05T11:09:00Z', title: 'west cove trail', detail: 'A third wooden path represents this branch.', author: null, url: null, inferred: true, branchName: 'west-cove', headSha: 'c'.repeat(40),
  },
  {
    id: 'demo-pr-1', kind: 'pull_request', at: '2023-02-17T11:10:00Z', title: 'Build the northern footbridge', detail: 'Connect the grove to the north trail.', author: 'samira-dev', url: 'https://github.com/world-garden/island-world/pull/12', number: 12, closedAt: '2023-02-21T17:00:00Z', mergedAt: '2023-02-21T17:00:00Z', baseBranch: 'main', headBranch: 'north-trail',
  },
  {
    id: 'demo-pr-2', kind: 'pull_request', at: '2023-10-01T09:20:00Z', title: 'Connect the eastern ridge', detail: 'Add a short wooden crossing over the stream.', author: 'pavel-k', url: 'https://github.com/world-garden/island-world/pull/38', number: 38, closedAt: '2023-10-08T12:14:00Z', mergedAt: '2023-10-08T12:14:00Z', baseBranch: 'main', headBranch: 'ridge-crossing',
  },
  {
    id: 'demo-pr-3', kind: 'pull_request', at: '2024-03-02T14:16:00Z', title: 'Make island seeds work offline', detail: 'Cache the terrain map and the selected world seed.', author: 'juniper-w', url: 'https://github.com/world-garden/island-world/pull/71', number: 71, closedAt: '2024-03-09T09:42:00Z', mergedAt: '2024-03-09T09:42:00Z', baseBranch: 'main', headBranch: 'offline-seeds',
  },
  {
    id: 'demo-pr-4', kind: 'pull_request', at: '2024-08-23T07:54:00Z', title: 'Add a quiet night view', detail: 'Reduce motion and soften the moonlit palette.', author: 'eli-garcia', url: 'https://github.com/world-garden/island-world/pull/104', number: 104, closedAt: '2024-08-28T18:05:00Z', mergedAt: '2024-08-28T18:05:00Z', baseBranch: 'main', headBranch: 'quiet-view',
  },
  {
    id: 'demo-pr-5', kind: 'pull_request', at: '2025-02-06T12:20:00Z', title: 'Find a landmark by name', detail: 'Search the island and focus the matching place.', author: 'mira-chen', url: 'https://github.com/world-garden/island-world/pull/146', number: 146, closedAt: null, mergedAt: null, baseBranch: 'main', headBranch: 'landmark-search',
  },
  {
    id: 'demo-pr-6', kind: 'pull_request', at: '2025-03-12T10:00:00Z', title: 'Share an island seed', detail: 'A compact link opens the same generated world.', author: 'samira-dev', url: 'https://github.com/world-garden/island-world/pull/158', number: 158, closedAt: '2025-03-17T15:24:00Z', mergedAt: null, baseBranch: 'main', headBranch: 'share-seed',
  },
  {
    id: 'demo-bug-1', kind: 'bug', at: '2023-06-02T08:12:00Z', title: 'Terrain key slips behind the map', detail: 'On smaller screens, the world layers are hard to reach.', author: 'coast-watcher', url: 'https://github.com/world-garden/island-world/issues/29', number: 29, closedAt: '2023-06-05T13:00:00Z', labels: ['bug', 'mobile'],
  },
  {
    id: 'demo-bug-2', kind: 'bug', at: '2024-04-19T10:40:00Z', title: 'Long landmark names are clipped', detail: 'A narrow inspector hides the end of some place names.', author: 'eli-garcia', url: 'https://github.com/world-garden/island-world/issues/79', number: 79, closedAt: '2024-04-24T16:22:00Z', labels: ['bug', 'accessibility'],
  },
  {
    id: 'demo-bug-3', kind: 'bug', at: '2024-12-03T09:12:00Z', title: 'Map remembers the wrong zoom', detail: 'The saved view can point beyond the island.', author: 'juniper-w', url: 'https://github.com/world-garden/island-world/issues/133', number: 133, closedAt: '2024-12-09T12:30:00Z', labels: ['bug'],
  },
  {
    id: 'demo-bug-4', kind: 'bug', at: '2025-04-02T11:52:00Z', title: 'Search skips names with accents', detail: 'A few landmark names are missing from quick search.', author: 'samira-dev', url: 'https://github.com/world-garden/island-world/issues/167', number: 167, closedAt: null, labels: ['bug', 'search'],
  },
  {
    id: 'demo-release-1', kind: 'release', at: '2023-03-03T08:25:00Z', title: 'Island World 0.1 — First shore', detail: 'The first generated coastline and a patch of forest.', author: 'mira-chen', url: 'https://github.com/world-garden/island-world/releases/tag/v0.1', tagName: 'v0.1', isPrerelease: false,
  },
  {
    id: 'demo-release-2', kind: 'release', at: '2023-10-08T12:14:00Z', title: 'Island World 0.5 — The highlands', detail: 'New hills and the first trail across the island.', author: 'pavel-k', url: 'https://github.com/world-garden/island-world/releases/tag/v0.5', tagName: 'v0.5', isPrerelease: false,
  },
  {
    id: 'demo-release-3', kind: 'release', at: '2024-03-09T09:42:00Z', title: 'Island World 1.0 — Lighthouse', detail: 'The beacon joins the grove above the coast.', author: 'juniper-w', url: 'https://github.com/world-garden/island-world/releases/tag/v1.0', tagName: 'v1.0', isPrerelease: false,
  },
  {
    id: 'demo-release-4', kind: 'release', at: '2024-11-29T13:05:00Z', title: 'Island World 1.4 — Moonlit cove', detail: 'A softer light palette along the water.', author: 'eli-garcia', url: 'https://github.com/world-garden/island-world/releases/tag/v1.4', tagName: 'v1.4', isPrerelease: false,
  },
]

export const DEMO_EVENTS = demoEvents.sort((left, right) => Date.parse(left.at) - Date.parse(right.at))
