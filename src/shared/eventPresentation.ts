import type { EventKind, TimelineEvent } from '../domain/types'

export const EVENT_META: Record<EventKind, { label: string; singular: string; short: string; color: string; icon: string }> = {
  commit: { label: 'Commits', singular: 'Commit', short: 'Modules', color: 'var(--gold)', icon: '▣' },
  branch: { label: 'Branches', singular: 'Branch', short: 'Antennas', color: 'var(--sage)', icon: '⌁' },
  pull_request: { label: 'Pull requests', singular: 'Pull request', short: 'Links', color: 'var(--wood-light)', icon: '▱' },
  bug: { label: 'Bug reports', singular: 'Bug report', short: 'Alerts', color: 'var(--beast)', icon: '◈' },
  contributor: { label: 'Contributors', singular: 'Contributor', short: 'Crew', color: 'var(--gold)', icon: '◆' },
  release: { label: 'Releases', singular: 'Release', short: 'Releases', color: 'var(--roof-light)', icon: '⚑' },
}

export function formatDate(date: string, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }) {
  const time = Date.parse(date)
  return Number.isFinite(time) ? new Intl.DateTimeFormat('en-US', options).format(time) : 'Unknown date'
}

export function compactNumber(value: number) {
  return Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

export function eventSubtitle(event: TimelineEvent) {
  const at = formatDate(event.at)
  if (event.kind === 'commit') return `${at} · ${event.sha.slice(0, 7)}`
  if (event.kind === 'pull_request') return `${at} · #${event.number}`
  if (event.kind === 'bug') return `${at} · issue #${event.number}`
  if (event.kind === 'release') return `${at} · ${event.tagName}`
  if (event.kind === 'branch') return `${at} · antenna`
  if (event.kind === 'contributor') return `${at} · crew`
  return `${at} · record`
}

export function eventStatus(event: TimelineEvent, currentDate: string) {
  const current = Date.parse(currentDate)
  if (event.kind === 'bug') return event.closedAt && Date.parse(event.closedAt) <= current ? 'Alert resolved' : 'Active alert'
  if (event.kind === 'pull_request') {
    if (event.mergedAt && Date.parse(event.mergedAt) <= current) return 'Connection merged'
    if (event.closedAt && Date.parse(event.closedAt) <= current) return 'Connection closed'
    return 'Connection open'
  }
  if (event.kind === 'branch' && event.inferred) return 'Branch date estimated'
  if (event.kind === 'release') return event.isPrerelease ? 'Prerelease' : 'Section opened'
  return EVENT_META[event.kind].short
}

