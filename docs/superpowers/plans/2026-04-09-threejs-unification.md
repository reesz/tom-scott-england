# Three.js Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate all map rendering (county borders, fills, labels, landmasses) from the SVG overlay into the Three.js scene, eliminating the dual-renderer architecture that causes resize drift, viewport gaps, and low-res zoom.

**Architecture:** Single Three.js scene with orthographic camera in Mercator world-space coordinates. GeoJSON polygons become `ShapeGeometry` meshes, labels become `Sprite`s with `CanvasTexture`, and pan/zoom is handled by camera manipulation instead of CSS transforms. Water quad extends beyond viewport bounds so edges are never visible. Shaders switch from viewport-derived `u_demUV` to camera-frustum-derived UV mapping.

**Tech Stack:** Three.js (ShapeGeometry, Raycaster, OrthographicCamera, Sprite), postprocessing (bloom, vignette), D3-geo (geoCentroid for centroids only), React, TypeScript

**Spec:** `docs/superpowers/specs/2026-04-09-threejs-unification-design.md`

---

## File Structure

### New Files
- `src/lib/mercator.ts` — Mercator projection utilities (lon/lat to world XY, world XY to lon/lat)
- `src/lib/geoToShape.ts` — Convert GeoJSON polygon coordinates to Three.js `Shape` objects
- `src/lib/createLabelSprite.ts` — Create a `Sprite` with `CanvasTexture` for a county label

### Modified Files
- `src/hooks/useThreeScene.ts` — Major rewrite: add county geometry, labels, raycasting, camera controls; remove `geoBounds` dependency
- `src/components/Map/MapView.tsx` — Simplify: remove SVG components, geoBounds, flyToTarget, projection pipeline; pass callbacks to useThreeScene
- `src/components/Map/MapContainer.tsx` — Simplify: remove CSS transform, just be a container div with MapControls
- `src/components/Map/MapControls.tsx` — Accept new callback signatures from camera-based zoom/reset
- `src/shaders/terrain.frag.glsl` — Remove out-of-bounds discard (water covers everything); keep everything else
- `src/shaders/water.frag.glsl` — Remove out-of-bounds discard; water renders everywhere

### Deleted Files
- `src/components/Map/CountySVG.tsx`
- `src/components/Map/CountyPath.tsx`
- `src/components/Map/CountyLabels.tsx`
- `src/components/Map/BackgroundLandmasses.tsx`
- `src/hooks/useMapTransform.ts`
- `src/hooks/useViewportSize.ts`
- `src/lib/projection.ts`

---

## Task 1: Mercator Projection Utilities

**Files:**
- Create: `src/lib/mercator.ts`

This task creates the coordinate system that everything else builds on. The functions convert between geographic coordinates (lon/lat) and the Three.js world space.

- [ ] **Step 1: Create `src/lib/mercator.ts`**

```typescript
// Mercator projection: geographic (lon, lat) <-> world-space (x, y)
// World units are arbitrary but consistent. We use raw Mercator output.

const DEG2RAD = Math.PI / 180

/** Convert latitude to Mercator Y */
export function latToMercY(lat: number): number {
  const rad = lat * DEG2RAD
  return Math.log(Math.tan(Math.PI / 4 + rad / 2))
}

/** Convert Mercator Y back to latitude */
export function mercYToLat(y: number): number {
  return (2 * Math.atan(Math.exp(y)) - Math.PI / 2) / DEG2RAD
}

/** Convert [lon, lat] to world-space [x, y] */
export function geoToWorld(lon: number, lat: number): [number, number] {
  return [lon * DEG2RAD, latToMercY(lat)]
}

/** Convert world-space [x, y] back to [lon, lat] */
export function worldToGeo(x: number, y: number): [number, number] {
  return [x / DEG2RAD, mercYToLat(y)]
}

// DEM bounding box (must match generate-dem-assets.py)
export const DEM_LON_MIN = -11
export const DEM_LON_MAX = 2
export const DEM_LAT_MIN = 49
export const DEM_LAT_MAX = 61

// DEM bounds in world space
export const DEM_WORLD_MIN = geoToWorld(DEM_LON_MIN, DEM_LAT_MIN)
export const DEM_WORLD_MAX = geoToWorld(DEM_LON_MAX, DEM_LAT_MAX)

/** Convert world-space bounds to DEM texture UV [uMin, vMin, uMax, vMax] */
export function worldBoundsToDemUV(
  left: number, bottom: number, right: number, top: number,
): [number, number, number, number] {
  const [demLeft, demBottom] = DEM_WORLD_MIN
  const [demRight, demTop] = DEM_WORLD_MAX
  const demW = demRight - demLeft
  const demH = demTop - demBottom

  const uMin = (left - demLeft) / demW
  const uMax = (right - demLeft) / demW
  const vMin = (bottom - demBottom) / demH
  const vMax = (top - demBottom) / demH

  return [uMin, vMin, uMax, vMax]
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/mercator.ts
git commit -m "feat: add Mercator projection utilities for world-space coordinate system"
```

---

## Task 2: GeoJSON to Three.js Shape Converter

**Files:**
- Create: `src/lib/geoToShape.ts`

Converts GeoJSON polygon coordinates into Three.js `Shape` objects that can be used with `ShapeGeometry`. Handles both `Polygon` and `MultiPolygon` types, including holes.

- [ ] **Step 1: Create `src/lib/geoToShape.ts`**

