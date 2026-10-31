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
  MeshBasicMaterial,
  Group,
  Color,
  Sprite,
  SpriteMaterial,
  Raycaster,
  type Texture,
  CanvasTexture,
  SRGBColorSpace,
  CustomBlending,
  MultiplyBlending,
  ZeroFactor,
  DstColorFactor,
  AddEquation,
  OneFactor,
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
import { createLabelSprite, updateLabelTexture } from '#/lib/createLabelSprite'
import type {
  CountyFeatureCollection,
  IslandFeatureCollection,
} from '#/hooks/useGeoData'
import type { JourneyStop } from '#/types/journey'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import type { County } from '#/types/county'

// --- Constants ---
const MIN_HALF_H = 0.02
const MAX_HALF_H = 0.25
const INITIAL_CENTER = geoToWorld(-1.5, 53.0)
const INITIAL_HALF_H = 0.15
const DEM_SIZE = 2048
const WATER_QUAD_SIZE = 4.0

// Pan clamp: UK must remain partially visible (~2 degrees padding beyond UK bounds)
const PAN_CLAMP_MIN = geoToWorld(-13, 47) // SW corner with padding
const PAN_CLAMP_MAX = geoToWorld(4, 63) // NE corner with padding

// DEM world-space extents
const DEM_CENTER_X = (DEM_WORLD_MIN[0] + DEM_WORLD_MAX[0]) / 2
const DEM_CENTER_Y = (DEM_WORLD_MIN[1] + DEM_WORLD_MAX[1]) / 2
const DEM_WIDTH = DEM_WORLD_MAX[0] - DEM_WORLD_MIN[0]
const DEM_HEIGHT = DEM_WORLD_MAX[1] - DEM_WORLD_MIN[1]

// Journey route colours (from the parchment/ink palette in styles.css)
const ROUTE_INK_COLOR = 0x8f2414 // oxblood, between --red-action and --ink
const ROUTE_GHOST_COLOR = 0xb39a78 // light ink; multiplied, so stays faint
const ROUTE_RAIL_COLOR = 0x3d2e1a // --ink
const ROUTE_PAPER_COLOR = 0xf5e6c8 // --parchment
const ROUTE_LEG_SUBDIVISIONS = 32
const JOURNEY_HALF_H = 0.045

// Detail panel widths (see DetailPanel: w-[430px] lg:w-[490px])
function detailPanelPx(): number {
  if (typeof window === 'undefined' || window.innerWidth < 768) return 0
  return window.innerWidth >= 1024 ? 490 : 430
}

export interface UseThreeSceneOptions {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  geoData: CountyFeatureCollection | null
  islandsData: IslandFeatureCollection | null
  counties: County[]
  selectedId: string | null
  panelOpen: boolean
  onSelectCounty: (id: string) => void
  onHoverCounty: (id: string | null) => void
  onCloseDetail: () => void
  journeyStops: JourneyStop[]
  journeyStep: number | null
}

interface JourneyAnim {
  from: number
  to: number
  startTime: number
  duration: number
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
  /** Zoom out to this half-height mid-flight (for long hops) */
  peakHalfH?: number
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

function clampCenter(center: [number, number]): void {
  center[0] = clamp(center[0], PAN_CLAMP_MIN[0], PAN_CLAMP_MAX[0])
  center[1] = clamp(center[1], PAN_CLAMP_MIN[1], PAN_CLAMP_MAX[1])
}

export function useThreeScene(options: UseThreeSceneOptions) {
  const { canvasRef, geoData, islandsData, counties, journeyStops } = options

  const mouseRef = useRef(new Vector2(0.5, 0.5))
  const targetMouseRef = useRef(new Vector2(0.5, 0.5))
  const clockRef = useRef<Clock | null>(null)

  // Camera state stored in refs so callbacks can read/write without re-renders
  const centerRef = useRef<[number, number]>([
    INITIAL_CENTER[0],
    INITIAL_CENTER[1],
  ])
  const halfHRef = useRef(INITIAL_HALF_H)
  const flyToRef = useRef<FlyToTarget | null>(null)
  const selectedIdRef = useRef<string | null>(null)
  const panelOpenRef = useRef(false)
  const journeyStepRef = useRef<number | null>(null)
  const journeyAnimRef = useRef<JourneyAnim | null>(null)

  const updateMaterialsRef = useRef<(() => void) | null>(null)

  // Keep callbacks in refs so the Three.js closure always calls the latest version
  const onSelectCountyRef = useRef(options.onSelectCounty)
  onSelectCountyRef.current = options.onSelectCounty
  const onHoverCountyRef = useRef(options.onHoverCounty)
  onHoverCountyRef.current = options.onHoverCounty
  const onCloseDetailRef = useRef(options.onCloseDetail)
  onCloseDetailRef.current = options.onCloseDetail

  useEffect(() => {
    panelOpenRef.current = options.panelOpen
  }, [options.panelOpen])

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

  // Listen for header-triggered reset
  useEffect(() => {
    const handler = () => resetView()
    window.addEventListener('map:reset-view', handler)
    return () => window.removeEventListener('map:reset-view', handler)
  }, [resetView])

  useEffect(() => {
    const prev = selectedIdRef.current
    selectedIdRef.current = options.selectedId

    // When deselected, fly back to initial view
    if (prev && !options.selectedId) {
      flyTo(-1.5, 53.0, INITIAL_HALF_H)
    }

    // Trigger material update so highlight clears immediately
    updateMaterialsRef.current?.()
  }, [options.selectedId, flyTo])

  // Journey: fly along the route to the current stop
  useEffect(() => {
    const prev = journeyStepRef.current
    const step = options.journeyStep
    journeyStepRef.current = step
    journeyAnimRef.current = null
    const stop = step !== null ? options.journeyStops[step] : undefined
    const clock = clockRef.current
    const canvas = canvasRef.current
    if (!stop || !clock || !canvas) return

    const [wx, wy] = geoToWorld(stop.coords.lng, stop.coords.lat)
    // Keep the stop centred in the map area left of the detail panel, or above
    // the half-height bottom sheet (between it and the stepper) when open on mobile
    const pxToWorld = (JOURNEY_HALF_H * 2) / canvas.clientHeight
    const centerX = wx + (detailPanelPx() / 2) * pxToWorld
    const sheetOpen = window.innerWidth < 768 && panelOpenRef.current
    const centerY = wy - (sheetOpen ? canvas.clientHeight * 0.12 * pxToWorld : 0)

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      centerRef.current = [centerX, centerY]
      halfHRef.current = JOURNEY_HALF_H
      return
    }

    const dist = Math.hypot(centerX - centerRef.current[0], centerY - centerRef.current[1])
    const duration = clamp(0.8 + dist * 4, 0.8, 2.2)
    const now = clock.getElapsedTime()
    flyToRef.current = {
      centerX,
      centerY,
      halfH: JOURNEY_HALF_H,
      startCenterX: centerRef.current[0],
      startCenterY: centerRef.current[1],
      startHalfH: halfHRef.current,
      startTime: now,
      duration,
      peakHalfH: clamp(dist * 0.6, JOURNEY_HALF_H, MAX_HALF_H),
    }
    // Draw the leg as the camera travels it (forward steps only)
    if (prev !== null && step === prev + 1) {
      journeyAnimRef.current = { from: prev, to: step, startTime: now, duration }
    }
  }, [options.journeyStep, options.journeyStops, canvasRef])

