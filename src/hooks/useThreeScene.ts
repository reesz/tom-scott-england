import { useEffect, useRef, useCallback } from 'react'
import {
  WebGLRenderer,
  Scene,
  OrthographicCamera,
  PlaneGeometry,
  ShaderMaterial,
  Mesh,
  TextureLoader,
  LinearFilter,
  ClampToEdgeWrapping,
  Clock,
  Vector2,
  Vector4,
  ShapeGeometry,
  EdgesGeometry,
  LineSegments,
  LineBasicMaterial,
  MeshStandardMaterial,
  MeshBasicMaterial,
  Group,
  Color,
  Sprite,
  SpriteMaterial,
  Raycaster,
  type Texture,
} from 'three'
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  BloomEffect,
  VignetteEffect,
} from 'postprocessing'
import terrainVertSrc from '#/shaders/terrain.vert.glsl'
import terrainFragSrc from '#/shaders/terrain.frag.glsl'
import waterVertSrc from '#/shaders/water.vert.glsl'
import waterFragSrc from '#/shaders/water.frag.glsl'
import {
  geoToWorld,
  worldBoundsToDemUV,
  DEM_WORLD_MIN,
  DEM_WORLD_MAX,
} from '#/lib/mercator'
import { geoCentroid } from 'd3-geo'
import { geoToShapes } from '#/lib/geoToShape'
import { createLabelSprite } from '#/lib/createLabelSprite'
import type { CountyFeatureCollection, IslandFeatureCollection } from '#/hooks/useGeoData'
import type { County } from '#/types/county'

// --- Constants ---
const MIN_HALF_H = 0.02
const MAX_HALF_H = 0.25
const INITIAL_CENTER = geoToWorld(-1.5, 53.0)
const INITIAL_HALF_H = 0.15
const DEM_SIZE = 2048
const WATER_QUAD_SIZE = 4.0

// DEM world-space extents
const DEM_CENTER_X = (DEM_WORLD_MIN[0] + DEM_WORLD_MAX[0]) / 2
const DEM_CENTER_Y = (DEM_WORLD_MIN[1] + DEM_WORLD_MAX[1]) / 2
const DEM_WIDTH = DEM_WORLD_MAX[0] - DEM_WORLD_MIN[0]
const DEM_HEIGHT = DEM_WORLD_MAX[1] - DEM_WORLD_MIN[1]

export interface UseThreeSceneOptions {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  geoData: CountyFeatureCollection | null
  islandsData: IslandFeatureCollection | null
  counties: County[]
  selectedId: string | null
  onSelectCounty: (id: string) => void
  onHoverCounty: (id: string | null) => void
}

