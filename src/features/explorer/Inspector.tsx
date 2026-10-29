import type { CSSProperties } from 'react'
import type { WorldState, TimelineEvent } from '../../domain/types'
import { EVENT_META, eventStatus, eventSubtitle, formatDate } from '../../shared/eventPresentation'
import { Icon } from '../../shared/Icon'

export function WorldSummary({ state }: { state: WorldState }) {
  return <div className="world-summary">
    <p className="summary-date">{formatDate(state.date, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
    <p className="summary-copy">Station phase: <strong>{state.stationStageName.toLowerCase()}</strong>. {state.moduleCount} {state.moduleCount === 1 ? 'module is' : 'modules are'} active. Select a landmark to uncover its record.</p>
    <div className="summary-metrics">
      <div><span>{state.commitCount}</span><small>commits</small></div>
      <div><span>{state.branchCount}</span><small>branches</small></div>
      <div><span>{state.contributorCount}</span><small>crew members</small></div>
      <div><span>{state.releaseCount}</span><small>releases</small></div>
    </div>
  </div>
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

