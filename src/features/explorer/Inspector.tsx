import type { CSSProperties } from 'react'
import type { WorldState, TimelineEvent } from '../../domain/types'
import { EVENT_META, eventStatus, eventSubtitle, formatDate, formatRepositorySize } from '../../shared/eventPresentation'
import { Icon } from '../../shared/Icon'

export function WorldSummary({ state }: { state: WorldState }) {
  const islandStage = ['open water', 'first shore', 'growing island', 'higher ground', 'living island'][state.stationStage]
  const milestoneProgress = state.commitCount % 100
  return <div className="world-summary">
    <p className="summary-date">{formatDate(state.date, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
    <p className="summary-copy">Island stage: <strong>{islandStage}</strong>. Every 100 commits unlocks a landmark and expands the forest.</p>
    <div className="summary-metrics">
      <div><span>{state.commitCount}</span><small>commits</small></div>
      <div><span>{state.branchCount}</span><small>trails</small></div>
      <div><span>{state.contributorCount}</span><small>contributors</small></div>
      <div><span>{state.releaseCount}</span><small>releases</small></div>
      <div><span>{state.milestoneCount}</span><small>landmarks</small></div>
    </div>
    <div className="milestone-progress">
      <div><span>Next landmark</span><strong>{state.commitsToNextMilestone} commits away</strong></div>
      <div className="milestone-track" role="meter" aria-label="Progress toward the next landmark" aria-valuemin={0} aria-valuemax={100} aria-valuenow={milestoneProgress} aria-valuetext={`${milestoneProgress} of 100 commits`}>
        <span style={{ width: `${milestoneProgress}%` }} />
      </div>
    </div>
  </div>
}

export function WorldGuide({ repoSizeKb, knownCommitCount }: { repoSizeKb: number; knownCommitCount: number }) {
  const repositorySize = formatRepositorySize(repoSizeKb).toLowerCase()
  return <details className="world-guide">
    <summary>Map key: what each element means</summary>
    <ul className="world-guide-list">
      {Object.entries(EVENT_META).map(([kind, meta]) => <li key={kind}><strong>{meta.short}</strong><span>{meta.description}</span></li>)}
      <li><strong>Milestones</strong><span>One gold-and-teal monument marks every 100 commits and links to that hundredth commit.</span></li>
      <li><strong>Island size</strong><span>The shoreline follows the larger of the selected commit total and the repository size ({repositorySize}); the view leaves room for all {knownCommitCount.toLocaleString()} loaded commits.</span></li>
      <li><strong>Sea and base</strong><span>They frame the island and mark its scale; they do not represent repository activity.</span></li>
    </ul>
  </details>
}

export function EventDetails({ event, currentDate }: { event: TimelineEvent; currentDate: string }) {
  const meta = EVENT_META[event.kind]
  return <div className="event-details">
    <div className="detail-kind" style={{ '--event-color': meta.color } as CSSProperties}><span>{meta.icon}</span>{meta.singular}</div>
    <h3>{event.title}</h3>
    <p className="detail-copy">{event.detail}</p>
    <div className="detail-meta"><span className="detail-meta-icon">◷</span><span>{formatDate(event.at, { month: 'long', day: 'numeric', year: 'numeric' })}</span></div>
    {event.author && <div className="detail-meta"><span className="detail-avatar">{event.author.slice(0, 1).toUpperCase()}</span><span>{event.author}</span></div>}
    <div className="detail-status"><span className="status-square" style={{ backgroundColor: meta.color }} />{eventStatus(event, currentDate)}{event.inferred && <span className="inferred-label">estimated</span>}</div>
    {event.url && <a className="github-event-link" href={event.url} target="_blank" rel="noreferrer">Open on GitHub <Icon name="arrow" size={14} /></a>}
  </div>
}

export function SignalRow({ event, selected, onSelect }: { event: TimelineEvent; selected: boolean; onSelect: () => void }) {
  const meta = EVENT_META[event.kind]
  return <div className="signal-list-item" role="listitem"><button className={`signal-row ${selected ? 'selected' : ''}`} onClick={onSelect}>
    <span className="signal-mark" style={{ '--event-color': meta.color } as CSSProperties}>{meta.icon}</span>
    <span className="signal-main"><strong>{event.title}</strong><small>{eventSubtitle(event)}</small></span>
    <span className="signal-arrow"><Icon name="arrow" size={14} /></span>
  </button></div>
}

