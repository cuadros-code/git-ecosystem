import * as THREE from 'three'
import type { EventKind, TimelineEvent } from '../../domain/types'
import type { RepositoryWorldProps } from './types'

export const VOXEL_TYPES = [
  'soil', 'soilLight', 'grass', 'grassLight', 'sand', 'rock', 'trunk', 'wood', 'woodLight',
  'leaf', 'leafLight', 'leafMoss', 'lighthouseRed', 'lighthouseWhite', 'glass', 'alert', 'flower',
  'milestoneStone', 'milestoneGold', 'milestoneCrystal',
] as const

export type VoxelType = typeof VOXEL_TYPES[number]
export interface VoxelPlacement { x: number; y: number; z: number; eventId: string | null }
export interface GeneratedWorld {
  voxels: Record<VoxelType, VoxelPlacement[]>
  eventPositions: Map<string, THREE.Vector3>
  mapExtent: number
}

const EVENT_KINDS: EventKind[] = ['commit', 'branch', 'pull_request', 'bug', 'contributor', 'release']

function hash(value: string): number {
  let result = 2166136261
  for (let i = 0; i < value.length; i += 1) result = Math.imul(result ^ value.charCodeAt(i), 16777619)
  return result >>> 0
}

function sample(seed: number, x: number, z: number, salt = '') {
  return hash(`${seed}:${x}:${z}:${salt}`) / 0xffffffff
}

function gridKey(x: number, z: number) { return `${x},${z}` }

function nearestCell(cells: SurfaceCell[], x: number, z: number) {
  return cells.reduce((nearest, cell) => Math.hypot(cell.x - x, cell.z - z) < Math.hypot(nearest.x - x, nearest.z - z) ? cell : nearest)
}

interface SurfaceCell { x: number; z: number; height: number; distance: number }

export function islandRadiusForCommits(commitCount: number): number {
  if (commitCount <= 0) return 0.95
  const earlyGrowth = 2.35 + Math.log2(commitCount + 1) * 0.68
  const largeRepositoryGrowth = Math.max(0, Math.sqrt(commitCount / 100) - 1) * 0.63
  return Math.min(28, earlyGrowth + largeRepositoryGrowth)
}

export function islandRadiusForRepositorySize(sizeKb: number): number {
  if (sizeKb <= 0) return 0.95
  const sizeGrowth = 2.8 + Math.log2(1 + sizeKb / 1024) * 0.68
  return Math.min(28, sizeGrowth)
}

function spacedMilestoneSites(cells: SurfaceCell[], count: number, seed: number, lighthouseCell: SurfaceCell | null, radius: number): SurfaceCell[] {
  const candidates = cells.filter((cell) =>
    cell.distance > Math.max(1.5, radius * 0.56)
    && (!lighthouseCell || Math.hypot(cell.x - lighthouseCell.x, cell.z - lighthouseCell.z) > 2.6),
  )
  const sites: SurfaceCell[] = []
  const nearestDistances = candidates.map((cell) => cell.distance)

  while (sites.length < Math.min(count, candidates.length)) {
    let bestIndex = 0
    let bestScore = -Infinity
    candidates.forEach((candidate, index) => {
      const stableVariation = sample(seed, candidate.x, candidate.z, `milestone-${sites.length}`) * 0.08
      if (nearestDistances[index] + stableVariation > bestScore) {
        bestScore = nearestDistances[index] + stableVariation
        bestIndex = index
      }
    })
    const site = candidates.splice(bestIndex, 1)[0]
    nearestDistances.splice(bestIndex, 1)
    sites.push(site)
    candidates.forEach((candidate, index) => {
      nearestDistances[index] = Math.min(nearestDistances[index], Math.hypot(candidate.x - site.x, candidate.z - site.z))
    })
  }

  return sites
}