interface FlyToTarget {
  centerX: number
  centerY: number
  halfH: number
  startCenterX: number
  startCenterY: number
  startHalfH: number
  startTime: number
  duration: number
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

export function useThreeScene(options: UseThreeSceneOptions) {
  const { canvasRef, geoData, islandsData, counties } = options

  const mouseRef = useRef(new Vector2(0.5, 0.5))
  const targetMouseRef = useRef(new Vector2(0.5, 0.5))
  const clockRef = useRef<Clock | null>(null)

  // Camera state stored in refs so callbacks can read/write without re-renders
  const centerRef = useRef<[number, number]>([INITIAL_CENTER[0], INITIAL_CENTER[1]])
  const halfHRef = useRef(INITIAL_HALF_H)
  const flyToRef = useRef<FlyToTarget | null>(null)
  const selectedIdRef = useRef<string | null>(null)

  useEffect(() => {
    selectedIdRef.current = options.selectedId
  }, [options.selectedId])

  // --- Public API callbacks ---
  const flyTo = useCallback(
    (lon: number, lat: number, targetHalfH?: number) => {
      const [wx, wy] = geoToWorld(lon, lat)
      const clock = clockRef.current
      if (!clock) return
      flyToRef.current = {
        centerX: wx,
        centerY: wy,
        halfH: clamp(targetHalfH ?? 0.05, MIN_HALF_H, MAX_HALF_H),
        startCenterX: centerRef.current[0],
        startCenterY: centerRef.current[1],
        startHalfH: halfHRef.current,
        startTime: clock.getElapsedTime(),
        duration: 1.0,
      }
    },
    [],
  )

  const zoomIn = useCallback(() => {
    halfHRef.current = clamp(halfHRef.current * 0.75, MIN_HALF_H, MAX_HALF_H)
  }, [])

  const zoomOut = useCallback(() => {
    halfHRef.current = clamp(halfHRef.current / 0.75, MIN_HALF_H, MAX_HALF_H)
  }, [])

  const resetView = useCallback(() => {
    flyTo(-1.5, 53.0, INITIAL_HALF_H)
  }, [flyTo])

  // --- Scene setup effect ---
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const isMobile = window.innerWidth < 768
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    const dpr = isMobile
      ? Math.min(window.devicePixelRatio, 1)
      : Math.min(window.devicePixelRatio, 2)

    // --- Renderer ---
    const renderer = new WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(dpr)
    renderer.setSize(canvas.clientWidth, canvas.clientHeight)

    // --- Scene & Camera ---
    const scene = new Scene()
    const aspect = canvas.clientWidth / canvas.clientHeight
    const halfH = halfHRef.current
    const cx = centerRef.current[0]
    const cy = centerRef.current[1]
    const camera = new OrthographicCamera(
      cx - halfH * aspect,
      cx + halfH * aspect,
      cy + halfH,
      cy - halfH,
      0,
      10,
    )
    camera.position.z = 5

    // --- Load Textures ---
    const loader = new TextureLoader()
    const loadTex = (url: string): Promise<Texture> =>
      new Promise((resolve, reject) => {
        loader.load(
          url,
          (tex) => {
            tex.minFilter = LinearFilter
            tex.magFilter = LinearFilter
            tex.wrapS = ClampToEdgeWrapping
            tex.wrapT = ClampToEdgeWrapping
            resolve(tex)
          },
          undefined,
          reject,
        )
      })

    // --- Water quad: oversized, follows camera ---
    const waterGeo = new PlaneGeometry(WATER_QUAD_SIZE, WATER_QUAD_SIZE)
    const waterMaterial = new ShaderMaterial({
      vertexShader: waterVertSrc,
      fragmentShader: waterFragSrc,
      uniforms: {
        u_mask: { value: null },
        u_time: { value: 0 },
        u_mouse: { value: new Vector2(0.5, 0.5) },
        u_resolution: {
          value: new Vector2(canvas.clientWidth, canvas.clientHeight),
        },
        u_demUV: { value: new Vector4(0, 0, 1, 1) },
      },
      transparent: true,
      depthWrite: false,
    })
    const waterMesh = new Mesh(waterGeo, waterMaterial)
    waterMesh.renderOrder = 0
    scene.add(waterMesh)

    // --- Terrain quad: sized exactly to DEM world bounds ---
    const terrainGeo = new PlaneGeometry(DEM_WIDTH, DEM_HEIGHT)
    const terrainMaterial = new ShaderMaterial({
      vertexShader: terrainVertSrc,
      fragmentShader: terrainFragSrc,
      uniforms: {
        u_dem: { value: null },
        u_mask: { value: null },
        u_mouse: { value: new Vector2(0.5, 0.5) },
        u_time: { value: 0 },
        u_resolution: {
          value: new Vector2(canvas.clientWidth, canvas.clientHeight),
        },
        u_demTexelSize: {
          value: new Vector2(1.0 / DEM_SIZE, 1.0 / DEM_SIZE),
        },
        u_demUV: { value: new Vector4(0, 0, 1, 1) }, // 1:1 mapping
      },
      transparent: true,
      depthWrite: false,
    })
    const terrainMesh = new Mesh(terrainGeo, terrainMaterial)
    terrainMesh.position.set(DEM_CENTER_X, DEM_CENTER_Y, 0.01)
    terrainMesh.renderOrder = 1
    scene.add(terrainMesh)

    // --- Background Landmasses ---
    const landmassGroup = new Group()
    landmassGroup.renderOrder = 2
    if (islandsData) {
      for (const feature of islandsData.features) {
        const shapes = geoToShapes(feature.geometry)
        for (const shape of shapes) {
          const geom = new ShapeGeometry(shape)
          const mat = new MeshBasicMaterial({
            color: new Color(180 / 255, 170 / 255, 155 / 255),
            transparent: true,
            opacity: 0.3,
            depthWrite: false,
          })
          const mesh = new Mesh(geom, mat)
          mesh.renderOrder = 2
          landmassGroup.add(mesh)
        }
      }
    }
    scene.add(landmassGroup)

    // --- County Fills ---
    const countyFillGroup = new Group()
    countyFillGroup.renderOrder = 3

    for (const feature of geoData.features) {
      const countyId = feature.properties.id
      const shapes = geoToShapes(feature.geometry)

      for (const shape of shapes) {
        const geom = new ShapeGeometry(shape)
        const mat = new MeshStandardMaterial({
          color: new Color(0, 0, 0),
          transparent: true,
          opacity: 0,
          depthWrite: false,
          emissive: new Color(0, 0, 0),
          emissiveIntensity: 0,
        })
        const mesh = new Mesh(geom, mat)
        mesh.renderOrder = 3
        mesh.userData = { countyId, countyName: feature.properties.name }
        countyFillGroup.add(mesh)
      }
    }
    scene.add(countyFillGroup)

    // --- County Borders ---
    const countyBorderGroup = new Group()
    countyBorderGroup.renderOrder = 4

    for (const feature of geoData.features) {
      const countyId = feature.properties.id
      const county = counties.find((c) => c.id === countyId)
      const isReleased = county?.status === 'released'
      const shapes = geoToShapes(feature.geometry)

      for (const shape of shapes) {
        const fillGeom = new ShapeGeometry(shape)
        const edges = new EdgesGeometry(fillGeom)
        const borderColor = isReleased
          ? new Color(180 / 255, 150 / 255, 60 / 255)
          : new Color(60 / 255, 50 / 255, 40 / 255)
        const lineMat = new LineBasicMaterial({
          color: borderColor,
          transparent: true,
          opacity: isReleased ? 0.6 : 0.4,
          depthWrite: false,
        })
        const lineSegments = new LineSegments(edges, lineMat)
        lineSegments.renderOrder = 4
        lineSegments.userData = { countyId }
        countyBorderGroup.add(lineSegments)
        fillGeom.dispose()
      }
    }
    scene.add(countyBorderGroup)

    // --- Labels ---
    const labelGroup = new Group()
    labelGroup.renderOrder = 5

    const countyWorldBounds = new Map<string, { width: number; height: number }>()

    for (const feature of geoData.features) {
      const countyId = feature.properties.id
      const name = feature.properties.name

      const [lon, lat] = geoCentroid(feature)
      const [wx, wy] = geoToWorld(lon, lat)

      const sprite = createLabelSprite(name)
      const labelScale = 0.012
      sprite.scale.set(labelScale * 4, labelScale, 1)
      sprite.position.set(wx, wy, 0.01)
      sprite.userData = { countyId }
      labelGroup.add(sprite)

      // Compute bounding box for visibility threshold
      const coords = feature.geometry.type === 'Polygon'
        ? feature.geometry.coordinates[0]
        : feature.geometry.coordinates[0][0]
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
      for (const [clon, clat] of coords) {
        const [cx, cy] = geoToWorld(clon, clat)
        minX = Math.min(minX, cx)
        maxX = Math.max(maxX, cx)
        minY = Math.min(minY, cy)
        maxY = Math.max(maxY, cy)
      }
      countyWorldBounds.set(countyId, { width: maxX - minX, height: maxY - minY })
    }
    scene.add(labelGroup)

    // --- Raycasting & Interaction ---
    const raycaster = new Raycaster()
    const pointer = new Vector2()
    let hoveredCountyId: string | null = null

    const HOVER_COLOR = new Color().setHSL(45 / 360, 0.4, 0.7)
    const HOVER_OPACITY = 0.12
    const HOVER_EMISSIVE = 0.3
    const SELECT_OPACITY = 0.18
    const SELECT_EMISSIVE = 0.5

    // Map of countyId+uuid -> target material properties for lerping
    const materialTargets = new Map<string, { opacity: number; emissiveIntensity: number }>()

    function updateCountyMaterials() {
      countyFillGroup.traverse((child) => {
        if (!(child instanceof Mesh)) return
        const id = child.userData.countyId
        const mat = child.material as MeshStandardMaterial
        let targetOpacity = 0
        let targetEmissive = 0

        if (id === selectedIdRef.current) {
          targetOpacity = SELECT_OPACITY
          targetEmissive = SELECT_EMISSIVE
          mat.color.copy(HOVER_COLOR)
          mat.emissive.copy(HOVER_COLOR)
        } else if (id === hoveredCountyId) {
          targetOpacity = HOVER_OPACITY
          targetEmissive = HOVER_EMISSIVE
          mat.color.copy(HOVER_COLOR)
          mat.emissive.copy(HOVER_COLOR)
        } else {
          mat.emissive.setScalar(0)
        }

        materialTargets.set(id + child.uuid, { opacity: targetOpacity, emissiveIntensity: targetEmissive })
      })
    }

    // --- Post-Processing ---
    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))

    if (!isMobile) {
      const bloom = new BloomEffect({
        luminanceThreshold: 0.85,
        luminanceSmoothing: 0.3,
        intensity: 0.15,
        radius: 0.4,
      })
      composer.addPass(new EffectPass(camera, bloom))
    }

    const vignette = new VignetteEffect({
      offset: 0.45,
      darkness: 0.35,
    })
    composer.addPass(new EffectPass(camera, vignette))

    // --- Load textures ---
    Promise.all([
      loadTex('/data/dem-heightmap.png'),
      loadTex('/data/land-mask.png'),
    ]).then(([demTex, maskTex]) => {
      terrainMaterial.uniforms.u_dem.value = demTex
      terrainMaterial.uniforms.u_mask.value = maskTex
      waterMaterial.uniforms.u_mask.value = maskTex
    })

    // --- Clock ---
    const clock = new Clock()
    clockRef.current = clock

    // --- Mouse tracking ---
    const handleMouse = (e: MouseEvent) => {
      targetMouseRef.current.set(
        e.clientX / window.innerWidth,
        e.clientY / window.innerHeight,
      )
    }
    if (!isMobile) {
      window.addEventListener('mousemove', handleMouse)
    }

    // --- Pan & Interaction state ---
    let isPanning = false
    let panStartX = 0
    let panStartY = 0
    let pointerDownX = 0
    let pointerDownY = 0
    let pointerMoved = false

    const handlePointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      isPanning = true
      pointerMoved = false
      panStartX = e.clientX
      panStartY = e.clientY
      pointerDownX = e.clientX
      pointerDownY = e.clientY
      canvas.setPointerCapture(e.pointerId)
    }

    const handlePointerMove = (e: PointerEvent) => {
      // Raycast for hover (always, even when not panning)
      const rect = canvas.getBoundingClientRect()
      pointer.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -(((e.clientY - rect.top) / rect.height) * 2 - 1),
      )
      raycaster.setFromCamera(pointer, camera)
      const hits = raycaster.intersectObjects(countyFillGroup.children, false)
      const newHoveredId = hits.length > 0 ? hits[0].object.userData.countyId : null

      if (newHoveredId !== hoveredCountyId) {
        hoveredCountyId = newHoveredId
        options.onHoverCounty(hoveredCountyId)
        updateCountyMaterials()
      }

      canvas.style.cursor = hoveredCountyId ? 'pointer' : (isPanning ? 'grabbing' : 'default')

      // Pan handling
      if (isPanning) {
        const dx = e.clientX - panStartX
        const dy = e.clientY - panStartY
        if (Math.abs(e.clientX - pointerDownX) > 3 || Math.abs(e.clientY - pointerDownY) > 3) {
          pointerMoved = true
        }
        panStartX = e.clientX
        panStartY = e.clientY

        const currentHalfH = halfHRef.current
        const currentAspect = canvas.clientWidth / canvas.clientHeight
        const worldPerPixelX = (currentHalfH * 2 * currentAspect) / canvas.clientWidth
        const worldPerPixelY = (currentHalfH * 2) / canvas.clientHeight

        centerRef.current[0] -= dx * worldPerPixelX
        centerRef.current[1] += dy * worldPerPixelY

        flyToRef.current = null
      }
    }

    const handlePointerUp = (e: PointerEvent) => {
      isPanning = false
      canvas.releasePointerCapture(e.pointerId)
      canvas.style.cursor = hoveredCountyId ? 'pointer' : 'default'

      // Click detection: pointer didn't move significantly
      if (!pointerMoved && hoveredCountyId) {
        selectedIdRef.current = hoveredCountyId
        options.onSelectCounty(hoveredCountyId)
        updateCountyMaterials()

        // Fly to the selected county
        const feature = geoData!.features.find((f) => f.properties.id === hoveredCountyId)
        if (feature) {
          const [lon, lat] = geoCentroid(feature)
          const elapsed = clockRef.current?.getElapsedTime() ?? 0
          flyToRef.current = {
            centerX: geoToWorld(lon, lat)[0],
            centerY: geoToWorld(lon, lat)[1],
            halfH: clamp(0.04, MIN_HALF_H, MAX_HALF_H),
            startCenterX: centerRef.current[0],
            startCenterY: centerRef.current[1],
            startHalfH: halfHRef.current,
            startTime: elapsed,
            duration: 0.8,
          }
        }
      }
    }

    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerup', handlePointerUp)
    canvas.addEventListener('pointercancel', handlePointerUp)

    // --- Zoom: wheel ---
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const zoomFactor = e.deltaY > 0 ? 1.1 : 1 / 1.1
      const oldHalfH = halfHRef.current
      const newHalfH = clamp(oldHalfH * zoomFactor, MIN_HALF_H, MAX_HALF_H)

      // Zoom toward pointer
      const rect = canvas.getBoundingClientRect()
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const ndcY = -(((e.clientY - rect.top) / rect.height) * 2 - 1)
      const currentAspect = canvas.clientWidth / canvas.clientHeight

      const worldX = centerRef.current[0] + ndcX * oldHalfH * currentAspect
      const worldY = centerRef.current[1] + ndcY * oldHalfH

      centerRef.current[0] = worldX - ndcX * newHalfH * currentAspect
      centerRef.current[1] = worldY - ndcY * newHalfH

      halfHRef.current = newHalfH

      // Cancel any ongoing fly-to
      flyToRef.current = null
    }

    canvas.addEventListener('wheel', handleWheel, { passive: false })

    // --- Touch: pinch zoom ---
    let lastPinchDist = 0

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[1].clientX - e.touches[0].clientX
        const dy = e.touches[1].clientY - e.touches[0].clientY
        lastPinchDist = Math.sqrt(dx * dx + dy * dy)
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault()
        const dx = e.touches[1].clientX - e.touches[0].clientX
        const dy = e.touches[1].clientY - e.touches[0].clientY
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (lastPinchDist > 0) {
          const scale = lastPinchDist / dist
          halfHRef.current = clamp(
            halfHRef.current * scale,
            MIN_HALF_H,
            MAX_HALF_H,
          )
          flyToRef.current = null
        }
        lastPinchDist = dist
      }
    }

    const handleTouchEnd = () => {
      lastPinchDist = 0
    }

    canvas.addEventListener('touchstart', handleTouchStart, { passive: true })
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false })
    canvas.addEventListener('touchend', handleTouchEnd, { passive: true })

    // --- Resize handler ---
    const handleResize = () => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      renderer.setSize(w, h)
      composer.setSize(w, h)
      const res = new Vector2(w, h)
      terrainMaterial.uniforms.u_resolution.value = res
      waterMaterial.uniforms.u_resolution.value = res
    }
    window.addEventListener('resize', handleResize)

    // --- Render loop ---
    let animFrameId = 0

    const render = () => {
      const elapsed = prefersReducedMotion ? 0 : clock.getElapsedTime()

      // --- Fly-to animation ---
      const ft = flyToRef.current
      if (ft) {
        const t = clamp((elapsed - ft.startTime) / ft.duration, 0, 1)
        const eased = easeInOutCubic(t)
        centerRef.current[0] = ft.startCenterX + (ft.centerX - ft.startCenterX) * eased
        centerRef.current[1] = ft.startCenterY + (ft.centerY - ft.startCenterY) * eased
        halfHRef.current = ft.startHalfH + (ft.halfH - ft.startHalfH) * eased
        if (t >= 1) flyToRef.current = null
      }

      // --- Update camera frustum ---
      const currentAspect = canvas.clientWidth / canvas.clientHeight
      const hh = halfHRef.current
      const ccx = centerRef.current[0]
      const ccy = centerRef.current[1]
      camera.left = ccx - hh * currentAspect
      camera.right = ccx + hh * currentAspect
      camera.top = ccy + hh
      camera.bottom = ccy - hh
      camera.updateProjectionMatrix()

      // --- Reposition water quad to follow camera center ---
      waterMesh.position.set(ccx, ccy, 0)

      // Compute water quad DEM UV: its world bounds mapped to DEM UV
      const waterHalfSize = WATER_QUAD_SIZE / 2
      const [wuMin, wvMin, wuMax, wvMax] = worldBoundsToDemUV(
        ccx - waterHalfSize,
        ccy - waterHalfSize,
        ccx + waterHalfSize,
        ccy + waterHalfSize,
      )
      waterMaterial.uniforms.u_demUV.value.set(wuMin, wvMin, wuMax, wvMax)

      // --- Mouse lerp ---
      if (!prefersReducedMotion && !isMobile) {
        mouseRef.current.lerp(targetMouseRef.current, 0.05)
      }
      const mouse = mouseRef.current

      // --- Update uniforms ---
      terrainMaterial.uniforms.u_time.value = elapsed
      terrainMaterial.uniforms.u_mouse.value.set(mouse.x, mouse.y)
      waterMaterial.uniforms.u_time.value = elapsed
      waterMaterial.uniforms.u_mouse.value.set(mouse.x, mouse.y)

      // --- Update label visibility based on zoom ---
      const frustumWidth = camera.right - camera.left
      const MIN_SCREEN_FRACTION = 0.06

      for (const child of labelGroup.children) {
        const cId = child.userData.countyId
        const bounds = countyWorldBounds.get(cId)
        if (!bounds) continue

        const screenFraction = bounds.width / frustumWidth
        const targetOpacity = screenFraction > MIN_SCREEN_FRACTION ? 1 : 0
        const mat = (child as Sprite).material as SpriteMaterial
        mat.opacity += (targetOpacity - mat.opacity) * 0.1
        mat.visible = mat.opacity > 0.01
      }

      // --- Lerp county fill materials toward targets ---
      countyFillGroup.traverse((child) => {
        if (!(child instanceof Mesh)) return
        const key = child.userData.countyId + child.uuid
        const target = materialTargets.get(key)
        if (!target) return
        const mat = child.material as MeshStandardMaterial
        mat.opacity += (target.opacity - mat.opacity) * 0.15
        mat.emissiveIntensity += (target.emissiveIntensity - mat.emissiveIntensity) * 0.15
      })

      composer.render()
      animFrameId = requestAnimationFrame(render)
    }

    render()

    // --- Cleanup ---
    return () => {
      cancelAnimationFrame(animFrameId)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouse)
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerup', handlePointerUp)
      canvas.removeEventListener('pointercancel', handlePointerUp)
      canvas.removeEventListener('wheel', handleWheel)
      canvas.removeEventListener('touchstart', handleTouchStart)
      canvas.removeEventListener('touchmove', handleTouchMove)
      canvas.removeEventListener('touchend', handleTouchEnd)
      countyFillGroup.traverse((child) => {
        if (child instanceof Mesh) {
          child.geometry.dispose()
          ;(child.material as MeshStandardMaterial).dispose()
        }
      })
      countyBorderGroup.traverse((child) => {
        if (child instanceof LineSegments) {
          child.geometry.dispose()
          ;(child.material as LineBasicMaterial).dispose()
        }
      })
      landmassGroup.traverse((child) => {
        if (child instanceof Mesh) {
          child.geometry.dispose()
          ;(child.material as MeshBasicMaterial).dispose()
        }
      })
      labelGroup.traverse((child) => {
        if (child instanceof Sprite) {
          ;(child.material as SpriteMaterial).map?.dispose()
          ;(child.material as SpriteMaterial).dispose()
        }
      })
      clockRef.current = null
      renderer.dispose()
      composer.dispose()
      waterGeo.dispose()
      terrainGeo.dispose()
      terrainMaterial.dispose()
      waterMaterial.dispose()
    }
  }, [canvasRef, geoData, islandsData, counties])

  return { zoomIn, zoomOut, resetView, flyTo }
}
