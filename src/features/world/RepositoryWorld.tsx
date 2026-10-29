import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { gsap } from 'gsap'
import type { RepositoryWorldProps } from './types'
import { buildWorldScene, VOXEL_TYPES, worldKey } from './worldScene'
import type { VoxelType } from './worldScene'

const VOXEL_COLORS: Record<VoxelType, number> = {
  soil: 0x55433c,
  soilLight: 0x73584a,
  grass: 0x31563a,
  grassLight: 0x4d7540,
  sand: 0xc69469,
  rock: 0x626c7e,
  trunk: 0x49352f,
  wood: 0x71503f,
  woodLight: 0x9a6a48,
  leaf: 0x294d32,
  leafLight: 0x4e7942,
  leafMoss: 0x829f48,
  lighthouseRed: 0xb9232d,
  lighthouseWhite: 0xe4e9e9,
  glass: 0x83c4d8,
  alert: 0xf06149,
  flower: 0xdcb866,
  milestoneStone: 0x787b70,
  milestoneGold: 0xdab35f,
  milestoneCrystal: 0x72c7b3,
}

function createMaterials() {
  return Object.fromEntries(VOXEL_TYPES.map((type) => [type, new THREE.MeshStandardMaterial({
    color: VOXEL_COLORS[type],
    roughness: type === 'milestoneGold' ? 0.48 : type === 'milestoneCrystal' || type === 'glass' ? 0.34 : 0.94,
    metalness: type === 'milestoneGold' ? 0.24 : type === 'milestoneCrystal' ? 0.1 : type === 'glass' ? 0.08 : 0,
    flatShading: true,
  })])) as Record<VoxelType, THREE.MeshStandardMaterial>
}

