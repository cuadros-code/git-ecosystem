import type { EventKind, TimelineEvent, WorldState } from '../../domain/types'

export interface StationCanvasProps {
  repoName: string
  events: TimelineEvent[]
  state: WorldState
  selectedEventId: string | null
  visibleKinds: Set<EventKind>
  onSelectEvent: (id: string) => void
}
export interface HitZone { x: number; y: number; radius: number; eventId: string }