export function buildWorldScene(repoName: string, props: Pick<RepositoryWorldProps, 'repoSizeKb' | 'state' | 'visibleKinds'>): GeneratedWorld {
  const voxels = Object.fromEntries(VOXEL_TYPES.map((type) => [type, []])) as unknown as Record<VoxelType, VoxelPlacement[]>
  const eventPositions = new Map<string, THREE.Vector3>()
  const activeEvents = props.state.selectedEvents
  const isVisible = (kind: EventKind) => props.visibleKinds.has(kind)
  const ofKind = (kind: EventKind) => activeEvents.filter((event) => event.kind === kind)
  const commits = ofKind('commit').sort(byDate)
  const releases = isVisible('release') ? ofKind('release') : []
  const branches = isVisible('branch') ? ofKind('branch') : []
  const pullRequests = isVisible('pull_request') ? ofKind('pull_request') : []
  const bugs = isVisible('bug') ? ofKind('bug') : []
  const seed = hash(repoName.toLowerCase())
  const commitCount = props.state.commitCount
  const radius = Math.max(islandRadiusForCommits(commitCount), islandRadiusForRepositorySize(props.repoSizeKb))
  const mapExtent = Math.max(radius, islandRadiusForCommits(props.state.knownCommitCount), islandRadiusForRepositorySize(props.repoSizeKb))
  const gridLimit = Math.ceil(mapExtent + 1)
  const elevationTier = Math.min(10, Math.floor(commitCount / 50))
  const cells: SurfaceCell[] = []
  const cellsByKey = new Map<string, SurfaceCell>()
  const lastCommit = isVisible('commit') ? commits.at(-1) : undefined

  const addVoxel = (type: VoxelType, x: number, y: number, z: number, eventId: string | null = null) => {
    voxels[type].push({ x, y, z, eventId })
  }

  // Commit history expands a wider island and raises its interior into distinct terraces.
  for (let x = -gridLimit; x <= gridLimit; x += 1) {
    for (let z = -gridLimit; z <= gridLimit; z += 1) {
      const distance = Math.hypot(x, z)
      const edgeDistance = distance + (sample(seed, x, z, 'shore') - 0.5) * 0.72
      if (edgeDistance > radius) continue

      const hill = Math.floor(Math.max(0, radius - edgeDistance) * 0.34)
      const rise = Math.floor(elevationTier * Math.max(0, 1 - distance / Math.max(radius, 1)) * 0.34)
      const height = Math.max(1, 1 + hill + rise)
      const cell = { x, z, height, distance }
      cells.push(cell)
      cellsByKey.set(gridKey(x, z), cell)

      const beach = edgeDistance > radius - 0.9
      const topType: VoxelType = beach ? 'sand' : sample(seed, x, z, 'top') > 0.78 ? 'grassLight' : 'grass'
      for (let y = 0; y < height; y += 1) {
        const type = y === height - 1 ? topType : beach && y === 0 ? 'sand' : y === 0 && height > 2 ? 'rock' : sample(seed, x, z, `soil-${y}`) > 0.8 ? 'soilLight' : 'soil'
        addVoxel(type, x, y + 0.5, z, lastCommit?.id ?? null)
      }
    }
  }

  const landCells = cells.filter((cell) => cell.distance > 1 && cell.distance < radius - 0.55)
    .sort((a, b) => sample(seed, a.x, a.z, 'landmark') - sample(seed, b.x, b.z, 'landmark'))
  const centerCell = cellsByKey.get(gridKey(0, 0)) ?? nearestCell(cells, 0, 0)
  const lighthouseCell = releases.length ? nearestCell(cells, Math.round(radius * 0.52), Math.round(-radius * 0.28)) : null
  const milestoneSites = spacedMilestoneSites(landCells, props.state.milestoneCount, seed, lighthouseCell, radius)

  // Map each commit to a stable point on the ground so event selection can focus it.
  if (landCells.length && isVisible('commit')) {
    commits.forEach((event, index) => {
      const cell = landCells[index % landCells.length]
      eventPositions.set(event.id, new THREE.Vector3(cell.x, cell.height + 0.08, cell.z))
    })
  }

  // Every hundredth commit unlocks a stone and brass landmark tied to that commit.
  for (let milestoneIndex = 0; milestoneIndex < props.state.milestoneCount; milestoneIndex += 1) {
    const site = milestoneSites[milestoneIndex % Math.max(1, milestoneSites.length)]
    if (!site) break
    const milestoneNumber = milestoneIndex + 1
    const stackedLevel = Math.floor(milestoneIndex / milestoneSites.length)
    const baseY = site.height + stackedLevel * 6
    const milestoneCommit = commits[milestoneNumber * 100 - 1]
    const eventId = milestoneCommit?.id ?? null

    for (const dx of [-0.5, 0.5]) {
      for (const dz of [-0.5, 0.5]) addVoxel('milestoneStone', site.x + dx, baseY + 0.5, site.z + dz, eventId)
    }

    if (milestoneIndex % 3 === 0) {
      for (const dx of [-1, 1]) {
        for (let level = 1; level <= 2; level += 1) addVoxel('milestoneStone', site.x + dx, baseY + level + 0.5, site.z, eventId)
      }
      for (const dx of [-1, 0, 1]) addVoxel(dx === 0 ? 'milestoneGold' : 'milestoneStone', site.x + dx, baseY + 3.5, site.z, eventId)
      addVoxel('milestoneCrystal', site.x, baseY + 4.5, site.z, eventId)
    } else if (milestoneIndex % 3 === 1) {
      addVoxel('milestoneStone', site.x, baseY + 1.5, site.z, eventId)
      addVoxel('milestoneGold', site.x, baseY + 2.5, site.z, eventId)
      addVoxel('milestoneStone', site.x, baseY + 3.5, site.z, eventId)
      addVoxel('milestoneGold', site.x, baseY + 4.5, site.z, eventId)
      addVoxel('milestoneCrystal', site.x, baseY + 5.5, site.z, eventId)
    } else {
      for (const dx of [-1, 1]) {
        for (const dz of [-1, 1]) addVoxel('milestoneStone', site.x + dx * 0.5, baseY + 1.5, site.z + dz * 0.5, eventId)
      }
      addVoxel('milestoneGold', site.x, baseY + 2.5, site.z, eventId)
      for (const dx of [-1, 1]) addVoxel('milestoneCrystal', site.x + dx * 0.5, baseY + 3.5, site.z, eventId)
    }

    if (milestoneCommit) eventPositions.set(milestoneCommit.id, new THREE.Vector3(site.x, baseY + 4, site.z))
  }

  // Contributors become individually spaced trees, with several canopy silhouettes.
  const contributorsByLogin = new Map<string, TimelineEvent>()
  for (const event of ofKind('contributor')) {
    if (event.kind === 'contributor' && event.login) contributorsByLogin.set(event.login.toLowerCase(), event)
  }
  for (const event of commits) {
    if (event.author && !contributorsByLogin.has(event.author.toLowerCase())) contributorsByLogin.set(event.author.toLowerCase(), event)
  }
  const contributors = isVisible('contributor') ? [...contributorsByLogin.values()] : []
  const treeCells: SurfaceCell[] = []
  const treeLimit = Math.min(24, contributors.length, 8 + props.state.milestoneCount * 2)
  const forestCells = landCells
    .filter((cell) => cell.distance > 1.25 && cell.distance < (props.state.milestoneCount ? radius * 0.58 : radius - 0.5))
    .slice()
    .sort((a, b) => sample(seed, a.x, a.z, 'forest') - sample(seed, b.x, b.z, 'forest'))
  for (const cell of forestCells) {
    if (treeCells.length >= treeLimit) break
    if (Math.hypot(cell.x - centerCell.x, cell.z - centerCell.z) < 1.7) continue
    if (lighthouseCell && Math.hypot(cell.x - lighthouseCell.x, cell.z - lighthouseCell.z) < 2.8) continue
    if (milestoneSites.some((site) => Math.hypot(cell.x - site.x, cell.z - site.z) < 2.2)) continue
    if (treeCells.some((other) => Math.hypot(cell.x - other.x, cell.z - other.z) < 3.1)) continue
    treeCells.push(cell)
  }
  treeCells.forEach((cell, index) => {
    const contributor = contributors[index]
    const contributorId = contributor?.id ?? null
    const variant = Math.floor(sample(seed, cell.x, cell.z, contributorId ?? `tree-${index}`) * 3)
    const treeHeight = 2 + Math.floor(sample(seed, cell.x, cell.z, 'trunk') * 3)
    for (let y = 0; y < treeHeight; y += 1) addVoxel('trunk', cell.x, cell.height + y + 0.5, cell.z, contributorId)
    const canopyRadii = variant === 1 ? [1, 1, 0] : variant === 2 ? [0, 1, 1] : [1, 1]
    canopyRadii.forEach((canopyRadius, dy) => {
      for (let dx = -canopyRadius; dx <= canopyRadius; dx += 1) {
        for (let dz = -canopyRadius; dz <= canopyRadius; dz += 1) {
          if (Math.abs(dx) === canopyRadius && Math.abs(dz) === canopyRadius && sample(seed, cell.x + dx, cell.z + dz, `leaf-${dy}`) > (variant === 1 ? 0.78 : 0.56)) continue
          const color = sample(seed, cell.x + dx, cell.z + dz, 'leaf-color') > 0.72 ? 'leafMoss' : sample(seed, cell.x + dx, cell.z + dz, 'leaf-light') > 0.65 ? 'leafLight' : 'leaf'
          addVoxel(color, cell.x + dx, cell.height + treeHeight + dy + 0.5, cell.z + dz, contributorId)
        }
      }
    })
    const y = cell.height + treeHeight + 1.4
    if (contributor) eventPositions.set(contributor.id, new THREE.Vector3(cell.x, y, cell.z))
  })

  // Branches carve wooden trails from the island center toward the coast.
  branches.slice(0, 8).forEach((event, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(branches.length, 1) - Math.PI / 2
    const steps = Math.max(1, Math.floor(radius - 0.65))
    for (let step = 1; step <= steps; step += 1) {
      const cell = nearestCell(cells, Math.round(Math.cos(angle) * step), Math.round(Math.sin(angle) * step))
      addVoxel('wood', cell.x, cell.height + 0.5, cell.z, event.id)
      eventPositions.set(event.id, new THREE.Vector3(cell.x, cell.height + 0.9, cell.z))
    }
  })

  // Pull requests extend those trails into short docks; merged work gets a capstone.
  pullRequests.slice(0, 8).forEach((event, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(Math.min(pullRequests.length, 8), 1)
    const dx = Math.round(Math.cos(angle))
    const dz = Math.round(Math.sin(angle))
    const shore = nearestCell(cells, dx * Math.max(1, Math.floor(radius - 0.4)), dz * Math.max(1, Math.floor(radius - 0.4)))
    for (let step = 0; step < 3; step += 1) {
      const x = shore.x + dx * step
      const z = shore.z + dz * step
      addVoxel('wood', x, 0.46, z, event.id)
      if (step === 0 && event.kind === 'pull_request' && event.mergedAt && Date.parse(event.mergedAt) <= Date.parse(props.state.date)) {
        addVoxel('woodLight', x, 0.96, z, event.id)
      }
      eventPositions.set(event.id, new THREE.Vector3(x, 1.05, z))
    }
  })

  // Releases raise the lighthouse beacon in alternating red and pale stone bands.
  if (releases.length && lighthouseCell) {
    const baseY = lighthouseCell.height
    const towerHeight = Math.min(12, 5 + releases.length * 2)
    for (let layer = 0; layer < towerHeight; layer += 1) {
      const blockType: VoxelType = Math.floor(layer / 2) % 2 === 0 ? 'lighthouseRed' : 'lighthouseWhite'
      const event = releases[Math.min(releases.length - 1, Math.floor(layer / towerHeight * releases.length))]
      for (const dx of [-0.5, 0.5]) {
        for (const dz of [-0.5, 0.5]) addVoxel(blockType, lighthouseCell.x + dx, baseY + layer + 0.5, lighthouseCell.z + dz, event?.id ?? null)
      }
      if (layer === towerHeight - 2) {
        addVoxel('glass', lighthouseCell.x, baseY + layer + 0.5, lighthouseCell.z - 0.5, releases.at(-1)?.id ?? null)
      }
    }
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dz = -1; dz <= 1; dz += 1) {
        addVoxel('lighthouseRed', lighthouseCell.x + dx, baseY + towerHeight + 0.5, lighthouseCell.z + dz, releases.at(-1)?.id ?? null)
      }
    }
    for (const event of releases) eventPositions.set(event.id, new THREE.Vector3(lighthouseCell.x, baseY + towerHeight + 0.2, lighthouseCell.z))
  }

  // Bugs become red beacons while open and small gold markers once resolved.
  const markerCells = landCells.filter((cell) =>
    treeCells.every((tree) => Math.hypot(cell.x - tree.x, cell.z - tree.z) > 1.05)
    && (!lighthouseCell || Math.hypot(cell.x - lighthouseCell.x, cell.z - lighthouseCell.z) > 1.3),
  )
  bugs.slice(-8).forEach((event, index) => {
    const cell = markerCells[(index * 5 + 2) % Math.max(markerCells.length, 1)] ?? centerCell
    const resolved = event.kind === 'bug' && event.closedAt && Date.parse(event.closedAt) <= Date.parse(props.state.date)
    if (resolved) {
      addVoxel('flower', cell.x, cell.height + 0.5, cell.z, event.id)
    } else {
      addVoxel('alert', cell.x, cell.height + 0.5, cell.z, event.id)
      addVoxel('lighthouseWhite', cell.x, cell.height + 1.5, cell.z, event.id)
    }
    eventPositions.set(event.id, new THREE.Vector3(cell.x, cell.height + (resolved ? 0.8 : 1.9), cell.z))
  })

  // Stable positions for commits that land before there is enough coast for landmarks.
  for (const event of activeEvents) {
    if (!isVisible(event.kind) || eventPositions.has(event.id)) continue
    if (event.kind === 'commit' && centerCell) eventPositions.set(event.id, new THREE.Vector3(centerCell.x, centerCell.height + 0.08, centerCell.z))
  }

  return { voxels, eventPositions, mapExtent }
}

function byDate(left: TimelineEvent, right: TimelineEvent) {
  return Date.parse(left.at) - Date.parse(right.at) || left.id.localeCompare(right.id)
}

export function worldKey(repoName: string, repoSizeKb: number, state: RepositoryWorldProps['state'], visibleKinds: Set<EventKind>) {
  const latestVisibleIds = EVENT_KINDS.map((kind) => state.selectedEvents.filter((event) => event.kind === kind).at(-1)?.id ?? '—')
  return [
    repoName,
    repoSizeKb,
    state.commitCount,
    state.knownCommitCount,
    state.branchCount,
    state.openPullRequests,
    state.resolvedPullRequests,
    state.openBugs,
    state.resolvedBugs,
    state.contributorCount,
    state.releaseCount,
    state.milestoneCount,
    state.commitsToNextMilestone,
    ...latestVisibleIds,
    ...EVENT_KINDS.map((kind) => visibleKinds.has(kind) ? '1' : '0'),
  ].join(':')
}