export default function RepositoryWorld(props: RepositoryWorldProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const sunRef = useRef<THREE.DirectionalLight | null>(null)
  const bottomRef = useRef<THREE.Mesh | null>(null)
  const waterRef = useRef<THREE.Mesh | null>(null)
  const mapExtentRef = useRef(8.7)
  const resizeRef = useRef<(() => void) | null>(null)
  const worldGroupRef = useRef<THREE.Group | null>(null)
  const materialsRef = useRef<Record<VoxelType, THREE.MeshStandardMaterial> | null>(null)
  const geometryRef = useRef<THREE.BoxGeometry | null>(null)
  const highlightRef = useRef<THREE.LineSegments | null>(null)
  const eventPositionsRef = useRef<Map<string, THREE.Vector3>>(new Map())
  const propsRef = useRef(props)
  const [renderError, setRenderError] = useState(false)
  propsRef.current = props

  const currentWorldKey = worldKey(props.repoName, props.repoSizeKb, props.state, props.visibleKinds)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let renderer: THREE.WebGLRenderer | null = null
    let controls: OrbitControls | null = null
    let materials: Record<VoxelType, THREE.MeshStandardMaterial> | null = null
    let blockGeometry: THREE.BoxGeometry | null = null
    let outlineGeometry: THREE.EdgesGeometry | null = null
    let outlineMaterial: THREE.LineBasicMaterial | null = null
    let resizeObserver: ResizeObserver | null = null
    let pointerOrigin: { x: number; y: number } | null = null
    let frameClock = 0
    const staticGeometries: THREE.BufferGeometry[] = []
    const staticMaterials: THREE.Material[] = []
    let onKeyDown: ((event: KeyboardEvent) => void) | null = null
    let onPointerDown: ((event: PointerEvent) => void) | null = null
    let onPointerUp: ((event: PointerEvent) => void) | null = null

    try {
      const scene = new THREE.Scene()
      scene.background = new THREE.Color(0x0c101a)
      sceneRef.current = scene

      const camera = new THREE.OrthographicCamera(-8, 8, 8, -8, 0.1, 100)
      camera.position.set(12, 12, 14)
      camera.lookAt(0, 1.2, 0)
      cameraRef.current = camera

      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.18
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      renderer.domElement.setAttribute('role', 'img')
      renderer.domElement.setAttribute('tabindex', '0')
      renderer.domElement.setAttribute('aria-label', `Interactive voxel island for ${propsRef.current.repoName}. Use arrow keys to rotate and plus or minus to zoom.`)
      renderer.domElement.className = 'world-canvas-surface'
      host.appendChild(renderer.domElement)
      rendererRef.current = renderer

      const hemiLight = new THREE.HemisphereLight(0xcfe6ee, 0x3a343b, 2.05)
      scene.add(hemiLight)
      const sun = new THREE.DirectionalLight(0xffd6aa, 3.1)
      sun.position.set(-8, 15, 8)
      sun.castShadow = true
      sun.shadow.mapSize.set(1024, 1024)
      sun.shadow.camera.left = -mapExtentRef.current * 1.25
      sun.shadow.camera.right = mapExtentRef.current * 1.25
      sun.shadow.camera.top = mapExtentRef.current * 1.25
      sun.shadow.camera.bottom = -mapExtentRef.current * 1.25
      sun.shadow.bias = -0.00035
      scene.add(sun)
      sunRef.current = sun

      const bottomGeometry = new THREE.BoxGeometry(1, 0.48, 1)
      staticGeometries.push(bottomGeometry)
      const bottomMaterial = new THREE.MeshStandardMaterial({ color: 0x132638, roughness: 0.76, flatShading: true })
      staticMaterials.push(bottomMaterial)
      const bottom = new THREE.Mesh(bottomGeometry, bottomMaterial)
      bottom.scale.set(23.8, 1, 23.8)
      bottom.position.y = -0.77
      bottom.castShadow = true
      bottom.receiveShadow = true
      scene.add(bottom)
      bottomRef.current = bottom

      const waterGeometry = new THREE.BoxGeometry(1, 0.58, 1)
      staticGeometries.push(waterGeometry)
      const waterMaterial = new THREE.MeshStandardMaterial({ color: 0x12617f, roughness: 0.52, metalness: 0.08, flatShading: true })
      staticMaterials.push(waterMaterial)
      const water = new THREE.Mesh(waterGeometry, waterMaterial)
      water.scale.set(23, 1, 23)
      water.position.y = -0.24
      water.receiveShadow = true
      scene.add(water)
      waterRef.current = water

      materials = createMaterials()
      materialsRef.current = materials
      blockGeometry = new THREE.BoxGeometry(0.96, 0.96, 0.96)
      geometryRef.current = blockGeometry

      const outlineBoxGeometry = new THREE.BoxGeometry(1.12, 1.12, 1.12)
      staticGeometries.push(outlineBoxGeometry)
      outlineGeometry = new THREE.EdgesGeometry(outlineBoxGeometry)
      outlineMaterial = new THREE.LineBasicMaterial({ color: 0xf0cf75, transparent: true, opacity: 0.95, depthTest: false })
      const highlight = new THREE.LineSegments(outlineGeometry, outlineMaterial)
      highlight.visible = false
      highlight.renderOrder = 5
      scene.add(highlight)
      highlightRef.current = highlight

      controls = new OrbitControls(camera, renderer.domElement)
      controls.target.set(0, 1.25, 0)
      controls.enableDamping = true
      controls.dampingFactor = 0.075
      controls.enablePan = false
      controls.enableRotate = true
      controls.enableZoom = true
      controls.minPolarAngle = 0.38
      controls.maxPolarAngle = 1.48
      controls.minZoom = 0.72
      controls.maxZoom = 2.35
      controls.rotateSpeed = 0.62
      controls.zoomSpeed = 0.72
      controlsRef.current = controls

      const resize = () => {
        if (!renderer || !camera) return
        const { width, height } = host.getBoundingClientRect()
        if (!width || !height) return
        const aspect = width / height
        const baselineHeight = 25.5 / Math.max(0.55, Math.min(aspect, 1))
        const horizontalHeight = (2 * (mapExtentRef.current + 2.1)) / Math.max(0.55, aspect)
        const verticalHeight = mapExtentRef.current * 1.1 + 14
        const viewHeight = Math.max(baselineHeight, horizontalHeight, verticalHeight)
        camera.left = -(viewHeight * aspect) / 2
        camera.right = (viewHeight * aspect) / 2
        camera.top = viewHeight / 2
        camera.bottom = -viewHeight / 2
        camera.updateProjectionMatrix()
        renderer.setSize(width, height, false)
        controls?.update()
      }
      resizeRef.current = resize
      resizeObserver = new ResizeObserver(resize)
      resizeObserver.observe(host)
      resize()

      const moveCamera = (key: string) => {
        if (!controls || !camera) return false
        if (key === '+' || key === '=' || key === 'Add') camera.zoom = Math.min(controls.maxZoom, camera.zoom + 0.12)
        else if (key === '-' || key === '_' || key === 'Subtract') camera.zoom = Math.max(controls.minZoom, camera.zoom - 0.12)
        else if (key.startsWith('Arrow')) {
          const offset = camera.position.clone().sub(controls.target)
          const spherical = new THREE.Spherical().setFromVector3(offset)
          if (key === 'ArrowLeft') spherical.theta += 0.16
          if (key === 'ArrowRight') spherical.theta -= 0.16
          if (key === 'ArrowUp') spherical.phi = Math.max(0.38, spherical.phi - 0.1)
          if (key === 'ArrowDown') spherical.phi = Math.min(1.48, spherical.phi + 0.1)
          camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical))
          camera.lookAt(controls.target)
        } else if (key === 'Home') {
          camera.zoom = 1
          camera.position.set(12, 12, 14)
          controls.target.set(0, 1.25, 0)
          camera.lookAt(controls.target)
        } else return false
        camera.updateProjectionMatrix()
        controls.update()
        return true
      }

      onKeyDown = (event: KeyboardEvent) => {
        if (moveCamera(event.key)) event.preventDefault()
      }
      onPointerDown = (event: PointerEvent) => { pointerOrigin = { x: event.clientX, y: event.clientY } }
      onPointerUp = (event: PointerEvent) => {
        if (!renderer || !pointerOrigin || Math.hypot(event.clientX - pointerOrigin.x, event.clientY - pointerOrigin.y) > 5) {
          pointerOrigin = null
          return
        }
        pointerOrigin = null
        const bounds = renderer.domElement.getBoundingClientRect()
        const pointer = new THREE.Vector2(
          ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
          -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
        )
        const raycaster = new THREE.Raycaster()
        raycaster.setFromCamera(pointer, camera)
        const world = worldGroupRef.current
        if (!world) return
        const hits = raycaster.intersectObjects(world.children, false)
        for (const hit of hits) {
          if (hit.instanceId === undefined) continue
          const eventId = (hit.object.userData.eventIds as Array<string | null> | undefined)?.[hit.instanceId]
          if (eventId) {
            propsRef.current.onSelectEvent(eventId)
            return
          }
        }
      }
      renderer.domElement.addEventListener('keydown', onKeyDown)
      renderer.domElement.addEventListener('pointerdown', onPointerDown)
      renderer.domElement.addEventListener('pointerup', onPointerUp)

      renderer.setAnimationLoop((time) => {
        if (time - frameClock < 1000 / 30) return
        frameClock = time
        controls?.update()
        if (sceneRef.current && cameraRef.current) renderer?.render(sceneRef.current, cameraRef.current)
      })

    } catch {
      setRenderError(true)
    }

    return () => {
      resizeObserver?.disconnect()
      resizeRef.current = null
      controls?.dispose()
      renderer?.setAnimationLoop(null)
      if (renderer && onKeyDown) renderer.domElement.removeEventListener('keydown', onKeyDown)
      if (renderer && onPointerDown) renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      if (renderer && onPointerUp) renderer.domElement.removeEventListener('pointerup', onPointerUp)
      if (worldGroupRef.current) {
        gsap.killTweensOf(worldGroupRef.current.scale)
        sceneRef.current?.remove(worldGroupRef.current)
      }
      renderer?.dispose()
      renderer?.domElement.remove()
      if (geometryRef.current) geometryRef.current.dispose()
      materialsRef.current && Object.values(materialsRef.current).forEach((material) => material.dispose())
      outlineGeometry?.dispose()
      outlineMaterial?.dispose()
      staticGeometries.forEach((geometry) => geometry.dispose())
      staticMaterials.forEach((material) => material.dispose())
      sceneRef.current = null
      rendererRef.current = null
      cameraRef.current = null
      controlsRef.current = null
      sunRef.current = null
      bottomRef.current = null
      waterRef.current = null
      worldGroupRef.current = null
      materialsRef.current = null
      geometryRef.current = null
      highlightRef.current = null
    }
  }, [])

  useEffect(() => {
    const scene = sceneRef.current
    const renderer = rendererRef.current
    const geometry = geometryRef.current
    const materials = materialsRef.current
    if (!scene || !renderer || !geometry || !materials) return

    const generated = buildWorldScene(propsRef.current.repoName, propsRef.current)
    mapExtentRef.current = generated.mapExtent
    const waterSize = generated.mapExtent * 2 + 8
    if (waterRef.current) waterRef.current.scale.set(waterSize, 1, waterSize)
    if (bottomRef.current) bottomRef.current.scale.set(waterSize + 0.8, 1, waterSize + 0.8)
    if (sunRef.current) {
      const shadowExtent = generated.mapExtent + 3
      sunRef.current.shadow.camera.left = -shadowExtent
      sunRef.current.shadow.camera.right = shadowExtent
      sunRef.current.shadow.camera.top = shadowExtent
      sunRef.current.shadow.camera.bottom = -shadowExtent
      sunRef.current.shadow.camera.updateProjectionMatrix()
    }
    resizeRef.current?.()
    const showTerrain = propsRef.current.visibleKinds.has('commit')
    for (const type of ['soil', 'soilLight', 'grass', 'grassLight', 'sand', 'rock', 'milestoneStone', 'milestoneGold', 'milestoneCrystal'] as const) {
      materials[type].color.setHex(showTerrain ? VOXEL_COLORS[type] : 0x555d5b)
    }
    const world = new THREE.Group()
    world.name = 'repository-archipelago'
    const dummy = new THREE.Object3D()

    for (const type of VOXEL_TYPES) {
      const placements = generated.voxels[type]
      if (!placements.length) continue
      const instances = new THREE.InstancedMesh(geometry, materials[type], placements.length)
      instances.name = type
      instances.castShadow = true
      instances.receiveShadow = true
      instances.userData.eventIds = placements.map((placement) => placement.eventId)
      placements.forEach((placement, index) => {
        dummy.position.set(placement.x, placement.y, placement.z)
        dummy.updateMatrix()
        instances.setMatrixAt(index, dummy.matrix)
      })
      instances.instanceMatrix.needsUpdate = true
      instances.computeBoundingSphere()
      world.add(instances)
    }

    const previousWorld = worldGroupRef.current
    if (previousWorld) {
      gsap.killTweensOf(previousWorld.scale)
      scene.remove(previousWorld)
    }
    scene.add(world)
    worldGroupRef.current = world
    eventPositionsRef.current = generated.eventPositions

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      world.scale.set(0.97, 0.83, 0.97)
      gsap.to(world.scale, { x: 1, y: 1, z: 1, duration: 0.42, ease: 'power2.out' })
    }
    updateHighlight(propsRef.current.selectedEventId)
    renderer.render(scene, cameraRef.current!)
  }, [currentWorldKey])

  useEffect(() => { updateHighlight(props.selectedEventId) }, [props.selectedEventId, currentWorldKey])

  function updateHighlight(eventId: string | null) {
    const highlight = highlightRef.current
    if (!highlight) return
    const position = eventId ? eventPositionsRef.current.get(eventId) : undefined
    if (!position) {
      highlight.visible = false
      return
    }
    highlight.position.copy(position)
    highlight.visible = true
  }

  return <div className="world-canvas" ref={hostRef}>
    {renderError && <p className="world-error" role="alert">This browser could not render the 3D island. You can still browse the repository history in the log.</p>}
    <span className="world-interaction-hint" aria-hidden="true">Drag to orbit · pinch or scroll to zoom</span>
  </div>
}
