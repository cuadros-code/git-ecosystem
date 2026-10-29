import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import type { TimelineEvent } from '../../domain/types'
import type { WorldPoint } from '../../domain/station'
import type { HitZone } from './types'

export const C = { space: 0x101f2d, star: 0x8097a1, shadow: 0x0c1822, outline: 0x263b49, hull: 0xe6dfce, hullDark: 0xaebcbb, light: 0xf6f0de, blue: 0x47788e, blueDark: 0x244c63, orange: 0xe47746, yellow: 0xe9bc70, red: 0xf17864, white: 0xffffff }
export const WIDTH = 800
export const HEIGHT = 460

export function rect(g: Graphics, x: number, y: number, w: number, h: number, color: number, alpha = 1) {
  g.rect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)).fill({ color, alpha })
}
export function textLabel(stage: Container, content: string, x: number, y: number, size = 10, color = C.hull) {
  const label = new Text({ text: content, style: new TextStyle({ fontFamily: 'IBM Plex Mono, monospace', fontSize: size, fontWeight: '600', fill: color, letterSpacing: 0.4 }) })
  label.anchor.set(0.5); label.position.set(x, y); stage.addChild(label)
}
export function zone(zones: HitZone[], point: WorldPoint, radius: number, event?: TimelineEvent) {
  if (event) zones.push({ x: point.x, y: point.y, radius, eventId: event.id })
}
export function background(stage: Container, seed: number) {
  const g = new Graphics()
  rect(g, 0, 0, WIDTH, HEIGHT, C.space)
  let value = seed
  for (let i = 0; i < 75; i += 1) {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0
    const x = 20 + value % 760
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0
    const y = 20 + value % 420
    rect(g, x, y, i % 11 === 0 ? 3 : 2, i % 11 === 0 ? 3 : 2, C.star, i % 3 === 0 ? 0.7 : 0.35)
  }
  // A distant planet is deliberately quiet, so the station remains the focus.
  g.circle(725, 430, 112).fill({ color: 0x213c4c, alpha: 0.8 })
  g.circle(740, 443, 91).fill({ color: 0x2c5060, alpha: 0.55 })
  stage.addChild(g)
}
export function corridor(g: Graphics, a: WorldPoint, b: WorldPoint, color = C.hullDark, width = 14) {
  g.moveTo(a.x, a.y).lineTo(b.x, a.y).lineTo(b.x, b.y).stroke({ width: width + 5, color: C.outline })
  g.moveTo(a.x, a.y).lineTo(b.x, a.y).lineTo(b.x, b.y).stroke({ width, color })
  g.moveTo(a.x, a.y).lineTo(b.x, a.y).lineTo(b.x, b.y).stroke({ width: 2, color: C.light, alpha: 0.65 })
}
export function drawModule(stage: Container, point: WorldPoint, index: number, stageLevel: number) {
  const g = new Graphics(); const { x, y } = point
  const w = 96, h = 58
  rect(g, x - w / 2 + 5, y - h / 2 + 6, w, h, C.shadow, 0.7)
  rect(g, x - w / 2, y - h / 2, w, h, C.outline)
  rect(g, x - w / 2 + 4, y - h / 2 + 4, w - 8, h - 8, stageLevel === 1 ? C.hullDark : C.hull)
  rect(g, x - w / 2 + 4, y - h / 2 + 4, w - 8, 6, stageLevel === 1 ? C.blue : C.light)
  rect(g, x - w / 2 + 4, y + h / 2 - 9, w - 8, 5, C.hullDark)
  if (stageLevel === 1) {
    rect(g, x - 25, y - 2, 50, 4, C.blueDark); rect(g, x - 2, y - 16, 4, 31, C.blueDark)
    rect(g, x - 30, y + 15, 60, 3, C.orange)
  } else {
    rect(g, x - 36, y - 15, 72, 28, C.blueDark)
    rect(g, x - 32, y - 11, 64, 20, C.blue)
    rect(g, x - 2, y - 11, 4, 20, C.hullDark)
    rect(g, x - 34, y + 17, 23, 4, C.orange)
    rect(g, x + 20, y + 17, 14, 4, C.yellow)
    if (stageLevel === 3) {
      rect(g, x - 39, y - 21, 10, 4, C.orange)
      rect(g, x + 29, y - 21, 10, 4, C.orange)
      rect(g, x - 26, y - 7, 14, 4, C.light, 0.8)
      rect(g, x + 10, y - 7, 14, 4, C.light, 0.8)
    }
  }
  // Four system types use the same silhouette and a small distinct marking.
  const colors = [C.yellow, C.blue, C.orange, C.hullDark]
  rect(g, x - 4, y + 15, 8, 8, colors[index % 4])
  stage.addChild(g)
}
export function drawHub(stage: Container, hasCommits: boolean) {
  const g = new Graphics()
  rect(g, 343, 190, 120, 88, C.shadow, 0.7)
  rect(g, 340, 185, 120, 88, C.outline)
  rect(g, 345, 190, 110, 78, hasCommits ? C.hull : C.hullDark)
  rect(g, 351, 196, 98, 66, C.blueDark)
  rect(g, 356, 201, 88, 56, C.blue)
  rect(g, 375, 221, 50, 18, C.hullDark)
  rect(g, 380, 225, 40, 10, C.hull)
  rect(g, 345, 190, 110, 5, C.light)
  rect(g, 345, 263, 110, 5, C.orange)
  rect(g, 391, 190, 18, 5, C.orange)
  stage.addChild(g)
}
export function drawCrew(stage: Container, point: WorldPoint, index: number) {
  const g = new Graphics(); const { x, y } = point
  rect(g, x - 6, y - 8, 12, 13, C.outline)
  rect(g, x - 5, y - 7, 10, 11, C.light)
  rect(g, x - 3, y - 5, 6, 4, C.blueDark)
  rect(g, x - 5, y + 5, 4, 4, C.hullDark); rect(g, x + 1, y + 5, 4, 4, C.hullDark)
  rect(g, x - 7, y, 2, 5, index % 2 ? C.orange : C.yellow)
  stage.addChild(g)
}
export function drawSection(stage: Container, point: WorldPoint, index: number) {
  const g = new Graphics(); const { x, y } = point
  rect(g, x - 40 + 4, y - 24 + 5, 80, 48, C.shadow, 0.75)
  rect(g, x - 40, y - 24, 80, 48, C.outline)
  rect(g, x - 36, y - 20, 72, 40, C.hull)
  rect(g, x - 36, y - 20, 72, 6, C.orange)
  if (index === 0) { rect(g, x - 23, y - 5, 46, 18, C.blueDark); rect(g, x - 18, y, 36, 4, C.blue) }
  else { g.circle(x, y + 2, 15).fill(C.blueDark); g.circle(x, y + 2, 10).fill(C.blue); rect(g, x - 2, y - 7, 4, 18, C.hullDark) }
  stage.addChild(g)
}
export function drawAntenna(stage: Container, point: WorldPoint) {
  const g = new Graphics(); const { x, y } = point
  rect(g, x - 4, y - 14, 8, 28, C.hullDark); rect(g, x - 18, y - 18, 36, 6, C.orange)
  rect(g, x - 13, y - 25, 26, 7, C.hull); rect(g, x - 3, y - 30, 6, 5, C.yellow)
  stage.addChild(g)
}
export function drawSolarArray(stage: Container, point: WorldPoint, hub: WorldPoint) {
  const g = new Graphics()
  corridor(g, hub, point, C.hullDark, 7)
  rect(g, point.x - 29, point.y - 26, 58, 52, C.outline)
  rect(g, point.x - 25, point.y - 22, 50, 44, C.blueDark)
  rect(g, point.x - 22, point.y - 19, 44, 38, C.blue)
  rect(g, point.x - 2, point.y - 19, 4, 38, C.hullDark)
  rect(g, point.x - 22, point.y - 2, 44, 4, C.hullDark)
  rect(g, point.x - 25, point.y - 25, 50, 3, C.orange)
  stage.addChild(g)
}
export function drawAlert(stage: Container, point: WorldPoint) {
  const g = new Graphics(); const { x, y } = point
  rect(g, x - 10, y - 10, 20, 20, C.outline); rect(g, x - 7, y - 7, 14, 14, C.red)
  rect(g, x - 1, y - 5, 3, 7, C.white); rect(g, x - 1, y + 4, 3, 3, C.white)
  stage.addChild(g)
}