```typescript
import { Shape, Path } from 'three'
import type { Polygon, MultiPolygon, Position } from 'geojson'
import { geoToWorld } from './mercator'

/** Convert a ring of [lon, lat] positions to world-space [x, y] pairs */
function ringToWorldCoords(ring: Position[]): [number, number][] {
  return ring.map(([lon, lat]) => geoToWorld(lon, lat))
}

/** Create a Three.js Shape from a single polygon ring, with optional holes */
function polygonToShape(
  outerRing: Position[],
  holes: Position[][],
): Shape {
  const outer = ringToWorldCoords(outerRing)
  const shape = new Shape()

  shape.moveTo(outer[0][0], outer[0][1])
  for (let i = 1; i < outer.length; i++) {
    shape.lineTo(outer[i][0], outer[i][1])
  }
  shape.closePath()

  for (const holeRing of holes) {
    const holeCoords = ringToWorldCoords(holeRing)
    const holePath = new Path()
    holePath.moveTo(holeCoords[0][0], holeCoords[0][1])
    for (let i = 1; i < holeCoords.length; i++) {
      holePath.lineTo(holeCoords[i][0], holeCoords[i][1])
    }
    holePath.closePath()
    shape.holes.push(holePath)
  }

  return shape
}

/** Convert a GeoJSON Polygon or MultiPolygon geometry to Three.js Shape(s) */
export function geoToShapes(geometry: Polygon | MultiPolygon): Shape[] {
  if (geometry.type === 'Polygon') {
    const [outer, ...holes] = geometry.coordinates
    return [polygonToShape(outer, holes)]
  }

  // MultiPolygon: one Shape per polygon
  return geometry.coordinates.map((polygon) => {
    const [outer, ...holes] = polygon
    return polygonToShape(outer, holes)
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/geoToShape.ts
git commit -m "feat: add GeoJSON to Three.js Shape converter"
```

---

## Task 3: Label Sprite Factory

**Files:**
- Create: `src/lib/createLabelSprite.ts`

Creates canvas-texture sprites for county labels. Serif font, text shadow for readability.

- [ ] **Step 1: Create `src/lib/createLabelSprite.ts`**

```typescript
import { Sprite, SpriteMaterial, CanvasTexture, LinearFilter } from 'three'

const CANVAS_WIDTH = 512
const CANVAS_HEIGHT = 128
const FONT_SIZE = 48
const FONT = `${FONT_SIZE}px 'Fraunces', Georgia, serif`

/**
 * Create a Sprite with a canvas-rendered label.
 * The sprite is sized in world units so it scales naturally with zoom.
 */
export function createLabelSprite(name: string): Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_WIDTH * 2 // 2x for retina
  canvas.height = CANVAS_HEIGHT * 2
  const ctx = canvas.getContext('2d')!

  ctx.scale(2, 2)

  // Text shadow for readability over terrain
  ctx.shadowColor = 'rgba(255, 255, 255, 0.7)'
  ctx.shadowBlur = 4
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0

  // Draw text
  ctx.font = FONT
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.letterSpacing = '1px'
  ctx.fillStyle = 'rgba(60, 50, 40, 0.85)'
  ctx.fillText(name, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2)

  // Also draw a subtle stroke for legibility
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
  ctx.lineWidth = 1.5
  ctx.strokeText(name, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2)
  // Re-draw fill on top of stroke
  ctx.fillText(name, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2)

  const texture = new CanvasTexture(canvas)
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter

  const material = new SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    depthTest: false,
  })

  const sprite = new Sprite(material)
  // Name stored for debugging
  sprite.name = `label-${name}`

  return sprite
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/createLabelSprite.ts
git commit -m "feat: add label sprite factory for canvas-texture county labels"
```

---

## Task 4: Rewrite useThreeScene — Scene Setup, Camera, Water & Terrain

**Files:**
- Modify: `src/hooks/useThreeScene.ts` (full rewrite)
- Modify: `src/shaders/terrain.frag.glsl` (remove out-of-bounds discard)
- Modify: `src/shaders/water.frag.glsl` (remove out-of-bounds discard)

This task sets up the core scene with camera-based UV mapping, oversized water quad, and resize handling. County geometry, labels, and interactions come in subsequent tasks.

- [ ] **Step 1: Update terrain shader — remove out-of-bounds discard**

In `src/shaders/terrain.frag.glsl`, remove line 95:
```glsl
  if (demUV.x < 0.0 || demUV.x > 1.0 || demUV.y < 0.0 || demUV.y > 1.0) discard;
```

The terrain quad will now be sized to DEM bounds in world space, so UV is always valid. Keep the edge fade (lines 123-125) as it gracefully handles boundary pixels.

- [ ] **Step 2: Update water shader — remove out-of-bounds discard, handle no-mask areas**

In `src/shaders/water.frag.glsl`, replace lines 47-50:
```glsl
void main() {
  vec2 demUV = remapUV(v_uv);

  // Discard fragments outside valid DEM range
  if (demUV.x < 0.0 || demUV.x > 1.0 || demUV.y < 0.0 || demUV.y > 1.0) discard;
```

With:
```glsl
void main() {
  vec2 demUV = remapUV(v_uv);

  // Outside DEM range: render as deep ocean (no mask data available)
  bool outsideDEM = demUV.x < 0.0 || demUV.x > 1.0 || demUV.y < 0.0 || demUV.y > 1.0;
```

Then replace line 52:
```glsl
  float mask = texture2D(u_mask, demUV).r;
```

With:
```glsl
  float mask = outsideDEM ? 0.0 : texture2D(u_mask, clamp(demUV, 0.0, 1.0)).r;
```

This makes water render as deep ocean beyond the DEM bounds, so the user never sees a cutoff.

- [ ] **Step 3: Rewrite `src/hooks/useThreeScene.ts` — scene setup with camera-based rendering**

Replace the entire file. This step only covers scene setup, camera, water, terrain, resize, and render loop. County meshes, labels, and interactions will be added in Tasks 5-7.

