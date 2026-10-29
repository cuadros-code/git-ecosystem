import { useEffect, useRef, useState } from 'react'
import { Application, Rectangle } from 'pixi.js'
import { C, WIDTH, HEIGHT } from './sprites'
import { drawScene } from './renderStation'
import type { HitZone, StationCanvasProps } from './types'

export default function StationCanvas(props: StationCanvasProps) {
  const [renderError, setRenderError] = useState(false)
  const hostRef = useRef<HTMLDivElement | null>(null)
  const appRef = useRef<Application | null>(null)
  const zonesRef = useRef<HitZone[]>([])
  const propsRef = useRef(props)
  propsRef.current = props
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const app = new Application()
    let cancelled = false
    let observer: ResizeObserver | undefined
    void (async () => {
      try {
        await app.init({ resizeTo: host, backgroundColor: C.space, antialias: false, autoDensity: true, resolution: Math.min(window.devicePixelRatio || 1, 2), preference: 'webgl', autoStart: false })
        if (cancelled) { app.destroy({ removeView: true }, { children: true }); return }
        appRef.current = app
        app.canvas.setAttribute('role', 'img')
        app.canvas.setAttribute('aria-label', 'Top-down pixel art space station. Commits build modules, contributors join the crew, releases open new sections, and open bugs appear as alerts. Select events in the list for details.')
        host.appendChild(app.canvas)
        app.stage.eventMode = 'static'
        app.stage.hitArea = new Rectangle(0, 0, app.screen.width, app.screen.height)
        app.stage.on('pointertap', (event: { global: { x: number; y: number } }) => {
          const scale = Math.min(app.screen.width / WIDTH, app.screen.height / HEIGHT)
          const x = (event.global.x - (app.screen.width - WIDTH * scale) / 2) / scale
          const y = (event.global.y - (app.screen.height - HEIGHT * scale) / 2) / scale
          const nearest = zonesRef.current.map((item) => ({ item, distance: Math.hypot(item.x - x, item.y - y) }))
            .filter(({ item, distance }) => distance <= item.radius).sort((a, b) => a.distance - b.distance)[0]
          if (nearest) propsRef.current.onSelectEvent(nearest.item.eventId)
        })
        observer = new ResizeObserver(() => {
          if (!host.clientWidth || !host.clientHeight) return
          app.renderer.resize(host.clientWidth, host.clientHeight)
          app.stage.hitArea = new Rectangle(0, 0, app.screen.width, app.screen.height)
          drawScene(app, propsRef.current, zonesRef.current)
        })
        observer.observe(host)
        drawScene(app, propsRef.current, zonesRef.current)
      } catch { if (!cancelled) setRenderError(true) }
    })()
    return () => { cancelled = true; observer?.disconnect(); if (appRef.current === app) appRef.current = null; if (app.renderer) app.destroy({ removeView: true }, { children: true }) }
  }, [])
  useEffect(() => { const app = appRef.current; if (app?.renderer) drawScene(app, props, zonesRef.current) }, [props.repoName, props.events, props.state, props.selectedEventId, props.visibleKinds])
  return <div className="world-canvas" ref={hostRef} aria-label="Repository space station map">{renderError && <p className="world-loading" role="alert">The station could not be rendered. You can still explore events in the mission log.</p>}</div>
}