  // --- Scene setup effect ---
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !geoData) return

    const isMobile = window.innerWidth < 768
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    const dpr = Math.min(window.devicePixelRatio, 2)

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

    // --- Generate county mask texture for fog-of-war ---
    const MASK_RES = 1024
    const maskCanvas = document.createElement('canvas')
    maskCanvas.width = MASK_RES
    maskCanvas.height = MASK_RES
    const maskCtx = maskCanvas.getContext('2d')!
    maskCtx.fillStyle = '#000'
    maskCtx.fillRect(0, 0, MASK_RES, MASK_RES)
    maskCtx.fillStyle = '#fff'

    for (const feature of geoData.features) {
      const coords =
        feature.geometry.type === 'Polygon'
          ? [feature.geometry.coordinates]
          : feature.geometry.coordinates

      for (const polygon of coords) {
        const outer = polygon[0]
        maskCtx.beginPath()
        for (let i = 0; i < outer.length; i++) {
          const [wx, wy] = geoToWorld(outer[i][0], outer[i][1])
          const u = (wx - DEM_WORLD_MIN[0]) / DEM_WIDTH
          const v = 1 - (wy - DEM_WORLD_MIN[1]) / DEM_HEIGHT
          const px = u * MASK_RES
          const py = v * MASK_RES
          if (i === 0) maskCtx.moveTo(px, py)
          else maskCtx.lineTo(px, py)
        }
        maskCtx.closePath()
        maskCtx.fill()

        // Cut out holes
        for (let h = 1; h < polygon.length; h++) {
          const hole = polygon[h]
          maskCtx.globalCompositeOperation = 'destination-out'
          maskCtx.beginPath()
          for (let i = 0; i < hole.length; i++) {
            const [wx, wy] = geoToWorld(hole[i][0], hole[i][1])
            const u = (wx - DEM_WORLD_MIN[0]) / DEM_WIDTH
            const v = 1 - (wy - DEM_WORLD_MIN[1]) / DEM_HEIGHT
            const px = u * MASK_RES
            const py = v * MASK_RES
            if (i === 0) maskCtx.moveTo(px, py)
            else maskCtx.lineTo(px, py)
          }
          maskCtx.closePath()
          maskCtx.fill()
          maskCtx.globalCompositeOperation = 'source-over'
        }
      }
    }

    const countyMaskTex = new CanvasTexture(maskCanvas)
    countyMaskTex.minFilter = LinearFilter
    countyMaskTex.magFilter = LinearFilter

    // --- Terrain quad: sized exactly to DEM world bounds ---
    const terrainGeo = new PlaneGeometry(DEM_WIDTH, DEM_HEIGHT)
    const terrainMaterial = new ShaderMaterial({
      vertexShader: terrainVertSrc,
      fragmentShader: terrainFragSrc,
      uniforms: {
        u_dem: { value: null },
        u_mask: { value: null },
        u_countyMask: { value: countyMaskTex },
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

    // --- Stripe shader material for unreleased counties ---
    const stripeMaterial = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      uniforms: {
        uStripeSpacing: { value: 0.0012 },
        uStripeWidth: { value: 0.0004 },
        uColor: { value: new Vector4(0.36, 0.29, 0.22, 0.25) },
      },
      vertexShader: `
        varying vec2 vWorldPos;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xy;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        precision highp float;
        varying vec2 vWorldPos;
        uniform float uStripeSpacing;
        uniform float uStripeWidth;
        uniform vec4 uColor;
        void main() {
          float diag = (vWorldPos.x + vWorldPos.y) * 0.7071;
          float d = mod(diag, uStripeSpacing);
          float stripe = step(uStripeSpacing - uStripeWidth, d);
          gl_FragColor = vec4(uColor.rgb, uColor.a * stripe);
        }
      `,
    })

    // --- County Fills ---
    const countyFillGroup = new Group()
    countyFillGroup.renderOrder = 3

    for (const feature of geoData.features) {
      const countyId = feature.properties.id
      const shapes = geoToShapes(feature.geometry)

      const county = counties.find((c) => c.id === countyId)
      const isReleased = county?.status === 'released'

      for (const shape of shapes) {
        const geom = new ShapeGeometry(shape)
        const initColor = isReleased
          ? new Color(1, 1, 1)
          : new Color(1.0, 0.75, 0.45)
        const mat = new MeshBasicMaterial({
          color: initColor,
          transparent: true,
          depthWrite: false,
          blending: CustomBlending,
          blendEquation: AddEquation,
          blendSrc: DstColorFactor,
          blendDst: ZeroFactor,
          blendSrcAlpha: ZeroFactor,
          blendDstAlpha: OneFactor,
        })
        const mesh = new Mesh(geom, mat)
        mesh.renderOrder = 3
        mesh.userData = {
          countyId,
          countyName: feature.properties.name,
          isReleased,
        }
        countyFillGroup.add(mesh)
      }
    }
    scene.add(countyFillGroup)

    // --- Stripe overlay for unreleased counties ---
    const stripeOverlayGroup = new Group()
    stripeOverlayGroup.renderOrder = 3.5
    for (const feature of geoData.features) {
      const countyId = feature.properties.id
      const county = counties.find((c) => c.id === countyId)
      if (county?.status === 'released') continue
      const shapes = geoToShapes(feature.geometry)
      for (const shape of shapes) {
        const geom = new ShapeGeometry(shape)
        const mesh = new Mesh(geom, stripeMaterial)
        mesh.position.z = 0.02
        mesh.renderOrder = 3.5
        stripeOverlayGroup.add(mesh)
      }
    }
    scene.add(stripeOverlayGroup)

    // --- County Borders (thick lines via LineSegments2) ---
    const countyBorderGroup = new Group()
    countyBorderGroup.renderOrder = 4

    const borderLineMaterials: LineMaterial[] = []

    for (const feature of geoData.features) {
      const countyId = feature.properties.id
      const shapes = geoToShapes(feature.geometry)

      for (const shape of shapes) {
        const fillGeom = new ShapeGeometry(shape)
        const edges = new EdgesGeometry(fillGeom)
        const posAttr = edges.getAttribute('position')
        const positions: number[] = []
        for (let i = 0; i < posAttr.count; i++) {
          positions.push(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i))
        }
        const lineGeom = new LineSegmentsGeometry()
        lineGeom.setPositions(positions)
        const lineMat = new LineMaterial({
          color: 0x5c4a3a,
          linewidth: 2,
          transparent: true,
          opacity: 1.0,
          depthWrite: false,
          blending: MultiplyBlending,
          premultipliedAlpha: true,
          resolution: new Vector2(canvas.clientWidth, canvas.clientHeight),
        })
        borderLineMaterials.push(lineMat)
        const lineSegments = new LineSegments2(lineGeom, lineMat)
        lineSegments.renderOrder = 4
        lineSegments.userData = { countyId }
        countyBorderGroup.add(lineSegments)
        fillGeom.dispose()
        edges.dispose()
      }
    }
    scene.add(countyBorderGroup)

    // --- Selection highlight borders (dark green, shown on selected county) ---
    const highlightBorderGroup = new Group()
    highlightBorderGroup.renderOrder = 4
    const highlightLineMaterials: LineMaterial[] = []

    for (const feature of geoData.features) {
      const countyId = feature.properties.id
      const shapes = geoToShapes(feature.geometry)

      for (const shape of shapes) {
        const fillGeom = new ShapeGeometry(shape)
        const edges = new EdgesGeometry(fillGeom)
        const posAttr = edges.getAttribute('position')
        const positions: number[] = []
        for (let i = 0; i < posAttr.count; i++) {
          positions.push(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i))
        }
        const lineGeom = new LineSegmentsGeometry()
        lineGeom.setPositions(positions)
        const lineMat = new LineMaterial({
          color: 0x1a6b2a,
          linewidth: 2,
          transparent: true,
          opacity: 1.0,
          depthWrite: false,
          resolution: new Vector2(canvas.clientWidth, canvas.clientHeight),
        })
        highlightLineMaterials.push(lineMat)
        const line = new LineSegments2(lineGeom, lineMat)
        line.renderOrder = 4
        line.visible = false
        line.userData = { countyId }
        highlightBorderGroup.add(line)
        fillGeom.dispose()
        edges.dispose()
      }
    }
    scene.add(highlightBorderGroup)

    // --- Labels ---
    const labelGroup = new Group()
    labelGroup.renderOrder = 5

    const countyWorldBounds = new Map<
      string,
      { width: number; height: number }
    >()

    for (const feature of geoData.features) {
      const countyId = feature.properties.id
      const name = feature.properties.name

      // Compute bounding box first (needed for label sizing)
      const allRings =
        feature.geometry.type === 'Polygon'
          ? feature.geometry.coordinates
          : feature.geometry.coordinates.flat()
      let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity
      for (const ring of allRings) {
        for (const [clon, clat] of ring) {
          const [cx, cy] = geoToWorld(clon, clat)
          minX = Math.min(minX, cx)
          maxX = Math.max(maxX, cx)
          minY = Math.min(minY, cy)
          maxY = Math.max(maxY, cy)
        }
      }
      const boundsW = maxX - minX
      const boundsH = maxY - minY
      countyWorldBounds.set(countyId, { width: boundsW, height: boundsH })

      const [lon, lat] = geoCentroid(feature)
      const [wx, wy] = geoToWorld(lon, lat)

      const county = counties.find((c) => c.id === countyId)
      const sprite = createLabelSprite({
        name,
        hasVideo: !!(county?.youtubeId || county?.nebulaUrl),
        status: county?.status ?? 'released',
        releaseDate: county?.releaseDate ?? null,
      })
      sprite.position.set(wx, wy, 0.01)
      sprite.userData = { ...sprite.userData, countyId, boundsW }
      labelGroup.add(sprite)
    }
    scene.add(labelGroup)

    // --- Journey route (Tom's travel order, shown while stepping through) ---
    // Styled like an engraved travel route: ink lines multiplied into the paper,
    // railway legs in the classic cased symbol, numbered station roundels.
    const routeGroup = new Group()
    routeGroup.renderOrder = 4.5
    routeGroup.visible = false
    const routeLineMaterials: LineMaterial[] = []
    const dashedRouteMaterials: { mat: LineMaterial; dashPx: number; gapPx: number }[] = []
    const makeRouteMaterial = (
      color: number,
      linewidth: number,
      { dash, printed = true }: { dash?: [number, number]; printed?: boolean } = {},
    ) => {
      const mat = new LineMaterial({
        color,
        linewidth,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        dashed: !!dash,
        // Multiply like the county borders, so the ink reads as printed on the map
        ...(printed && { blending: MultiplyBlending, premultipliedAlpha: true }),
        resolution: new Vector2(canvas.clientWidth, canvas.clientHeight),
      })
      routeLineMaterials.push(mat)
      if (dash) dashedRouteMaterials.push({ mat, dashPx: dash[0], gapPx: dash[1] })
      return mat
    }
    const stopWorld = journeyStops.map((s) => geoToWorld(s.coords.lng, s.coords.lat))

    // Faint dotted line for the whole route, for context
    const ghostPositions: number[] = []
    for (let i = 1; i < stopWorld.length; i++) {
      ghostPositions.push(...stopWorld[i - 1], 0.03, ...stopWorld[i], 0.03)
    }
    if (ghostPositions.length > 0) {
      const ghostGeom = new LineSegmentsGeometry()
      ghostGeom.setPositions(ghostPositions)
      const ghost = new LineSegments2(
        ghostGeom,
        makeRouteMaterial(ROUTE_GHOST_COLOR, 2, { dash: [2, 5] }),
      )
      ghost.computeLineDistances()
      ghost.renderOrder = 4.5
      routeGroup.add(ghost)
    }

    // One subdivided geometry per leg so the active leg can be drawn progressively.
    // legs[i] leads to stop i.
    const roadMaterial = makeRouteMaterial(ROUTE_INK_COLOR, 3, { dash: [10, 5] })
    const railCasingMaterial = makeRouteMaterial(ROUTE_RAIL_COLOR, 5.5)
    const railBlocksMaterial = makeRouteMaterial(ROUTE_PAPER_COLOR, 2.5, {
      dash: [8, 8],
      printed: false,
    })
    const upcomingMaterial = makeRouteMaterial(ROUTE_INK_COLOR, 3, { dash: [1, 7] })
    const legs: ({ geom: LineSegmentsGeometry; lines: LineSegments2[] } | null)[] = [null]
    for (let i = 1; i < stopWorld.length; i++) {
      const [ax, ay] = stopWorld[i - 1]
      const [bx, by] = stopWorld[i]
      const positions: number[] = []
      for (let k = 0; k < ROUTE_LEG_SUBDIVISIONS; k++) {
        const t0 = k / ROUTE_LEG_SUBDIVISIONS
        const t1 = (k + 1) / ROUTE_LEG_SUBDIVISIONS
        positions.push(
          ax + (bx - ax) * t0, ay + (by - ay) * t0, 0.03,
          ax + (bx - ax) * t1, ay + (by - ay) * t1, 0.03,
        )
      }
      const geom = new LineSegmentsGeometry()
      geom.setPositions(positions)
      const stop = journeyStops[i]
      const materials = stop.upcoming
        ? [upcomingMaterial]
        : stop.travel === 'train'
          ? [railCasingMaterial, railBlocksMaterial]
          : [roadMaterial]
      const lines = materials.map((mat, layer) => {
        const line = new LineSegments2(geom, mat)
        line.computeLineDistances()
        line.renderOrder = 4.6 + layer * 0.01
        line.visible = false
        routeGroup.add(line)
        return line
      })
      legs.push({ geom, lines })
    }

    // Canvas-drawn route markers, in the panel's Fraunces numerals
    const MARKER_BOX = 64
    const markerScale = Math.max(2, Math.ceil(window.devicePixelRatio))
    const markerCanvases: { canvas: HTMLCanvasElement; draw: (ctx: CanvasRenderingContext2D) => void; tex: CanvasTexture }[] = []
    const makeMarkerTexture = (draw: (ctx: CanvasRenderingContext2D) => void) => {
      const c = document.createElement('canvas')
      c.width = MARKER_BOX * markerScale
      c.height = MARKER_BOX * markerScale
      const tex = new CanvasTexture(c)
      tex.minFilter = LinearFilter
      // Canvas colours are sRGB; without this the palette renders washed out
      tex.colorSpace = SRGBColorSpace
      markerCanvases.push({ canvas: c, draw, tex })
      return tex
    }
    const paintMarkers = () => {
      for (const { canvas: c, draw, tex } of markerCanvases) {
        const ctx = c.getContext('2d')!
        ctx.setTransform(markerScale, 0, 0, markerScale, 0, 0)
        ctx.clearRect(0, 0, MARKER_BOX, MARKER_BOX)
        draw(ctx)
        tex.needsUpdate = true
      }
    }
    const mid = MARKER_BOX / 2
    const circle = (ctx: CanvasRenderingContext2D, r: number) => {
      ctx.beginPath()
      ctx.arc(mid, mid, r, 0, Math.PI * 2)
    }
    const numeral = (ctx: CanvasRenderingContext2D, n: number, size: number, color: string) => {
      ctx.fillStyle = color
      ctx.font = `700 ${n > 9 ? size * 0.86 : size}px 'Fraunces', Georgia, serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(n), mid, mid + size * 0.06)
    }
    // Visited stop: parchment roundel with an ink rim and gold hairline
    const visitedTexture = (n: number) =>
      makeMarkerTexture((ctx) => {
        ctx.shadowColor = 'rgba(42, 26, 10, 0.35)'
        ctx.shadowBlur = 3
        ctx.shadowOffsetY = 1
        circle(ctx, 22)
        ctx.fillStyle = '#faf3e0'
        ctx.fill()
        ctx.shadowColor = 'transparent'
        ctx.lineWidth = 3
        ctx.strokeStyle = '#3d2e1a'
        ctx.stroke()
        circle(ctx, 17.5)
        ctx.lineWidth = 1
        ctx.strokeStyle = 'rgba(139, 105, 20, 0.7)'
        ctx.stroke()
        numeral(ctx, n, 21, '#3d2e1a')
      })
    // Current stop: a wax seal
    const sealTexture = (n: number) =>
      makeMarkerTexture((ctx) => {
        ctx.shadowColor = 'rgba(42, 26, 10, 0.5)'
        ctx.shadowBlur = 4
        ctx.shadowOffsetY = 1.5
        ctx.beginPath()
        for (let a = 0; a <= 64; a++) {
          const theta = (a / 64) * Math.PI * 2
          const r = 27 + Math.sin(theta * 9) * 1.1 + Math.sin(theta * 4 + 1) * 0.7
          const x = mid + Math.cos(theta) * r
          const y = mid + Math.sin(theta) * r
          if (a === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.closePath()
        const wax = ctx.createRadialGradient(mid - 7, mid - 8, 2, mid, mid, 28)
        wax.addColorStop(0, '#c43a4c')
        wax.addColorStop(0.55, '#9e1a2c')
        wax.addColorStop(1, '#690d1b')
        ctx.fillStyle = wax
        ctx.fill()
        ctx.shadowColor = 'transparent'
        circle(ctx, 20)
        ctx.lineWidth = 1.5
        ctx.strokeStyle = 'rgba(250, 243, 224, 0.5)'
        ctx.stroke()
        numeral(ctx, n, 24, '#faf3e0')
      })
    // Not reached yet: a small hollow ring
    const futureTexture = makeMarkerTexture((ctx) => {
      circle(ctx, 9)
      ctx.fillStyle = 'rgba(250, 243, 224, 0.9)'
      ctx.fill()
      ctx.lineWidth = 2.5
      ctx.strokeStyle = 'rgba(61, 46, 26, 0.6)'
      ctx.stroke()
    })
    // Ripple around the seal
    const haloTexture = makeMarkerTexture((ctx) => {
      circle(ctx, 29)
      ctx.lineWidth = 2
      ctx.strokeStyle = 'rgba(139, 105, 20, 0.9)'
      ctx.stroke()
    })
    // Traveller: a compass needle pointing along the leg (drawn facing +x)
    const needleTexture = makeMarkerTexture((ctx) => {
      ctx.shadowColor = 'rgba(42, 26, 10, 0.45)'
      ctx.shadowBlur = 3
      ctx.shadowOffsetY = 1
      ctx.beginPath()
      ctx.moveTo(56, mid)
      ctx.lineTo(mid - 4, mid - 9)
      ctx.lineTo(12, mid)
      ctx.closePath()
      ctx.fillStyle = '#c4a040'
      ctx.fill()
      ctx.shadowColor = 'transparent'
      ctx.beginPath()
      ctx.moveTo(56, mid)
      ctx.lineTo(mid - 4, mid + 9)
      ctx.lineTo(12, mid)
      ctx.closePath()
      ctx.fillStyle = '#3d2e1a'
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(56, mid)
      ctx.lineTo(mid - 4, mid - 9)
      ctx.lineTo(12, mid)
      ctx.lineTo(mid - 4, mid + 9)
      ctx.closePath()
      ctx.lineWidth = 1.5
      ctx.strokeStyle = '#3d2e1a'
      ctx.stroke()
      circle(ctx, 3.5)
      ctx.fillStyle = '#faf3e0'
      ctx.fill()
      ctx.lineWidth = 1.2
      ctx.stroke()
    })

    const markerMaterial = (map: Texture) =>
      new SpriteMaterial({ map, transparent: true, depthTest: false, depthWrite: false })
    const stopMarkers = journeyStops.map((s, i) => {
      const visited = visitedTexture(s.episode)
      const seal = sealTexture(s.episode)
      const sprite = new Sprite(markerMaterial(futureTexture))
      const [x, y] = stopWorld[i]
      sprite.position.set(x, y, 0.04)
      sprite.renderOrder = 4.7
      routeGroup.add(sprite)
      return { sprite, visited, seal }
    })
    const halo = new Sprite(markerMaterial(haloTexture))
    halo.renderOrder = 4.75
    routeGroup.add(halo)
    const needle = new Sprite(markerMaterial(needleTexture))
    needle.renderOrder = 4.9
    routeGroup.add(needle)

    paintMarkers()
    // Repaint once Fraunces has loaded, so numerals don't stay in the fallback font
    void document.fonts.ready.then(() => {
      if (!texturesCancelled) paintMarkers()
    })

    scene.add(routeGroup)

    function updateJourney(elapsed: number, worldPerPx: number) {
      const step = journeyStepRef.current
      routeGroup.visible = step !== null && stopWorld.length > 0
      if (step === null || !routeGroup.visible) return
      const current = Math.min(step, stopWorld.length - 1)

      const anim = journeyAnimRef.current
      let progress = 1
      if (anim) {
        progress = easeInOutCubic(clamp((elapsed - anim.startTime) / anim.duration, 0, 1))
        if (progress >= 1) journeyAnimRef.current = null
      }

      for (let i = 1; i < legs.length; i++) {
        const leg = legs[i]!
        // The dotted leg to the next, unreleased stop shows once you reach its start
        const visible = journeyStops[i].upcoming ? i - 1 <= current : i <= current
        for (const line of leg.lines) line.visible = visible
        leg.geom.instanceCount =
          anim && i === anim.to
            ? Math.ceil(progress * ROUTE_LEG_SUBDIVISIONS)
            : ROUTE_LEG_SUBDIVISIONS
      }
      for (const { mat, dashPx, gapPx } of dashedRouteMaterials) {
        mat.dashSize = dashPx * worldPerPx
        mat.gapSize = gapPx * worldPerPx
      }

      stopMarkers.forEach(({ sprite, visited, seal }, i) => {
        const isCurrent = i === current && !anim
        const reached = i < current || isCurrent
        const mat = sprite.material
        mat.map = isCurrent ? seal : reached ? visited : futureTexture
        const px = isCurrent ? 38 : 24
        sprite.scale.set(px * worldPerPx, px * worldPerPx, 1)
        sprite.renderOrder = isCurrent ? 4.8 : 4.7
      })

      const [cx, cy] = stopWorld[current]
      halo.visible = !anim
      const ripple = (elapsed * 0.7) % 1
      const haloPx = 38 * (1 + ripple * 0.7)
      halo.position.set(cx, cy, 0.04)
      halo.scale.set(haloPx * worldPerPx, haloPx * worldPerPx, 1)
      halo.material.opacity = 1 - ripple

      // Needle travels the active leg, pointing the way
      needle.visible = !!anim
      if (anim) {
        const [fx, fy] = stopWorld[anim.from]
        const [tx, ty] = stopWorld[anim.to]
        needle.position.set(fx + (tx - fx) * progress, fy + (ty - fy) * progress, 0.05)
        needle.material.rotation = Math.atan2(ty - fy, tx - fx)
        needle.scale.set(34 * worldPerPx, 34 * worldPerPx, 1)
      }
    }

    // --- Raycasting & Interaction ---
    const raycaster = new Raycaster()
    const pointer = new Vector2()
    let hoveredCountyId: string | null = null

    // Multiply blending: white=no effect, darker=stronger darken
    const DEFAULT_RELEASED = new Color(1, 1, 1)
    const DEFAULT_UPCOMING = new Color(1.0, 0.75, 0.45) // warm orange tint for unreleased
    const HOVER_COLOR = new Color(0.72, 0.68, 0.58)
    const SELECT_COLOR = new Color(0.35, 1.2, 0.2)

    const materialTargets = new Map<string, Color>()

    function updateCountyMaterials() {
      countyFillGroup.traverse((child) => {
        if (!(child instanceof Mesh)) return
        const id = child.userData.countyId
        const isReleased = child.userData.isReleased

        let target = isReleased ? DEFAULT_RELEASED : DEFAULT_UPCOMING
        if (id === selectedIdRef.current) {
          target = SELECT_COLOR
        } else if (id === hoveredCountyId) {
          target = HOVER_COLOR
        }

        materialTargets.set(id + child.uuid, target)
      })

      // Toggle highlight borders
      highlightBorderGroup.traverse((child) => {
        if (!child.userData.countyId) return
        child.visible = child.userData.countyId === selectedIdRef.current
      })
    }
    updateMaterialsRef.current = updateCountyMaterials

    // --- Post-Processing ---
    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))

    if (!isMobile) {
      const bloom = new BloomEffect({
        luminanceThreshold: 0.92,
        luminanceSmoothing: 0.2,
        intensity: 0.08,
        radius: 0.3,
      })
      composer.addPass(new EffectPass(camera, bloom))
    }

    const vignette = new VignetteEffect({
      offset: 0.45,
      darkness: 0.35,
    })
    composer.addPass(new EffectPass(camera, vignette))

    // --- Load textures ---
    let texturesCancelled = false
    const loadedTextures: Texture[] = []

    Promise.all([
      loadTex(`${import.meta.env.BASE_URL}data/dem-heightmap.png`),
      loadTex(`${import.meta.env.BASE_URL}data/land-mask.png`),
    ]).then(([demTex, maskTex]) => {
      if (texturesCancelled) {
        demTex.dispose()
        maskTex.dispose()
        return
      }
      loadedTextures.push(demTex, maskTex)
      terrainMaterial.uniforms.u_dem.value = demTex
      terrainMaterial.uniforms.u_mask.value = maskTex
      waterMaterial.uniforms.u_mask.value = maskTex
    })

    // --- Clock ---
    const clock = new Clock()
    clockRef.current = clock

    // --- Initial fly-to if a county is already selected ---
    if (selectedIdRef.current && geoData) {
      const feature = geoData.features.find(
        (f) => f.properties.id === selectedIdRef.current,
      )
      if (feature) {
        const [lon, lat] = geoCentroid(feature)
        const [wx, wy] = geoToWorld(lon, lat)
        const targetHalfH = clamp(0.04, MIN_HALF_H, MAX_HALF_H)
        let panelOffsetWorld = 0
        if (typeof window !== 'undefined' && window.innerWidth >= 768) {
          const panelPx = window.innerWidth >= 1024 ? 400 : 320
          const pixelToWorld =
            (targetHalfH * 2 * (canvas.clientWidth / canvas.clientHeight)) /
            canvas.clientWidth
          panelOffsetWorld = (panelPx / 2) * pixelToWorld
        }
        flyToRef.current = {
          centerX: wx + panelOffsetWorld,
          centerY: wy,
          halfH: targetHalfH,
          startCenterX: centerRef.current[0],
          startCenterY: centerRef.current[1],
          startHalfH: halfHRef.current,
          startTime: clock.getElapsedTime(),
          duration: 1.2,
        }
        updateCountyMaterials()
      }
    }

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
    let isPinching = false
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
      if (e.pointerType !== 'touch') {
        canvas.setPointerCapture(e.pointerId)
      }
    }

    const handlePointerMove = (e: PointerEvent) => {
      // Raycast for hover — skip on touch when panning to avoid accidental hovers
      if (!(e.pointerType === 'touch' && pointerMoved)) {
        const rect = canvas.getBoundingClientRect()
        pointer.set(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -(((e.clientY - rect.top) / rect.height) * 2 - 1),
        )
        raycaster.setFromCamera(pointer, camera)
        const hits = raycaster.intersectObjects(countyFillGroup.children, false)
        const newHoveredId =
          hits.length > 0 ? hits[0].object.userData.countyId : null

        if (newHoveredId !== hoveredCountyId) {
          hoveredCountyId = newHoveredId
          onHoverCountyRef.current(hoveredCountyId)
          updateCountyMaterials()
        }
      }

      canvas.style.cursor = hoveredCountyId
        ? 'pointer'
        : isPanning
          ? 'grabbing'
          : 'grab'

      // Pan handling
      if (isPanning && !isPinching) {
        const dx = e.clientX - panStartX
        const dy = e.clientY - panStartY
        const moveThreshold = e.pointerType === 'touch' ? 10 : 3
        if (
          Math.abs(e.clientX - pointerDownX) > moveThreshold ||
          Math.abs(e.clientY - pointerDownY) > moveThreshold
        ) {
          pointerMoved = true
          // Clear hover on touch pan so labels don't appear while dragging
          if (e.pointerType === 'touch' && hoveredCountyId) {
            hoveredCountyId = null
            onHoverCountyRef.current(null)
            updateCountyMaterials()
          }
        }
        panStartX = e.clientX
        panStartY = e.clientY

        const currentHalfH = halfHRef.current
        const currentAspect = canvas.clientWidth / canvas.clientHeight
        const worldPerPixelX =
          (currentHalfH * 2 * currentAspect) / canvas.clientWidth
        const worldPerPixelY = (currentHalfH * 2) / canvas.clientHeight

        centerRef.current[0] -= dx * worldPerPixelX
        centerRef.current[1] += dy * worldPerPixelY
        clampCenter(centerRef.current)

        flyToRef.current = null
      }
    }

    const handlePointerUp = (e: PointerEvent) => {
      isPanning = false
      if (e.pointerType !== 'touch') {
        canvas.releasePointerCapture(e.pointerId)
      }
      canvas.style.cursor = hoveredCountyId ? 'pointer' : 'default'

      // Click detection: pointer didn't move significantly
      if (!pointerMoved) {
        // Fresh raycast at pointerup coordinates (touch has no persistent hover)
        const rect = canvas.getBoundingClientRect()
        pointer.set(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -(((e.clientY - rect.top) / rect.height) * 2 - 1),
        )
        raycaster.setFromCamera(pointer, camera)
        const hits = raycaster.intersectObjects(countyFillGroup.children, false)
        const tappedCountyId =
          hits.length > 0 ? hits[0].object.userData.countyId : null

        if (tappedCountyId) {
          selectedIdRef.current = tappedCountyId
          onSelectCountyRef.current(tappedCountyId)
          updateCountyMaterials()

          // Fly to the selected county
          const feature = geoData!.features.find(
            (f) => f.properties.id === tappedCountyId,
          )
          if (feature) {
            const [lon, lat] = geoCentroid(feature)
            const [wx, wy] = geoToWorld(lon, lat)
            const elapsed = clockRef.current?.getElapsedTime() ?? 0

            // Offset for panel: shift camera right so county appears centered in remaining viewport
            const targetHalfH = clamp(0.04, MIN_HALF_H, MAX_HALF_H)
            let panelOffsetWorld = 0
            if (typeof window !== 'undefined' && window.innerWidth >= 768) {
              const panelPx = window.innerWidth >= 1024 ? 400 : 320
              const pixelToWorld =
                (targetHalfH * 2 * (canvas.clientWidth / canvas.clientHeight)) /
                canvas.clientWidth
              panelOffsetWorld = (panelPx / 2) * pixelToWorld
            }

            flyToRef.current = {
              centerX: wx + panelOffsetWorld,
              centerY: wy,
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
    }

    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerup', handlePointerUp)
    canvas.addEventListener('pointercancel', handlePointerUp)

    // --- Zoom: wheel ---
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const zoomFactor = e.deltaY > 0 ? 1.04 : 1 / 1.04
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
      clampCenter(centerRef.current)

      halfHRef.current = newHalfH

      // Cancel any ongoing fly-to
      flyToRef.current = null
    }

    canvas.addEventListener('wheel', handleWheel, { passive: false })

    // --- Touch: pinch zoom (toward midpoint) ---
    let lastPinchDist = 0

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        isPinching = true
        isPanning = false // cancel single-finger pan
        pointerMoved = true // prevent tap detection
        const dx = e.touches[1].clientX - e.touches[0].clientX
        const dy = e.touches[1].clientY - e.touches[0].clientY
        lastPinchDist = Math.sqrt(dx * dx + dy * dy)
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && isPinching) {
        e.preventDefault()
        const dx = e.touches[1].clientX - e.touches[0].clientX
        const dy = e.touches[1].clientY - e.touches[0].clientY
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (lastPinchDist > 0 && dist > 0) {
          const scale = lastPinchDist / dist
          const oldHalfH = halfHRef.current
          const newHalfH = clamp(oldHalfH * scale, MIN_HALF_H, MAX_HALF_H)

          // Zoom toward the midpoint of the two fingers
          const rect = canvas.getBoundingClientRect()
          const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2
          const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2
          const ndcX = ((midX - rect.left) / rect.width) * 2 - 1
          const ndcY = -(((midY - rect.top) / rect.height) * 2 - 1)
          const currentAspect = canvas.clientWidth / canvas.clientHeight

          const worldX = centerRef.current[0] + ndcX * oldHalfH * currentAspect
          const worldY = centerRef.current[1] + ndcY * oldHalfH
          centerRef.current[0] = worldX - ndcX * newHalfH * currentAspect
          centerRef.current[1] = worldY - ndcY * newHalfH
          clampCenter(centerRef.current)

          halfHRef.current = newHalfH
          flyToRef.current = null
        }
        lastPinchDist = dist
      }
    }

    const handleTouchEnd = () => {
      lastPinchDist = 0
      isPinching = false
    }

    canvas.addEventListener('touchstart', handleTouchStart, { passive: true })
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false })
    canvas.addEventListener('touchend', handleTouchEnd, { passive: true })

    // --- Keyboard navigation ---
    let focusedCountyIndex = -1
    const countyIds = geoData.features.map((f) => f.properties.id)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault()
        if (e.shiftKey) {
          focusedCountyIndex =
            (focusedCountyIndex - 1 + countyIds.length) % countyIds.length
        } else {
          focusedCountyIndex = (focusedCountyIndex + 1) % countyIds.length
        }
        const id = countyIds[focusedCountyIndex]
        hoveredCountyId = id
        onHoverCountyRef.current(id)
        updateCountyMaterials()

        // Fly to focused county
        const feature = geoData.features[focusedCountyIndex]
        if (feature) {
          const [lon, lat] = geoCentroid(feature)
          const [wx, wy] = geoToWorld(lon, lat)
          const elapsed = clockRef.current?.getElapsedTime() ?? 0
          flyToRef.current = {
            centerX: wx,
            centerY: wy,
            halfH: clamp(0.06, MIN_HALF_H, MAX_HALF_H),
            startCenterX: centerRef.current[0],
            startCenterY: centerRef.current[1],
            startHalfH: halfHRef.current,
            startTime: elapsed,
            duration: 0.4,
          }
        }
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        if (hoveredCountyId) {
          selectedIdRef.current = hoveredCountyId
          onSelectCountyRef.current(hoveredCountyId)
          updateCountyMaterials()
        }
      } else if (e.key === 'Escape') {
        if (selectedIdRef.current) {
          onCloseDetailRef.current()
        }
        hoveredCountyId = null
        focusedCountyIndex = -1
        onHoverCountyRef.current(null)
        updateCountyMaterials()
      }
    }

    canvas.setAttribute('tabindex', '0')
    canvas.setAttribute('role', 'application')
    canvas.setAttribute('aria-label', 'Interactive map of England counties')
    canvas.addEventListener('keydown', handleKeyDown)

    // --- Resize handler ---
    const handleResize = () => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      renderer.setSize(w, h)
      composer.setSize(w, h)
      const res = new Vector2(w, h)
      terrainMaterial.uniforms.u_resolution.value = res
      waterMaterial.uniforms.u_resolution.value = res
      for (const mat of borderLineMaterials) mat.resolution.set(w, h)
      for (const mat of highlightLineMaterials) mat.resolution.set(w, h)
      for (const mat of routeLineMaterials) mat.resolution.set(w, h)
    }
    window.addEventListener('resize', handleResize)

    // --- Render loop ---
    let animFrameId = 0
    let lastCountdownRefresh = 0

    const render = () => {
      const elapsed = prefersReducedMotion ? 0 : clock.getElapsedTime()

      // --- Fly-to animation ---
      const ft = flyToRef.current
      if (ft) {
        const t = clamp((elapsed - ft.startTime) / ft.duration, 0, 1)
        const eased = easeInOutCubic(t)
        centerRef.current[0] =
          ft.startCenterX + (ft.centerX - ft.startCenterX) * eased
        centerRef.current[1] =
          ft.startCenterY + (ft.centerY - ft.startCenterY) * eased
        halfHRef.current = ft.startHalfH + (ft.halfH - ft.startHalfH) * eased
        if (ft.peakHalfH) {
          const bump = ft.peakHalfH - Math.max(ft.startHalfH, ft.halfH)
          if (bump > 0) halfHRef.current += bump * Math.sin(Math.PI * eased)
        }
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

      // --- Update border width based on zoom ---
      const frustumHeight = camera.top - camera.bottom
      const zoomRatio = (INITIAL_HALF_H * 2) / frustumHeight // >1 when zoomed in, <1 when zoomed out
      const borderWidth = Math.max(
        0.3,
        Math.min(2.0, 0.6 * Math.sqrt(zoomRatio)),
      )
      for (const mat of borderLineMaterials) mat.linewidth = borderWidth
      for (const mat of highlightLineMaterials) mat.linewidth = borderWidth

      // --- Update label visibility and scale (only hovered/selected) ---
      const frustumWidth = camera.right - camera.left
      const LABEL_ASPECT = 512 / 192 // canvas aspect

      // Refresh countdown textures every 30s for visible upcoming labels
      const now = clock.getElapsedTime()
      if (now - lastCountdownRefresh > 30) {
        lastCountdownRefresh = now
        for (const child of labelGroup.children) {
          const s = child as Sprite
          const m = s.material as SpriteMaterial
          if (m.visible) updateLabelTexture(s)
        }
      }

      for (const child of labelGroup.children) {
        const sprite = child as Sprite
        const cId = sprite.userData.countyId
        const bounds = countyWorldBounds.get(cId)
        if (!bounds) continue

        const isActive =
          cId === selectedIdRef.current || cId === hoveredCountyId
        const mat = sprite.material as SpriteMaterial

        // Target opacity: 1 for hovered/selected, 0 for others
        const targetOpacity = isActive ? 1 : 0
        mat.opacity += (targetOpacity - mat.opacity) * 0.12
        mat.visible = mat.opacity > 0.01

        // Size label: target a fixed screen-pixel height, converted to world units
        const frustumHeight = camera.top - camera.bottom
        const worldPerPx = frustumHeight / canvas.clientHeight
        const textRatio = sprite.userData.textWidthRatio || 0.5

        let labelHeight: number
        if (isMobile) {
          // Mobile: fixed pixel size, ignore county bounds
          labelHeight = 82 * worldPerPx
        } else {
          // Desktop: fit within county bounds, clamped to pixel range
          const maxHeightFromWidth =
            (bounds.width * 0.85) / (LABEL_ASPECT * textRatio)
          const maxHeightFromHeight = bounds.height * 0.3
          const fitHeight = Math.min(maxHeightFromWidth, maxHeightFromHeight)
          labelHeight = Math.max(
            28 * worldPerPx,
            Math.min(44 * worldPerPx, fitHeight),
          )
        }

        // Animate: fade in + slide up
        const progress = mat.opacity
        const animatedHeight = labelHeight * (0.85 + 0.15 * progress)
        sprite.scale.set(animatedHeight * LABEL_ASPECT, animatedHeight, 1)

        // Slide up from slightly below centroid
        const baseY = sprite.userData.baseY ?? sprite.position.y
        if (!sprite.userData.baseY) sprite.userData.baseY = sprite.position.y
        sprite.position.y = baseY + labelHeight * 0.15 * (1 - progress)
      }

      // --- Lerp county fill colors toward targets (multiply blend) ---
      countyFillGroup.traverse((child) => {
        if (!(child instanceof Mesh)) return
        const key = child.userData.countyId + child.uuid
        const target = materialTargets.get(key)
        if (!target) return
        const mat = child.material as MeshBasicMaterial
        mat.color.lerp(target, 0.15)
      })

      updateJourney(clock.getElapsedTime(), frustumHeight / canvas.clientHeight)

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
      canvas.removeEventListener('keydown', handleKeyDown)
      countyFillGroup.traverse((child) => {
        if (child instanceof Mesh) {
          child.geometry.dispose()
          ;(child.material as MeshBasicMaterial).dispose()
        }
      })
      countyBorderGroup.traverse((child) => {
        if (child instanceof LineSegments2) {
          child.geometry.dispose()
          ;(child.material as LineMaterial).dispose()
        }
      })
      highlightBorderGroup.traverse((child) => {
        if (child instanceof LineSegments2) {
          child.geometry.dispose()
          ;(child.material as LineMaterial).dispose()
        }
      })
      labelGroup.traverse((child) => {
        if (child instanceof Sprite) {
          ;(child.material as SpriteMaterial).map?.dispose()
          ;(child.material as SpriteMaterial).dispose()
        }
      })
      texturesCancelled = true
      for (const tex of loadedTextures) tex.dispose()
      clockRef.current = null
      renderer.dispose()
      composer.dispose()
      waterGeo.dispose()
      terrainGeo.dispose()
      terrainMaterial.dispose()
      countyMaskTex.dispose()
      routeGroup.traverse((child) => {
        if (child instanceof LineSegments2) child.geometry.dispose()
        if (child instanceof Sprite) child.material.dispose()
      })
      for (const mat of routeLineMaterials) mat.dispose()
      for (const { tex } of markerCanvases) tex.dispose()
      waterMaterial.dispose()
    }
  }, [canvasRef, geoData, islandsData, counties, journeyStops])

  return { zoomIn, zoomOut, resetView, flyTo }
}
