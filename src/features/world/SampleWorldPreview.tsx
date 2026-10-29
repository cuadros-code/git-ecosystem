import { lazy, Suspense } from 'react'
import { buildWorldState } from '../../domain/timeline'
import type { EventKind } from '../../domain/types'
import { DEMO_EVENTS, DEMO_REPOSITORY } from '../../data/sample/demo'

const RepositoryWorld = lazy(() => import('./RepositoryWorld'))
const SAMPLE_DATE = DEMO_EVENTS[DEMO_EVENTS.length - 1]?.at ?? DEMO_REPOSITORY.updatedAt
const SAMPLE_STATE = buildWorldState(DEMO_EVENTS, SAMPLE_DATE)
const WORLD_LAYERS = new Set<EventKind>(['commit', 'branch', 'pull_request', 'bug', 'contributor', 'release'])

export default function SampleWorldPreview() {
  return <Suspense fallback={<div className="world-canvas world-loading" role="status">Growing the sample island…</div>}>
    <RepositoryWorld
      repoName={DEMO_REPOSITORY.fullName}
      repoSizeKb={DEMO_REPOSITORY.sizeKb}
      events={DEMO_EVENTS}
      state={SAMPLE_STATE}
      selectedEventId={null}
      visibleKinds={WORLD_LAYERS}
      onSelectEvent={() => undefined}
    />
  </Suspense>
}
