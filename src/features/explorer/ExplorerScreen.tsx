import { lazy, Suspense } from 'react'
import type { CSSProperties } from 'react'
import type { EventKind, RepositorySnapshot } from '../../domain/types'
import { EVENT_META, compactNumber, formatDate } from '../../shared/eventPresentation'
import { Icon } from '../../shared/Icon'
import { BrandMark } from '../../shared/BrandMark'
import { EventDetails, SignalRow, WorldSummary } from './Inspector'
import { TimelineControls } from './TimelineControls'
import type { useExplorer } from './useExplorer'

const PixelWorld = lazy(() => import('../station/StationCanvas'))

export function ExplorerScreen({ model, repository }: { model: ReturnType<typeof useExplorer>; repository: RepositorySnapshot }) {
  const { goHome, source, worldState, clampedDate, showMobileDetails, setShowMobileDetails, openDemo, hasPartialHistory, hasEarlierHistory, loadEarlier, isLoadingEarlier, bundle, hasFailedTrails, retryRepositoryData, isLoading, loadError, events, selectedEventId, setSelectedEventId, visibleKinds, toggleKind, startDate, endDate, sliderValue, isPlaying, toggleTimeline, changeDateFromSlider, selectedEvent, latestEvents } = model
  return (
    <main className="app-shell explorer-shell">
      <header className="app-header explorer-header">
        <button className="brand-lockup" onClick={goHome} aria-label="Return to RepoOrbit home">
          <BrandMark />
          <span>RepoOrbit</span>
        </button>
        <div className="header-context"><span className="live-dot" />A station built from code</div>
        <button className="quiet-button change-repo-button" onClick={goHome}><Icon name="back" size={16} /> Change repository</button>
      </header>

      <div className="explorer-content">
        <section className="repo-heading" aria-labelledby="repo-title">
          <div className="repo-main">
            <div className="crumb"><span>STATION</span><span className="crumb-slash">/</span><span>{source === 'demo' ? 'SAMPLE RECORD' : 'PUBLIC REPOSITORY'}</span></div>
            <h1 id="repo-title">{repository.fullName}</h1>
            <p>{repository.description || 'A mission built in the open.'}</p>
          </div>
          <div className="repo-stats" aria-label="Repository statistics">
            <Stat value={compactNumber(repository.stars)} label="Stars" icon="✳" />
            <Stat value={compactNumber(repository.forks)} label="Forks" icon="⌁" />
            <Stat value={worldState.contributorCount.toLocaleString()} label="Crew" icon="◆" />
          </div>
        </section>

        <div className="workspace-toolbar">
          <div className="map-heading"><span className="pixel-marker" /><div><strong>Station map</strong><span>{worldState.stationStageName} · {worldState.commitCount.toLocaleString()} loaded commits by {formatDate(clampedDate, { month: 'long', year: 'numeric' })}</span></div></div>
          <button className="mobile-detail-toggle" onClick={() => setShowMobileDetails((open) => !open)} aria-expanded={showMobileDetails}>
            {showMobileDetails ? 'Hide details' : 'Explore details'}
          </button>
          <div className="map-tools"><span><span className="tool-dot" />History loaded</span><a href={repository.htmlUrl} target="_blank" rel="noreferrer">View on GitHub <Icon name="arrow" size={14} /></a></div>
        </div>

        {source === 'demo' && <div className="demo-notice"><Icon name="spark" size={15} /><span>Sample station · fictional activity, clearly marked for exploration</span><button onClick={openDemo}>Sample record</button></div>}
        {source === 'github' && hasPartialHistory && (
          <div className="history-notice" role="status">
            <div><span className="notice-icon">i</span><span>{hasEarlierHistory ? 'Showing the latest available history. Older events can be loaded as needed.' : 'Some event records may be incomplete because of GitHub’s public data limits.'}</span></div>
            <div className="notice-actions">
              {hasEarlierHistory && <button onClick={() => void loadEarlier()} disabled={isLoadingEarlier || bundle?.rateLimit.remaining === 0}>{isLoadingEarlier ? 'Loading earlier history…' : bundle?.rateLimit.remaining === 0 ? 'Quota reached' : 'Load earlier history'}</button>}
              {hasFailedTrails && <button onClick={() => void retryRepositoryData()} disabled={isLoading || bundle?.rateLimit.remaining === 0}>{isLoading ? 'Refreshing…' : bundle?.rateLimit.remaining === 0 ? 'Retry after quota resets' : 'Retry failed records'}</button>}
            </div>
          </div>
        )}
        {source === 'github' && bundle?.notes.length ? <p className="subtle-warning">{bundle.notes[0]}</p> : null}
        {loadError && <p className="subtle-warning" role="alert">{loadError}</p>}

        <section className={`explorer-grid ${showMobileDetails ? 'details-open' : ''}`} aria-label="Repository station explorer">
          <div className="map-column">
            <div className="world-frame">
              <div className="world-edge top-edge"><span>Orbital station · top view</span><span>One station, built over time</span></div>
              <Suspense fallback={<div className="world-canvas world-loading" role="status">Preparing the station…</div>}>
                <PixelWorld
                  repoName={repository.fullName}
                  events={events}
                  state={worldState}
                  selectedEventId={selectedEventId}
                  visibleKinds={visibleKinds}
                  onSelectEvent={(id) => { setSelectedEventId(id); setShowMobileDetails(true) }}
                />
              </Suspense>
              <div className="world-edge bottom-edge"><span><span className="coordinate-dot" />{events.length.toLocaleString()} recorded events</span><span>{worldState.branchCount} branches · {worldState.openBugs} active alerts</span></div>
            </div>

            <div className="legend-row" aria-label="Toggle station event layers">
              {Object.entries(EVENT_META).map(([kind, meta]) => {
                const typedKind = kind as EventKind
                const active = visibleKinds.has(typedKind)
                return <button key={kind} className={`legend-chip ${active ? 'active' : ''}`} onClick={() => toggleKind(typedKind)} aria-pressed={active} style={{ '--chip-color': meta.color } as CSSProperties}>
                  <span>{meta.icon}</span>{meta.short}
                </button>
              })}
              <span className="legend-hint">Select a layer to focus the map</span>
            </div>

            <TimelineControls
              startDate={startDate}
              endDate={endDate}
              selectedDate={clampedDate}
              sliderValue={sliderValue}
              events={events}
              isPlaying={isPlaying}
              onPlay={toggleTimeline}
              onSeek={changeDateFromSlider}
            />
          </div>

          <aside className="inspector-panel" aria-label="Selected event and recent records">
            <div className="inspector-heading"><div><span className="panel-kicker">MISSION LOG</span><h2>{selectedEvent ? 'Record details' : 'Station at a glance'}</h2></div><button className="mobile-close" onClick={() => setShowMobileDetails(false)} aria-label="Close details"><Icon name="close" size={18} /></button></div>
            {selectedEvent ? <EventDetails event={selectedEvent} currentDate={clampedDate} /> : <WorldSummary state={worldState} />}
            <div className="signals-heading"><span>Recent records</span><span>{latestEvents.length} shown</span></div>
            <div className="signal-list" role="list" aria-label="Recent repository events">
              {latestEvents.length ? latestEvents.map((event) => <SignalRow key={event.id} event={event} selected={event.id === selectedEventId} onSelect={() => { setSelectedEventId(event.id); setShowMobileDetails(true) }} />) : <p className="empty-signals">No records yet at this date. Move forward to watch the station grow.</p>}
            </div>
            <div className="coverage-footnote"><span className="footnote-mark">~</span><span>Modules grow for every 20 loaded commits, up to eight; larger histories add up to four arrays. Loading earlier history can regroup modules. Branch and crew dates may be estimated.</span></div>
          </aside>
        </section>

        <footer className="explorer-footer"><span><Icon name="clock" size={14} />Repository created {formatDate(repository.createdAt, { month: 'short', year: 'numeric' })}</span><span>Read-only public data · No sign-in needed</span></footer>
      </div>
    </main>
  )
}

function Stat({ value, label, icon }: { value: string; label: string; icon: string }) {
  return <div className="stat-item"><span className="stat-icon">{icon}</span><span className="stat-value">{value}</span><span className="stat-label">{label}</span></div>
}

