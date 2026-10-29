import type { EventKind, TimelineEvent } from './types'

export interface WorldPoint {
  x: number
  y: number
}
export interface StationLayout {
  seed: number
  hub: WorldPoint
  modules: WorldPoint[]
  sections: WorldPoint[]
  crew: WorldPoint[]
  antennas: WorldPoint[]
  alerts: WorldPoint[]
}
export interface StationModule {
  index: number
  stage: 1 | 2 | 3
  event: TimelineEvent
  activeCount: number
  totalCount: number
}

function hash(value: string): number {
  let result = 2166136261
  for (let i = 0; i < value.length; i += 1)
    result = Math.imul(result ^ value.charCodeAt(i), 16777619)
  return result >>> 0
}

/** Fixed logical coordinates keep every landmark in place when time changes. */
export function buildStationLayout(repoName: string): StationLayout {
  return {
    seed: hash(repoName.toLowerCase()),
    hub: { x: 400, y: 230 },
    modules: [
      { x: 270, y: 150 },
      { x: 530, y: 150 },
      { x: 270, y: 310 },
      { x: 530, y: 310 },
      { x: 145, y: 230 },
      { x: 655, y: 230 },
      { x: 400, y: 90 },
      { x: 400, y: 370 },
    ],
    sections: [
      { x: 130, y: 95 },
      { x: 670, y: 95 },
      { x: 685, y: 365 },
    ],
    crew: [
      { x: 357, y: 210 },
      { x: 400, y: 204 },
      { x: 443, y: 210 },
      { x: 357, y: 250 },
      { x: 400, y: 255 },
      { x: 443, y: 250 },
    ],
    antennas: [
      { x: 184, y: 150 },
      { x: 616, y: 150 },
      { x: 190, y: 310 },
    ],
    alerts: [
      { x: 320, y: 125 },
      { x: 580, y: 125 },
      { x: 320, y: 285 },
    ],
  }
}

/** Each module represents a fixed tranche of commits, not a share of the loaded history. */
export const COMMITS_PER_MODULE = 20
export const MAX_MODULES = 8

export function buildStationModules(events: TimelineEvent[], date: string): StationModule[] {
  const commits = events
    .filter(event => event.kind === 'commit')
    .slice()
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at) || a.id.localeCompare(b.id))
  const cutoff = Date.parse(date)
  const groups: TimelineEvent[][] = Array.from({ length: MAX_MODULES }, () => [])
  commits.forEach((event, index) => {
    if (Date.parse(event.at) <= cutoff)
      groups[Math.min(MAX_MODULES - 1, Math.floor(index / COMMITS_PER_MODULE))].push(event)
  })
  return groups.flatMap((group, index) => {
    if (!group.length) return []
    return [
      {
        index,
        stage: Math.min(3, Math.ceil((group.length / COMMITS_PER_MODULE) * 3)) as 1 | 2 | 3,
        event: group[group.length - 1],
        activeCount: group.length,
        totalCount: COMMITS_PER_MODULE,
      },
    ]
  })
}

/** After the eight modules are filled, larger histories deploy additional arrays. */
export function solarArrayCount(commitCount: number): number {
  return [161, 201, 251, 301].filter(threshold => commitCount >= threshold).length
}

export function selectStationSignals(
  events: TimelineEvent[],
  date: string,
  visibleKinds: Set<EventKind>,
) {
  const time = Date.parse(date)
  const active = events
    .filter(event => Date.parse(event.at) <= time && visibleKinds.has(event.kind))
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at) || a.id.localeCompare(b.id))
  const ofKind = (kind: EventKind) => active.filter(event => event.kind === kind)
  return {
    active,
    crew: ofKind('contributor').slice(0, 6),
    sections: ofKind('release').slice(0, 3),
    antennas: ofKind('branch').slice(0, 3),
    pulls: ofKind('pull_request').slice(0, 3),
    openAlerts: ofKind('bug').filter(
      event => event.kind === 'bug' && (!event.closedAt || Date.parse(event.closedAt) > time),
    ),
  }
}
