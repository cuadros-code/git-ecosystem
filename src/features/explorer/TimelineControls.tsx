import type { CSSProperties } from 'react'
import type { TimelineEvent } from '../../domain/types'
import { relativePercent } from '../../domain/timeline'
import { formatDate } from '../../shared/eventPresentation'
import { Icon } from '../../shared/Icon'

export function TimelineControls({
  startDate,
  endDate,
  selectedDate,
  sliderValue,
  events,
  isPlaying,
  onPlay,
  onSeek,
}: {
  startDate: string
  endDate: string
  selectedDate: string
  sliderValue: number
  events: TimelineEvent[]
  isPlaying: boolean
  onPlay: () => void
  onSeek: (value: number) => void
}) {
  const markers = events
    .filter(event => ['release', 'bug', 'pull_request'].includes(event.kind))
    .slice(0, 35)
  return (
    <div className="timeline-panel">
      <div className="timeline-head">
        <div className="timeline-title">
          <span className="timeline-icon">
            <Icon name="clock" size={16} />
          </span>
          <div>
            <strong>Repository history</strong>
            <small>Watch the island grow over time</small>
          </div>
        </div>
        <span className="timeline-current">
          {formatDate(selectedDate, { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>
      <div className="timeline-controls">
        <button
          className={`play-button ${isPlaying ? 'is-playing' : ''}`}
          onClick={onPlay}
          aria-label={isPlaying ? 'Pause timeline' : 'Play timeline'}
        >
          <Icon name={isPlaying ? 'pause' : 'play'} size={15} />
        </button>
        <div className="range-wrap">
          <div className="timeline-marker-layer" aria-hidden="true">
            {markers.map(event => (
              <span
                key={event.id}
                className={`timeline-marker marker-${event.kind}`}
                style={{ left: `${relativePercent(event.at, startDate, endDate)}%` }}
              />
            ))}
          </div>
          <input
            type="range"
            min="0"
            max="1000"
            step="1"
            value={sliderValue}
            onChange={event => onSeek(Number(event.target.value))}
            aria-label="Select a date in the repository timeline"
            style={{ '--range-value': `${sliderValue / 10}%` } as CSSProperties}
          />
          <div className="timeline-labels">
            <span>{formatDate(startDate, { month: 'short', year: 'numeric' })}</span>
            <span>{formatDate(endDate, { month: 'short', year: 'numeric' })}</span>
          </div>
        </div>
        <button
          className="skip-button"
          onClick={() => onSeek(Math.min(1000, sliderValue + 120))}
          aria-label="Skip forward in timeline"
        >
          <Icon name="arrow" size={15} />
        </button>
      </div>
    </div>
  )
}