```typescript
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
  Group,
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
import { geoToShapes } from '#/lib/geoToShape'
import { createLabelSprite } from '#/lib/createLabelSprite'
import type { CountyFeatureCollection, IslandFeatureCollection } from '#/hooks/useGeoData'
import type { County } from '#/types/county'

// DEM texture resolution
const DEM_SIZE = 2048

// Zoom limits (camera frustum half-height in world units)
// These are Mercator Y units — the full UK spans roughly 0.3 units
const MIN_HALF_H = 0.02  // max zoom in (~single county)
const MAX_HALF_H = 0.25  // max zoom out (full UK + padding)

// Initial camera center (roughly center of England)
const INITIAL_CENTER = geoToWorld(-1.5, 53.0)
const INITIAL_HALF_H = 0.15 // shows most of England

interface UseThreeSceneOptions {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  geoData: CountyFeatureCollection | null
  islandsData: IslandFeatureCollection | null
  counties: County[]
  selectedId: string | null
  onSelectCounty: (id: string) => void
  onHoverCounty: (id: string | null) => void
}

export function useThreeScene({
  canvasRef,
  geoData,
  islandsData,
  counties,
  selectedId,
  onSelectCounty,
  onHoverCounty,
}: UseThreeSceneOptions) {
  // Refs for imperative camera control from MapControls
  const cameraRef = useRef<OrthographicCamera | null>(null)
  const halfHRef = useRef(INITIAL_HALF_H)
  const centerRef = useRef<[number, number]>([...INITIAL_CENTER])
  // For fly-to animation
  const flyToAnimRef = useRef<{
    startCenter: [number, number]
    endCenter: [number, number]
    startHalfH: number
    endHalfH: number
    startTime: number
    duration: number
  } | null>(null)

  // Scene setup — runs once on mount, rebuilds if geoData changes
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !geoData) return

    const isMobile = window.innerWidth < 768
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
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
    const [cx, cy] = centerRef.current
    const camera = new OrthographicCamera(
      cx - halfH * aspect, cx + halfH * aspect,
      cy + halfH, cy - halfH,
      0, 10,
    )
    camera.position.z = 5
    cameraRef.current = camera

    /** Update camera frustum from current center + halfH + viewport aspect */
    function updateCamera() {
      const a = canvas!.clientWidth / canvas!.clientHeight
      const h = halfHRef.current
      const [x, y] = centerRef.current
      camera.left = x - h * a
      camera.right = x + h * a
      camera.top = y + h
      camera.bottom = y - h
      camera.updateProjectionMatrix()
    }

    /** Compute u_demUV from current camera frustum */
    function getDemUV(): Vector4 {
      const [uMin, vMin, uMax, vMax] = worldBoundsToDemUV(
        camera.left, camera.bottom, camera.right, camera.top,
      )
      return new Vector4(uMin, vMin, uMax, vMax)
    }

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

    // --- Water (oversized quad, covers everything) ---
    // Water quad is 10x DEM size centered on camera — repositioned each frame
    const waterSize = 4.0 // big enough to cover any zoom level
    const waterGeo = new PlaneGeometry(waterSize, waterSize)
    const waterMaterial = new ShaderMaterial({
      vertexShader: waterVertSrc,
      fragmentShader: waterFragSrc,
      uniforms: {
        u_mask: { value: null },
        u_time: { value: 0 },
        u_mouse: { value: new Vector2(0.5, 0.5) },
        u_resolution: { value: new Vector2(canvas.clientWidth, canvas.clientHeight) },
        u_demUV: { value: getDemUV() },
      },
      transparent: true,
      depthWrite: false,
    })
    const waterMesh = new Mesh(waterGeo, waterMaterial)
    waterMesh.renderOrder = 0
    scene.add(waterMesh)

    // --- Terrain (sized to DEM bounds in world space) ---
    const [demL, demB] = DEM_WORLD_MIN
    const [demR, demT] = DEM_WORLD_MAX
    const demW = demR - demL
    const demH = demT - demB
    const terrainGeo = new PlaneGeometry(demW, demH)
    const terrainMaterial = new ShaderMaterial({
      vertexShader: terrainVertSrc,
      fragmentShader: terrainFragSrc,
      uniforms: {
        u_dem: { value: null },
        u_mask: { value: null },
        u_mouse: { value: new Vector2(0.5, 0.5) },
        u_time: { value: 0 },
        u_resolution: { value: new Vector2(canvas.clientWidth, canvas.clientHeight) },
        u_demTexelSize: { value: new Vector2(1.0 / DEM_SIZE, 1.0 / DEM_SIZE) },
        u_demUV: { value: new Vector4(0, 0, 1, 1) }, // terrain quad maps 1:1 to DEM
      },
      transparent: true,
      depthWrite: false,
    })
    const terrainMesh = new Mesh(terrainGeo, terrainMaterial)
    terrainMesh.position.set((demL + demR) / 2, (demB + demT) / 2, 0)
    terrainMesh.renderOrder = 1
    scene.add(terrainMesh)

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

    const vignette = new VignetteEffect({ offset: 0.45, darkness: 0.35 })
    composer.addPass(new EffectPass(camera, vignette))

    // --- Load textures ---
    Promise.all([loadTex('/data/dem-heightmap.png'), loadTex('/data/land-mask.png')]).then(
      ([demTex, maskTex]) => {
        terrainMaterial.uniforms.u_dem.value = demTex
        terrainMaterial.uniforms.u_mask.value = maskTex
        waterMaterial.uniforms.u_mask.value = maskTex
      },
    )

    // --- Mouse tracking ---
    const mouseRef = new Vector2(0.5, 0.5)
    const targetMouse = new Vector2(0.5, 0.5)
    const handleMouse = (e: MouseEvent) => {
      targetMouse.set(e.clientX / window.innerWidth, e.clientY / window.innerHeight)
    }
    if (!isMobile) {
      window.addEventListener('mousemove', handleMouse)
    }

    // --- Render loop ---
    const clock = new Clock()
    let animFrameId = 0

    const render = () => {
      const elapsed = prefersReducedMotion ? 0 : clock.getElapsedTime()

      // Fly-to animation
      const flyAnim = flyToAnimRef.current
      if (flyAnim) {
        const t = Math.min(1, (elapsed - flyAnim.startTime) / flyAnim.duration)
        // ease-in-out cubic
        const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
        centerRef.current = [
          flyAnim.startCenter[0] + (flyAnim.endCenter[0] - flyAnim.startCenter[0]) * ease,
          flyAnim.startCenter[1] + (flyAnim.endCenter[1] - flyAnim.startCenter[1]) * ease,
        ]
        halfHRef.current = flyAnim.startHalfH + (flyAnim.endHalfH - flyAnim.startHalfH) * ease
        updateCamera()
        if (t >= 1) flyToAnimRef.current = null
      }

      // Smooth mouse lerp
      if (!prefersReducedMotion && !isMobile) {
        mouseRef.lerp(targetMouse, 0.05)
      }

      // Update water quad position to follow camera center
      waterMesh.position.set(centerRef.current[0], centerRef.current[1], 0)
      // Update water DEM UV based on water quad's world-space coverage
      const wHalf = waterSize / 2
      const [wcx, wcy] = centerRef.current
      const waterDemUV = worldBoundsToDemUV(
        wcx - wHalf, wcy - wHalf, wcx + wHalf, wcy + wHalf,
      )
      waterMaterial.uniforms.u_demUV.value.set(...waterDemUV)

      // Update shader uniforms
      terrainMaterial.uniforms.u_time.value = elapsed
      terrainMaterial.uniforms.u_mouse.value.copy(mouseRef)
      waterMaterial.uniforms.u_time.value = elapsed
      waterMaterial.uniforms.u_mouse.value.copy(mouseRef)

      composer.render()
      animFrameId = requestAnimationFrame(render)
    }

    render()

    // --- Resize handler ---
    const handleResize = () => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      renderer.setSize(w, h)
      composer.setSize(w, h)
      const res = new Vector2(w, h)
      terrainMaterial.uniforms.u_resolution.value = res
      waterMaterial.uniforms.u_resolution.value = res
      updateCamera()
    }
    window.addEventListener('resize', handleResize)

    // --- Pan / Zoom gesture handling ---
    let isPanning = false
    let panStart = { x: 0, y: 0 }

    const worldFromPointer = (clientX: number, clientY: number): [number, number] => {
      const rect = canvas.getBoundingClientRect()
      const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1
      const ndcY = -(((clientY - rect.top) / rect.height) * 2 - 1)
      const worldX = camera.left + (ndcX + 1) / 2 * (camera.right - camera.left)
      const worldY = camera.bottom + (ndcY + 1) / 2 * (camera.top - camera.bottom)
      return [worldX, worldY]
    }

    const handlePointerDown = (e: PointerEvent) => {
      isPanning = true
      panStart = { x: e.clientX, y: e.clientY }
      canvas.setPointerCapture(e.pointerId)
      canvas.style.cursor = 'grabbing'
    }

    const handlePointerMove = (e: PointerEvent) => {
      if (!isPanning) return
      const dx = e.clientX - panStart.x
      const dy = e.clientY - panStart.y
      panStart = { x: e.clientX, y: e.clientY }

      // Convert pixel delta to world-space delta
      const pixelToWorld = (halfHRef.current * 2) / canvas.clientHeight
      centerRef.current = [
        centerRef.current[0] - dx * pixelToWorld,
        centerRef.current[1] + dy * pixelToWorld, // Y is inverted (screen down = world up)
      ]
      updateCamera()
    }

    const handlePointerUp = (e: PointerEvent) => {
      isPanning = false
      canvas.releasePointerCapture(e.pointerId)
      canvas.style.cursor = 'default'
    }

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const factor = e.deltaY > 0 ? 1.08 : 0.92
      const newHalfH = Math.max(MIN_HALF_H, Math.min(MAX_HALF_H, halfHRef.current * factor))

      // Zoom toward pointer position
      const [worldX, worldY] = worldFromPointer(e.clientX, e.clientY)
      const scale = newHalfH / halfHRef.current
      centerRef.current = [
        worldX + (centerRef.current[0] - worldX) * scale,
        worldY + (centerRef.current[1] - worldY) * scale,
      ]

      halfHRef.current = newHalfH
      updateCamera()
    }

    // Touch pinch zoom
    let lastPinchDist = 0
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        lastPinchDist = Math.sqrt(dx * dx + dy * dy)
      }
    }
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault()
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (lastPinchDist > 0) {
          const scale = lastPinchDist / dist
          halfHRef.current = Math.max(MIN_HALF_H, Math.min(MAX_HALF_H, halfHRef.current * scale))
          updateCamera()
        }
        lastPinchDist = dist
      }
    }
    const handleTouchEnd = () => { lastPinchDist = 0 }

    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerup', handlePointerUp)
    canvas.addEventListener('pointercancel', handlePointerUp)
    canvas.addEventListener('wheel', handleWheel, { passive: false })
    canvas.addEventListener('touchstart', handleTouchStart, { passive: true })
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false })
    canvas.addEventListener('touchend', handleTouchEnd)

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
      cameraRef.current = null
      renderer.dispose()
      composer.dispose()
      waterGeo.dispose()
      terrainGeo.dispose()
      terrainMaterial.dispose()
      waterMaterial.dispose()
    }
  }, [canvasRef, geoData])

  // --- Imperative methods for MapControls and flyTo ---
  const zoomIn = useCallback(() => {
    halfHRef.current = Math.max(MIN_HALF_H, halfHRef.current / 1.3)
    // Camera update happens in render loop via flyTo or we update directly
    const camera = cameraRef.current
    if (camera) {
      const canvas = canvasRef.current
      if (!canvas) return
      const a = canvas.clientWidth / canvas.clientHeight
      const h = halfHRef.current
      const [x, y] = centerRef.current
      camera.left = x - h * a
      camera.right = x + h * a
      camera.top = y + h
      camera.bottom = y - h
      camera.updateProjectionMatrix()
    }
  }, [canvasRef])

  const zoomOut = useCallback(() => {
    halfHRef.current = Math.min(MAX_HALF_H, halfHRef.current * 1.3)
    const camera = cameraRef.current
    if (camera) {
      const canvas = canvasRef.current
      if (!canvas) return
      const a = canvas.clientWidth / canvas.clientHeight
      const h = halfHRef.current
      const [x, y] = centerRef.current
      camera.left = x - h * a
      camera.right = x + h * a
      camera.top = y + h
      camera.bottom = y - h
      camera.updateProjectionMatrix()
    }
  }, [canvasRef])

  const resetView = useCallback(() => {
    centerRef.current = [...INITIAL_CENTER]
    halfHRef.current = INITIAL_HALF_H
    const camera = cameraRef.current
    if (camera) {
      const canvas = canvasRef.current
      if (!canvas) return
      const a = canvas.clientWidth / canvas.clientHeight
      const h = INITIAL_HALF_H
      const [x, y] = INITIAL_CENTER
      camera.left = x - h * a
      camera.right = x + h * a
      camera.top = y + h
      camera.bottom = y - h
      camera.updateProjectionMatrix()
    }
  }, [canvasRef])

  const flyTo = useCallback((lon: number, lat: number, targetHalfH?: number) => {
    const [wx, wy] = geoToWorld(lon, lat)
    flyToAnimRef.current = {
      startCenter: [...centerRef.current] as [number, number],
      endCenter: [wx, wy],
      startHalfH: halfHRef.current,
      endHalfH: targetHalfH ?? Math.min(halfHRef.current, 0.04),
      startTime: performance.now() / 1000, // will be replaced by clock time in render
      duration: 0.6,
    }
  }, [])

  return { zoomIn, zoomOut, resetView, flyTo }
}
```

