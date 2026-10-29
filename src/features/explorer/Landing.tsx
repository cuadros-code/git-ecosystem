import type { FormEvent } from 'react'
import PixelPreview from '../station/PixelPreview'
import { Icon } from '../../shared/Icon'
import { BrandMark } from '../../shared/BrandMark'

export function Landing({
  input,
  setInput,
  fieldError,
  loadError,
  isLoading,
  onSubmit,
  onOpenDemo,
}: {
  input: string
  setInput: (value: string) => void
  fieldError: string
  loadError: string
  isLoading: boolean
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onOpenDemo: () => void
}) {
  return (
    <main className="app-shell landing-shell">
      <header className="app-header landing-header">
        <a className="brand-lockup" href="#top" aria-label="RepoOrbit home"><BrandMark /><span>RepoOrbit</span></a>
        <div className="landing-nav"><a href="#how-it-grows">How it grows</a><button className="quiet-button" onClick={onOpenDemo}>Open sample station <Icon name="arrow" size={15} /></button></div>
      </header>

      <section className="landing-hero" id="top">
        <div className="hero-copy">
          <div className="hero-eyebrow"><span className="live-dot" />A new way to read open source</div>
          <h1>Your code<br />builds a station.</h1>
          <p className="hero-description">Every commit adds to an orbital station. Contributors join the crew, releases open new sections, and the mission grows with your project.</p>
          <form className="repo-form" onSubmit={onSubmit} noValidate>
            <label htmlFor="repo-url">Enter a public GitHub repository</label>
            <div className={`repo-input-wrap ${fieldError ? 'has-error' : ''}`}>
              <span className="repo-input-prefix"><Icon name="github" size={17} /><span>github.com /</span></span>
              <input id="repo-url" value={input} onChange={(event) => setInput(event.target.value)} placeholder="owner/repository" autoComplete="url" aria-describedby={fieldError ? 'repo-error' : undefined} />
              <button type="submit" aria-label="Explore station" disabled={isLoading}>{isLoading ? <span className="button-spinner" /> : <Icon name="arrow" size={19} />}</button>
            </div>
            {fieldError && <p className="form-error" id="repo-error" role="alert">{fieldError}</p>}
            {loadError && <p className="form-error" role="alert">{loadError}</p>}
            {isLoading && <p className="form-help" role="status">Gathering public signals from GitHub…</p>}
          </form>
          <div className="hero-quiet-note"><span className="lock-mark">◇</span>Read-only · No sign-in · Public repositories</div>
        </div>

        <div className="preview-column">
          <div className="preview-topline"><span><i /> SAMPLE STATION</span><span>2022 — 2025</span></div>
          <div className="preview-world"><PixelPreview /></div>
          <div className="preview-caption"><div><span>THE STATION AT A GLANCE</span><strong>A station in the making</strong></div><button onClick={onOpenDemo} aria-label="Open sample station"><Icon name="arrow" size={18} /></button></div>
          <div className="mini-track" aria-hidden="true"><span /><span /><span /><span /><span /><span /><span /><i /></div>
          <div className="preview-foot"><span><span className="micro-leaf">▣</span>24 commits</span><span><span className="micro-branch">⌁</span>3 branches</span><span><span className="micro-bug">◆</span>5 crew</span></div>
        </div>
      </section>

      <section className="growth-explainer" id="how-it-grows" aria-label="How GitHub activity becomes a station">
        <div className="growth-title"><span>HOW THE STATION GROWS</span><p>A mission built by many hands.</p></div>
        <div className="growth-item"><span className="growth-icon commit-icon">▣</span><div><strong>Commits build modules</strong><p>A shared station grows through time.</p></div></div>
        <div className="growth-item"><span className="growth-icon branch-icon">⌁</span><div><strong>Branches extend antennas</strong><p>Signals reach out from the station.</p></div></div>
        <div className="growth-item"><span className="growth-icon bridge-icon">◆</span><div><strong>Contributors join the crew</strong><p>Each person brings the mission to life.</p></div></div>
      </section>

      <footer className="landing-footer"><span>RepoOrbit is an open-source way to explore public project history.</span><span>Every mission begins with a first commit <span className="footer-spark">◆</span></span></footer>
    </main>
  )
}

