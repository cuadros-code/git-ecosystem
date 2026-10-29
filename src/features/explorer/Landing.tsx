import { useEffect, useRef } from 'react'
import type { FormEvent } from 'react'
import { gsap } from 'gsap'
import SampleWorldPreview from '../world/SampleWorldPreview'
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
  const shellRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const media = gsap.matchMedia()
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const context = gsap.context(() => {
        const entrance = gsap.timeline({ defaults: { ease: 'power2.out' } })
        entrance
          .fromTo('.landing-header', { autoAlpha: 0, y: -8 }, { autoAlpha: 1, y: 0, duration: 0.42 })
          .fromTo('.hero-copy > *', { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.46, stagger: 0.065 }, '-=0.12')
          .fromTo('.preview-column', { autoAlpha: 0, y: 18, scale: 0.985 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.62 }, '-=0.46')
          .fromTo('.growth-item', { autoAlpha: 0, y: 9 }, { autoAlpha: 1, y: 0, duration: 0.38, stagger: 0.07 }, '-=0.2')
      }, shellRef)
      return () => context.revert()
    })
    return () => media.revert()
  }, [])

  return (
    <main className="app-shell landing-shell" ref={shellRef}>
      <header className="app-header landing-header">
        <a className="brand-lockup" href="#top" aria-label="Git Ecosystem home"><BrandMark /><span>Git Ecosystem</span></a>
        <div className="landing-nav"><a href="#how-it-grows">How it grows</a><button className="quiet-button" onClick={onOpenDemo}>Explore sample island <Icon name="arrow" size={15} /></button></div>
      </header>

      <section className="landing-hero" id="top">
        <div className="hero-copy">
          <div className="hero-eyebrow"><span className="live-dot" />A living map of open source</div>
          <h1>Your repository<br />takes root.</h1>
          <p className="hero-description">Each commit shapes an island. Contributors grow the canopy, branches open trails, and releases raise a lighthouse above the project.</p>
          <form className="repo-form" onSubmit={onSubmit} noValidate>
            <label htmlFor="repo-url">Enter a public GitHub repository</label>
            <div className={`repo-input-wrap ${fieldError ? 'has-error' : ''}`}>
              <span className="repo-input-prefix"><Icon name="github" size={17} /><span>github.com /</span></span>
              <input id="repo-url" value={input} onChange={(event) => setInput(event.target.value)} placeholder="owner/repository" autoComplete="url" aria-describedby={fieldError ? 'repo-error' : undefined} />
              <button type="submit" aria-label="Explore repository world" disabled={isLoading}>{isLoading ? <span className="button-spinner" /> : <Icon name="arrow" size={19} />}</button>
            </div>
            {fieldError && <p className="form-error" id="repo-error" role="alert">{fieldError}</p>}
            {loadError && <p className="form-error" role="alert">{loadError}</p>}
            {isLoading && <p className="form-help" role="status">Gathering public signals from GitHub…</p>}
          </form>
          <div className="hero-quiet-note"><span className="lock-mark">◇</span>Read-only · No sign-in · Public repositories</div>
        </div>

        <div className="preview-column">
          <div className="preview-topline"><span><i /> SAMPLE WORLD</span><span>2022 — 2025</span></div>
          <div className="preview-world"><SampleWorldPreview /></div>
          <div className="preview-caption"><div><span>24 COMMITS · 5 CONTRIBUTORS · 4 RELEASES</span><strong>A small project, taking shape</strong></div><button onClick={onOpenDemo} aria-label="Explore sample island"><Icon name="arrow" size={18} /></button></div>
          <div className="mini-track" aria-hidden="true"><span /><span /><span /><span /><span /><span /><span /><i /></div>
          <div className="preview-foot"><span><span className="micro-leaf">▣</span>Grown from history</span><span><span className="micro-branch">⌁</span>One island</span><span><span className="micro-bug">◆</span>Real events</span></div>
        </div>
      </section>

      <section className="growth-explainer" id="how-it-grows" aria-label="How GitHub activity shapes a world">
        <div className="growth-title"><span>HOW THE ISLAND GROWS</span><p>A project history you can walk through.</p></div>
        <div className="growth-item"><span className="growth-icon commit-icon">▣</span><div><strong>Commits shape the land</strong><p>Each advance adds terrain and detail.</p></div></div>
        <div className="growth-item"><span className="growth-icon branch-icon">⌁</span><div><strong>People grow the forest</strong><p>Contributors become trees; branches become trails.</p></div></div>
        <div className="growth-item"><span className="growth-icon bridge-icon">◆</span><div><strong>Releases raise the beacon</strong><p>Merged work opens bridges across the island.</p></div></div>
      </section>

      <footer className="landing-footer"><span>Git Ecosystem turns public project history into a living world.</span><span>Every island begins with one commit <span className="footer-spark">◆</span></span></footer>
    </main>
  )
}