**Note:** The `flyToAnimRef.startTime` uses `performance.now() / 1000` as a rough initial value — in the render loop it's compared against `elapsed` from the Clock. We need to fix this: use the Clock's elapsed time. Update the `flyTo` callback and render loop:

In the render loop, when setting up flyAnim, the startTime should use clock elapsed. The simplest fix: store a ref to the clock and use it in flyTo. But since flyTo is a callback outside the effect, we'll use a ref:

Add a `clockRef` near the other refs:
```typescript
const clockRef = useRef<Clock | null>(null)
```

In the effect, after `const clock = new Clock()`, add:
```typescript
clockRef.current = clock
```

Update `flyTo`:
```typescript
const flyTo = useCallback((lon: number, lat: number, targetHalfH?: number) => {
  const [wx, wy] = geoToWorld(lon, lat)
  const elapsed = clockRef.current?.getElapsedTime() ?? 0
  flyToAnimRef.current = {
    startCenter: [...centerRef.current] as [number, number],
    endCenter: [wx, wy],
    startHalfH: halfHRef.current,
    endHalfH: targetHalfH ?? Math.min(halfHRef.current, 0.04),
    startTime: elapsed,
    duration: 0.6,
  }
}, [])
```

- [ ] **Step 4: Verify the app renders** — Run `npm run dev`, open in browser. You should see water + terrain rendering fullscreen. No counties or labels yet. Resizing the window should adjust aspect ratio without drift. Wheel zoom and drag pan should work.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useThreeScene.ts src/shaders/terrain.frag.glsl src/shaders/water.frag.glsl
git commit -m "feat: rewrite useThreeScene with camera-based rendering, pan/zoom, oversized water"
```

---

## Task 5: Add County Geometry and Background Landmasses to the Scene

**Files:**
- Modify: `src/hooks/useThreeScene.ts` — add county fill meshes, border lines, and landmass meshes inside the main effect

This builds on the scene from Task 4. Add county fills, borders, and landmass geometry after the terrain mesh setup but before post-processing.

- [ ] **Step 1: Add imports and geometry builders to useThreeScene.ts**

Add these imports at the top (some may already be present from Task 4):
```typescript
import {
  ShapeGeometry,
  EdgesGeometry,
  LineSegments,
  LineBasicMaterial,
  MeshStandardMaterial,
  MeshBasicMaterial,
  BufferGeometry,
  Color,
} from 'three'
```

After the terrain mesh is added to the scene (after `scene.add(terrainMesh)`), add:

```typescript
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
    const countyMeshMap = new Map<string, Mesh>()

    for (const feature of geoData.features) {
      const countyId = feature.properties.id
      const county = counties.find((c) => c.id === countyId)
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
        // Store first mesh per county for raycasting (multi-polygons may have multiple)
        if (!countyMeshMap.has(countyId)) {
          countyMeshMap.set(countyId, mesh)
        }
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
        fillGeom.dispose() // edges copied what it needs
      }
    }
    scene.add(countyBorderGroup)
