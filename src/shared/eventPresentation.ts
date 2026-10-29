import type { EventKind, TimelineEvent } from '../domain/types'

export const EVENT_META: Record<
  EventKind,
  {
    label: string
    singular: string
    short: string
    color: string
    icon: string
    description: string
  }
> = {
  commit: {
    label: 'Commits',
    singular: 'Commit',
    short: 'Terrain',
    color: 'var(--gold)',
    icon: '▣',
    description: 'Selected commits shape the shoreline and raise terraces.',
  },
  branch: {
    label: 'Branches',
    singular: 'Branch',
    short: 'Trails',
    color: 'var(--sage)',
    icon: '⌁',
    description: 'Up to eight active branches appear as wooden trails.',
  },
  pull_request: {
    label: 'Pull requests',
    singular: 'Pull request',
    short: 'Bridges',
    color: 'var(--wood-light)',
    icon: '▱',
    description: 'Up to eight pull requests add short bridges; merged ones receive a gold cap.',
  },
  bug: {
    label: 'Bug reports',
    singular: 'Bug report',
    short: 'Markers',
    color: 'var(--beast)',
    icon: '◈',
    description: 'Recent bug-labeled issues glow red while open and become flowers when resolved.',
  },
  contributor: {
    label: 'Contributors',
    singular: 'Contributor',
    short: 'Trees',
    color: 'var(--gold)',
    icon: '◆',
    description: 'Contributors appear as spaced trees with varied canopy shapes.',
  },
  release: {
    label: 'Releases',
    singular: 'Release',
    short: 'Beacon',
    color: 'var(--roof-light)',
    icon: '⚑',
    description: 'Releases add red and pale bands to the lighthouse.',
  },
}

export function formatDate(
  date: string,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' },
) {
  const time = Date.parse(date)
  return Number.isFinite(time)
    ? new Intl.DateTimeFormat('en-US', options).format(time)
    : 'Unknown date'
}

export function compactNumber(value: number) {
  return Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

export function formatRepositorySize(sizeKb: number) {
  if (sizeKb <= 0) return 'Unknown size'
  const units = ['KB', 'MB', 'GB', 'TB']
  let size = sizeKb
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(size)} ${units[unitIndex]}`
}

export function eventSubtitle(event: TimelineEvent) {
  const at = formatDate(event.at)
  if (event.kind === 'commit') return `${at} · ${event.sha.slice(0, 7)}`
  if (event.kind === 'pull_request') return `${at} · #${event.number}`
  if (event.kind === 'bug') return `${at} · issue #${event.number}`
  if (event.kind === 'release') return `${at} · ${event.tagName}`
  if (event.kind === 'branch') return `${at} · trail`
  if (event.kind === 'contributor') return `${at} · tree planted`
  return `${at} · record`
}

export function eventStatus(event: TimelineEvent, currentDate: string) {
  const current = Date.parse(currentDate)
  if (event.kind === 'bug')
    return event.closedAt && Date.parse(event.closedAt) <= current
      ? 'Alert resolved'
      : 'Active alert'
  if (event.kind === 'pull_request') {
    if (event.mergedAt && Date.parse(event.mergedAt) <= current) return 'Bridge complete'
    if (event.closedAt && Date.parse(event.closedAt) <= current) return 'Bridge closed'
    return 'Bridge growing'
  }
  if (event.kind === 'branch') return event.inferred ? 'Trail date estimated' : 'Trail opened'
  if (event.kind === 'release') return event.isPrerelease ? 'Preview beacon' : 'Beacon raised'
  if (event.kind === 'contributor') return 'Tree planted'
  if (event.kind === 'commit') return 'Terrain shaped'
}
