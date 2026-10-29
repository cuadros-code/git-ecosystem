import { Application, Container, Graphics } from 'pixi.js'
import type { EventKind } from '../../domain/types'
import { buildStationLayout, buildStationModules, COMMITS_PER_MODULE, MAX_MODULES, selectStationSignals, solarArrayCount } from '../../domain/station'
import type { HitZone, StationCanvasProps } from './types'
import { C, WIDTH, HEIGHT, rect, textLabel, zone, background, corridor, drawModule, drawHub, drawCrew, drawSection, drawAntenna, drawSolarArray, drawAlert } from './sprites'

export function drawScene(app: Application, props: StationCanvasProps, zones: HitZone[]) {
  const root = app.stage
  for (const child of root.removeChildren()) child.destroy({ children: true })
  zones.length = 0
  const layout = buildStationLayout(props.repoName)
  const scene = new Container()
  const scale = Math.min(app.screen.width / WIDTH, app.screen.height / HEIGHT)
  scene.scale.set(scale)
  scene.position.set((app.screen.width - WIDTH * scale) / 2, (app.screen.height - HEIGHT * scale) / 2)
  root.addChild(scene)
  background(scene, layout.seed)
  const time = Date.parse(props.state.date)
  const { active, sections, crew, antennas, pulls, openAlerts } = selectStationSignals(props.events, props.state.date, props.visibleKinds)
  const ofKind = (kind: EventKind) => active.filter((event) => event.kind === kind)
  const modules = props.visibleKinds.has('commit') ? buildStationModules(props.events, props.state.date) : []
  const alerts = openAlerts.slice(0, 3)
  const connectors = new Graphics()
  modules.forEach((module) => corridor(connectors, layout.hub, layout.modules[module.index]))
  sections.forEach((_, index) => corridor(connectors, layout.hub, layout.sections[index], C.hullDark, 10))
  scene.addChild(connectors)
  if (props.visibleKinds.has('commit')) {
    const arrays = [{ x: 65, y: 155 }, { x: 735, y: 155 }, { x: 65, y: 305 }, { x: 735, y: 305 }]
    arrays.slice(0, solarArrayCount(props.state.commitCount)).forEach((point, index) => drawSolarArray(scene, point, layout.modules[index % 2 ? 5 : 4]))
  }
  modules.forEach((module) => {
    const point = layout.modules[module.index]
    drawModule(scene, point, module.index, module.stage)
    textLabel(scene, ['POWER', 'LAB', 'COMMS', 'HABITAT'][module.index % 4], point.x, point.y + 37, 8, C.hull)
    zone(zones, point, 46, module.event)
  })
  sections.forEach((event, index) => { drawSection(scene, layout.sections[index], index); zone(zones, layout.sections[index], 38, event) })
  drawHub(scene, props.state.commitCount > 0)
  crew.forEach((event, index) => { drawCrew(scene, layout.crew[index], index); zone(zones, layout.crew[index], 11, event) })
  antennas.forEach((event, index) => { drawAntenna(scene, layout.antennas[index]); zone(zones, layout.antennas[index], 23, event) })
  const visiblePulls = pulls.slice(0, modules.length)
  visiblePulls.forEach((event, index) => {
    const g = new Graphics()
    const target = layout.modules[modules[index % modules.length].index]
    const p = target.y !== layout.hub.y
      ? { x: target.x, y: (target.y + layout.hub.y) / 2 }
      : { x: (target.x + layout.hub.x) / 2, y: layout.hub.y }
    rect(g, p.x - 14, p.y - 6, 28, 12, C.outline)
    rect(g, p.x - 11, p.y - 3, 22, 6, event.kind === 'pull_request' && event.mergedAt && Date.parse(event.mergedAt) <= time ? C.yellow : C.orange)
    scene.addChild(g); zone(zones, p, 18, event)
  })
  alerts.forEach((event, index) => { drawAlert(scene, layout.alerts[index]); zone(zones, layout.alerts[index], 14, event) })
  textLabel(scene, props.repoName.toUpperCase(), 113, 23, 10, C.hull)
  textLabel(scene, `${props.state.commitCount} COMMITS · ${Math.round(props.state.stationProgress * 100)}% OF LOADED HISTORY`, 663, 23, 9, C.yellow)
  textLabel(scene, 'MISSION CONTROL', 400, 293, 9, C.hull)
  const totalAlerts = openAlerts.length
  const extras = [
    [Math.max(0, ofKind('contributor').length - crew.length), 'crew'],
    [Math.max(0, ofKind('release').length - sections.length), 'releases'],
    [Math.max(0, ofKind('branch').length - antennas.length), 'branches'],
    [Math.max(0, ofKind('pull_request').length - visiblePulls.length), 'links'],
    [Math.max(0, totalAlerts - alerts.length), 'alerts'],
  ].filter(([count]) => Number(count) > 0).map(([count, name]) => `+${count} ${name}`).join('   ')
  if (extras) textLabel(scene, extras, 400, 439, 9, C.yellow)
  const selected = active.find((event) => event.id === props.selectedEventId)
  if (selected) {
    let hit = zones.find((item) => item.eventId === selected.id)
    if (!hit) {
      let point = layout.hub
      if (selected.kind === 'commit') {
        const sorted = props.events.filter((event) => event.kind === 'commit').sort((a, b) => Date.parse(a.at) - Date.parse(b.at) || a.id.localeCompare(b.id))
        const index = sorted.findIndex((event) => event.id === selected.id)
        point = layout.modules[Math.min(MAX_MODULES - 1, Math.floor(Math.max(0, index) / COMMITS_PER_MODULE))]
      } else if (selected.kind === 'branch') point = layout.antennas[0]
      else if (selected.kind === 'release') point = layout.sections[0]
      else if (selected.kind === 'bug') point = layout.alerts[0]
      hit = { ...point, radius: 24, eventId: selected.id }
    }
    const marker = new Graphics()
    marker.rect(hit.x - hit.radius, hit.y - hit.radius, hit.radius * 2, hit.radius * 2).stroke({ width: 3, color: C.yellow })
    scene.addChild(marker)
    textLabel(scene, selected.title.slice(0, 32), Math.max(100, Math.min(700, hit.x)), Math.max(45, hit.y - hit.radius - 12), 9, C.yellow)
  }
  app.renderer.render(root)
}