```

- [ ] **Step 2: Add disposal for new geometry in cleanup**

In the cleanup `return` block, before `renderer.dispose()`, add:

```typescript
      // Dispose county geometry
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
```

- [ ] **Step 3: Verify** — Run `npm run dev`. County outlines and fills should appear over the terrain. Background landmasses (Scotland, Wales, Ireland) should render with a muted fill. The counties should be in the correct geographic positions.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useThreeScene.ts
git commit -m "feat: add county fills, borders, and background landmasses to Three.js scene"
```

---

## Task 6: Add Labels

**Files:**
- Modify: `src/hooks/useThreeScene.ts` — add label sprites after county geometry

- [ ] **Step 1: Add label sprites to the scene**

After the county borders section in the main effect, add:

```typescript
    // --- Labels ---
    // NOTE: `geoCentroid` must be imported at the top of the file (see note below)
    const labelGroup = new Group()
    labelGroup.renderOrder = 5

    // Compute approximate bounding box size in world units per county
    // Used for zoom-dependent visibility
    const countyWorldBounds = new Map<string, { width: number; height: number }>()

    for (const feature of geoData.features) {
      const countyId = feature.properties.id
      const name = feature.properties.name

      // Centroid in lon/lat -> world space
      const [lon, lat] = geoCentroid(feature)
      const [wx, wy] = geoToWorld(lon, lat)

      const sprite = createLabelSprite(name)
      // Size the sprite in world units — roughly 0.02 units wide at base
      const labelScale = 0.012
      sprite.scale.set(labelScale * 4, labelScale, 1) // 4:1 aspect (512:128 canvas)
      sprite.position.set(wx, wy, 0.01) // slightly in front of county meshes
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
```

Note: The `geoCentroid` import should be moved to the top of the file:
```typescript
import { geoCentroid } from 'd3-geo'
```

- [ ] **Step 2: Add zoom-dependent label visibility to the render loop**

In the render loop, after the fly-to animation block and before `composer.render()`, add:

