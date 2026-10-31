import type { EventKind, TimelineEvent, WorldState } from '../../domain/types'

export interface RepositoryWorldProps {
  repoName: string
  repoSizeKb: number
  events: TimelineEvent[]
  state: WorldState
  timelineProgress: number
  selectedEventId: string | null
  visibleKinds: Set<EventKind>
  onSelectEvent: (id: string) => void
}