```typescript
      // Update label visibility based on zoom level
      const frustumWidth = camera.right - camera.left
      const MIN_SCREEN_FRACTION = 0.06 // county must be at least 6% of viewport width to show label

      for (const sprite of labelGroup.children) {
        const countyId = sprite.userData.countyId
        const bounds = countyWorldBounds.get(countyId)
        if (!bounds) continue

        const screenFraction = bounds.width / frustumWidth
        const targetOpacity = screenFraction > MIN_SCREEN_FRACTION ? 1 : 0
        const mat = (sprite as Sprite).material as SpriteMaterial
        // Lerp opacity for smooth fade
        mat.opacity += (targetOpacity - mat.opacity) * 0.1
        mat.visible = mat.opacity > 0.01
      }
```

Add `Sprite` and `SpriteMaterial` to the Three.js imports if not already present:
```typescript
import { Sprite, SpriteMaterial } from 'three'
```

- [ ] **Step 3: Add label disposal in cleanup**

```typescript
      labelGroup.traverse((child) => {
        if (child instanceof Sprite) {
          ;(child.material as SpriteMaterial).map?.dispose()
          ;(child.material as SpriteMaterial).dispose()
        }
      })
```

- [ ] **Step 4: Verify** — Run `npm run dev`. At default zoom, only large county labels should be visible. Zoom in and smaller county labels should fade in. Labels should be positioned at county centroids and scale with zoom.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useThreeScene.ts
git commit -m "feat: add zoom-dependent county label sprites"
```

---

## Task 7: Add Raycasting Interactions (Hover & Select)

**Files:**
- Modify: `src/hooks/useThreeScene.ts` — add raycaster, hover material transitions, click-to-select

- [ ] **Step 1: Add raycasting and hover/select state to the scene**

In the main effect, after the label section and before post-processing, add:

```typescript
    // --- Raycasting ---
    const raycaster = new Raycaster()
    const pointer = new Vector2()
    let hoveredCountyId: string | null = null
    let currentSelectedId: string | null = selectedId

    // Material targets for hover/select transitions
    // Store per-county target emissive intensity and opacity for lerping
    const materialTargets = new Map<string, { opacity: number; emissiveIntensity: number }>()

    const HOVER_COLOR = new Color().setHSL(45 / 360, 0.4, 0.7)
    const HOVER_OPACITY = 0.12
    const HOVER_EMISSIVE = 0.3
    const SELECT_OPACITY = 0.18
    const SELECT_EMISSIVE = 0.5

    function updateCountyMaterials() {
      countyFillGroup.traverse((child) => {
        if (!(child instanceof Mesh)) return
        const id = child.userData.countyId
        const mat = child.material as MeshStandardMaterial
        let targetOpacity = 0
        let targetEmissive = 0

        if (id === currentSelectedId) {
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
```

- [ ] **Step 2: Add material lerping to the render loop**

In the render loop, after label visibility and before `composer.render()`, add:

```typescript
      // Lerp county materials toward targets
      countyFillGroup.traverse((child) => {
        if (!(child instanceof Mesh)) return
        const key = child.userData.countyId + child.uuid
        const target = materialTargets.get(key)
        if (!target) return
        const mat = child.material as MeshStandardMaterial
        mat.opacity += (target.opacity - mat.opacity) * 0.15
        mat.emissiveIntensity += (target.emissiveIntensity - mat.emissiveIntensity) * 0.15
      })
```

- [ ] **Step 3: Modify pointer handlers to include raycasting**

Replace the `handlePointerDown`, `handlePointerMove`, and `handlePointerUp` handlers with versions that integrate raycasting. The key change: we track whether the pointer moved between down and up to distinguish clicks from drags.

```typescript
    let pointerDownPos = { x: 0, y: 0 }
    let pointerMoved = false

    const handlePointerDown = (e: PointerEvent) => {
      isPanning = true
      pointerMoved = false
      panStart = { x: e.clientX, y: e.clientY }
      pointerDownPos = { x: e.clientX, y: e.clientY }
      canvas.setPointerCapture(e.pointerId)
    }

    const handlePointerMove = (e: PointerEvent) => {
      // Raycast for hover (always, not just when panning)
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
        onHoverCounty(hoveredCountyId)
        updateCountyMaterials()
      }
      canvas.style.cursor = hoveredCountyId ? 'pointer' : (isPanning ? 'grabbing' : 'default')

      // Pan handling
      if (isPanning) {
        const dx = e.clientX - panStart.x
        const dy = e.clientY - panStart.y
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) pointerMoved = true
        panStart = { x: e.clientX, y: e.clientY }
        const pixelToWorld = (halfHRef.current * 2) / canvas.clientHeight
        centerRef.current = [
          centerRef.current[0] - dx * pixelToWorld,
          centerRef.current[1] + dy * pixelToWorld,
        ]
        updateCamera()
      }
    }

    const handlePointerUp = (e: PointerEvent) => {
      isPanning = false
      canvas.releasePointerCapture(e.pointerId)
      canvas.style.cursor = hoveredCountyId ? 'pointer' : 'default'

      // Click detection: pointer didn't move significantly
      if (!pointerMoved && hoveredCountyId) {
        currentSelectedId = hoveredCountyId
        onSelectCounty(hoveredCountyId)
        updateCountyMaterials()

        // Fly to the selected county
        const feature = geoData.features.find((f) => f.properties.id === hoveredCountyId)
        if (feature) {
          const [lon, lat] = geoCentroid(feature)
          const elapsed = clockRef.current?.getElapsedTime() ?? 0
          flyToAnimRef.current = {
            startCenter: [...centerRef.current] as [number, number],
            endCenter: geoToWorld(lon, lat),
            startHalfH: halfHRef.current,
            endHalfH: Math.min(halfHRef.current, 0.04),
            startTime: elapsed,
            duration: 0.6,
          }
        }
      }
    }
```

- [ ] **Step 4: Update selected state when prop changes**

Add an effect to sync React's `selectedId` prop with the internal `currentSelectedId`. Add this after the main scene effect:

```typescript
  // Sync selectedId from React props
  useEffect(() => {
    // This will be picked up by the render loop's material update
    // We store it on a ref that the scene effect can read
  }, [selectedId])
```

Actually, since `currentSelectedId` lives inside the effect closure, we need a ref. Add near the other refs at the top of the hook:

```typescript
const selectedIdRef = useRef<string | null>(null)
```

In the main effect, instead of `let currentSelectedId = selectedId`, use:
```typescript
selectedIdRef.current = selectedId
```

And replace all `currentSelectedId` references inside the effect with `selectedIdRef.current`.

Add an effect to update materials when selectedId changes from React:
```typescript
useEffect(() => {
  selectedIdRef.current = selectedId
}, [selectedId])
```

- [ ] **Step 5: Verify** — Run `npm run dev`. Hovering a county should show a warm glow. Clicking should intensify the glow and fly to the county. The detail panel should open.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useThreeScene.ts
git commit -m "feat: add raycasting hover/select with emissive glow transitions"
```

---

## Task 8: Simplify MapView, MapContainer, and Wire Everything Up

**Files:**
- Modify: `src/components/Map/MapView.tsx`
- Modify: `src/components/Map/MapContainer.tsx`
- Modify: `src/components/Map/MapControls.tsx`
- Delete: `src/components/Map/CountySVG.tsx`
- Delete: `src/components/Map/CountyPath.tsx`
- Delete: `src/components/Map/CountyLabels.tsx`
- Delete: `src/components/Map/BackgroundLandmasses.tsx`
- Delete: `src/hooks/useMapTransform.ts`
- Delete: `src/hooks/useViewportSize.ts`
- Delete: `src/lib/projection.ts`
- Delete: `src/components/Map/ThreeBackground.tsx`

- [ ] **Step 1: Rewrite `src/components/Map/MapView.tsx`**

```typescript
import { useState, useMemo, useRef } from 'react'
import { useCountyData } from '#/hooks/useCountyData'
import { useGeoData } from '#/hooks/useGeoData'
import { useThreeScene } from '#/hooks/useThreeScene'
import { MapContainer } from './MapContainer'
import { MapLegend } from './MapLegend'
import { Header } from '#/components/Layout/Header'
import { DetailPanel } from '#/components/Detail/DetailPanel'
import { BottomSheet } from '#/components/Detail/BottomSheet'
import { CountyDetail } from '#/components/Detail/CountyDetail'
import type { CountyFeature } from '#/hooks/useGeoData'

interface MapViewProps {
  selectedId: string | null
  onSelectCounty: (id: string) => void
  onCloseDetail: () => void
}

export function MapView({ selectedId, onSelectCounty, onCloseDetail }: MapViewProps) {
  const { counties, loading: countiesLoading } = useCountyData()
  const { geoData, islandsData, loading: geoLoading } = useGeoData()
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const selectedCounty = useMemo(
    () => counties.find((c) => c.id === selectedId),
    [counties, selectedId],
  )

  const selectedFeature = useMemo(
    () =>
      geoData?.features.find((f) => f.properties.id === selectedId) as CountyFeature | undefined,
    [geoData, selectedId],
  )

  const { zoomIn, zoomOut, resetView } = useThreeScene({
    canvasRef,
    geoData,
    islandsData,
    counties,
    selectedId,
    onSelectCounty,
    onHoverCounty: setHoveredId,
  })

  if (countiesLoading || geoLoading) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  if (!geoData) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <p>No geo data</p>
      </div>
    )
  }

  const panelOpen = !!selectedCounty

  return (
    <>
      <Header />
      <MapContainer canvasRef={canvasRef} zoomIn={zoomIn} zoomOut={zoomOut} resetView={resetView} />
      <MapLegend />

      <DetailPanel isOpen={panelOpen} onClose={onCloseDetail}>
        {selectedCounty && selectedFeature && (
          <CountyDetail county={selectedCounty} feature={selectedFeature} />
        )}
      </DetailPanel>

      <BottomSheet isOpen={panelOpen} onClose={onCloseDetail}>
        {selectedCounty && selectedFeature && (
          <CountyDetail county={selectedCounty} feature={selectedFeature} />
        )}
      </BottomSheet>
    </>
  )
}
```

- [ ] **Step 2: Rewrite `src/components/Map/MapContainer.tsx`**

```typescript
import type { RefObject } from 'react'
import { MapControls } from './MapControls'

interface MapContainerProps {
  canvasRef: RefObject<HTMLCanvasElement | null>
  zoomIn: () => void
  zoomOut: () => void
  resetView: () => void
}

export function MapContainer({ canvasRef, zoomIn, zoomOut, resetView }: MapContainerProps) {
  return (
    <div className="fixed inset-0">
      <canvas
        ref={canvasRef}
        className="h-full w-full touch-none"
      />
      <MapControls onZoomIn={zoomIn} onZoomOut={zoomOut} onReset={resetView} />
    </div>
  )
}
```

- [ ] **Step 3: Delete removed files**

```bash
rm src/components/Map/CountySVG.tsx
rm src/components/Map/CountyPath.tsx
rm src/components/Map/CountyLabels.tsx
rm src/components/Map/BackgroundLandmasses.tsx
rm src/components/Map/ThreeBackground.tsx
rm src/hooks/useMapTransform.ts
rm src/hooks/useViewportSize.ts
rm src/lib/projection.ts
```

- [ ] **Step 4: Clean up any remaining imports**

Check for any files that import the deleted modules and remove those imports. Key files to check:
- `src/routes/index.tsx` — may reference `MapScaleContext` or `useMapTransform`
- Any other component that imported `useViewportSize` or `projection`

The `MapScaleContext` was used by `CountyLabels` (now deleted) and provided by `MapContainer` (now simplified). No other consumers should remain.

- [ ] **Step 5: Verify** — Run `npm run dev`. The full application should work:
  - Map renders fullscreen with water, terrain, county borders, and labels
  - Hover shows warm glow
  - Click selects county, flies to it, opens detail panel
  - Zoom buttons work
  - Resize adjusts aspect ratio cleanly without drift
  - Water extends to fill any viewport

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: complete Three.js unification — remove SVG layer, simplify MapView/MapContainer"
```

---

## Task 9: Panel Compensation and Final Polish

**Files:**
- Modify: `src/hooks/useThreeScene.ts` — add panel width offset to fly-to and camera

- [ ] **Step 1: Add panel compensation to fly-to**

When a county is selected and the detail panel opens on desktop, the camera should offset left so the county appears centered in the remaining viewport. Add a `panelOpen` prop to the hook options:

In the `UseThreeSceneOptions` interface, add:
```typescript
panelOpen: boolean
```

Add a ref to track it:
```typescript
const panelOpenRef = useRef(false)
```

Add an effect to sync:
```typescript
useEffect(() => {
  panelOpenRef.current = panelOpen
}, [panelOpen])
```

In the fly-to animation's `endCenter` calculation (inside handlePointerUp), offset the target:

```typescript
        if (feature) {
          const [lon, lat] = geoCentroid(feature)
          const [wx, wy] = geoToWorld(lon, lat)

          // Offset for panel: shift camera left by half the panel width in world units
          let panelOffsetWorld = 0
          if (typeof window !== 'undefined' && window.innerWidth >= 768) {
            const panelPx = window.innerWidth >= 1024 ? 400 : 320
            const pixelToWorld = (halfHRef.current * 2) / canvas.clientHeight
            panelOffsetWorld = (panelPx / 2) * pixelToWorld
          }

          const elapsed = clockRef.current?.getElapsedTime() ?? 0
          flyToAnimRef.current = {
            startCenter: [...centerRef.current] as [number, number],
            endCenter: [wx + panelOffsetWorld, wy],
            startHalfH: halfHRef.current,
            endHalfH: Math.min(halfHRef.current, 0.04),
            startTime: elapsed,
            duration: 0.6,
          }
        }
```

- [ ] **Step 2: Pass `panelOpen` from MapView**

In `MapView.tsx`, update the `useThreeScene` call to include `panelOpen`:

```typescript
  const { zoomIn, zoomOut, resetView } = useThreeScene({
    canvasRef,
    geoData,
    islandsData,
    counties,
    selectedId,
    panelOpen,
    onSelectCounty,
    onHoverCounty: setHoveredId,
  })
```

- [ ] **Step 3: Verify** — Select a county on desktop. The camera should offset so the county is centered in the area left of the detail panel.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useThreeScene.ts src/components/Map/MapView.tsx
git commit -m "feat: add panel compensation to fly-to camera animation"
```

---

## Task 10: Accessibility and Keyboard Navigation

**Files:**
- Modify: `src/hooks/useThreeScene.ts` — add keyboard handling for county navigation

The old SVG paths had `tabIndex`, `aria-label`, and keyboard handlers. With Three.js we can't make individual meshes focusable, but we can add keyboard navigation via the canvas.

- [ ] **Step 1: Add keyboard event handling**

In the main effect, after the pointer event listeners, add:

```typescript
    // --- Keyboard navigation ---
    let focusedCountyIndex = -1
    const countyIds = geoData.features.map((f) => f.properties.id)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault()
        if (e.shiftKey) {
          focusedCountyIndex = (focusedCountyIndex - 1 + countyIds.length) % countyIds.length
        } else {
          focusedCountyIndex = (focusedCountyIndex + 1) % countyIds.length
        }
        const id = countyIds[focusedCountyIndex]
        hoveredCountyId = id
        onHoverCounty(id)
        updateCountyMaterials()

        // Fly to focused county
        const feature = geoData.features[focusedCountyIndex]
        if (feature) {
          const [lon, lat] = geoCentroid(feature)
          const elapsed = clockRef.current?.getElapsedTime() ?? 0
          flyToAnimRef.current = {
            startCenter: [...centerRef.current] as [number, number],
            endCenter: geoToWorld(lon, lat),
            startHalfH: halfHRef.current,
            endHalfH: Math.min(halfHRef.current, 0.06),
            startTime: elapsed,
            duration: 0.4,
          }
        }
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        if (hoveredCountyId) {
          selectedIdRef.current = hoveredCountyId
          onSelectCounty(hoveredCountyId)
          updateCountyMaterials()
        }
      } else if (e.key === 'Escape') {
        hoveredCountyId = null
        focusedCountyIndex = -1
        onHoverCounty(null)
        updateCountyMaterials()
      }
    }

    canvas.setAttribute('tabindex', '0')
    canvas.setAttribute('role', 'application')
    canvas.setAttribute('aria-label', 'Interactive map of England counties')
    canvas.addEventListener('keydown', handleKeyDown)
```

Add cleanup:
```typescript
      canvas.removeEventListener('keydown', handleKeyDown)
```

- [ ] **Step 2: Verify** — Tab through counties. Each Tab should highlight the next county and fly to it. Enter/Space should select. Escape should clear.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useThreeScene.ts
git commit -m "feat: add keyboard navigation for county selection"
```

---

## Task 11: Final Verification

- [ ] **Step 1: Test resize** — Resize the browser window to various sizes (narrow, wide, square). The map should always be fullscreen with water extending to all edges. No skewing, no misalignment.

- [ ] **Step 2: Test zoom** — Zoom in and out with wheel, pinch (on mobile or simulator), and zoom buttons. Labels should fade in as you zoom into smaller counties. Labels should grow naturally with zoom.

- [ ] **Step 3: Test interactions** — Hover counties for glow, click for select + fly-to + panel. Verify on both desktop and mobile viewport sizes.

- [ ] **Step 4: Test mobile** — Use device simulator. Single finger drag should pan, pinch should zoom, tap should select.

- [ ] **Step 5: Check for console errors** — Open DevTools, check for any Three.js warnings, disposed texture errors, or React errors.

- [ ] **Step 6: Run type check and lint**

```bash
npx tsc --noEmit
npm run lint
```

Fix any issues.

- [ ] **Step 7: Final commit with any fixes**

```bash
git add -A
git commit -m "fix: resolve type/lint issues from Three.js unification"
```
