import { useEffect, useRef } from 'react'
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
  MultiplyBlending,
  type Texture,
} from 'three'
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  BloomEffect,
  VignetteEffect,
  NoiseEffect,
} from 'postprocessing'
import terrainVertSrc from '#/shaders/terrain.vert.glsl'
import terrainFragSrc from '#/shaders/terrain.frag.glsl'
import waterVertSrc from '#/shaders/water.vert.glsl'
import waterFragSrc from '#/shaders/water.frag.glsl'
import paperFragSrc from '#/shaders/paper.frag.glsl'
import type { GeoBounds } from '#/components/Map/ThreeBackground'

// DEM bounding box (must match generate-dem-assets.py)
const DEM_LON_MIN = -11
const DEM_LON_MAX = 2
const DEM_LAT_MIN = 49
const DEM_LAT_MAX = 61

function latToMercY(lat: number): number {
  const rad = (lat * Math.PI) / 180
  return Math.log(Math.tan(Math.PI / 4 + rad / 2))
}

// Convert geographic bounds to DEM UV space (0-1)
// Returns [uMin, vMin, uMax, vMax]
// Three.js textures with flipY=true (default): v=0 is south, v=1 is north
// Screen v_uv: y=0 is bottom (south), y=1 is top (north)
// So shader does: demUV = mix(demUVMin, demUVMax, v_uv) — direct mapping
function geoBoundsToDemUV(bounds: GeoBounds): [number, number, number, number] {
  const demMercYMin = latToMercY(DEM_LAT_MIN) // south
  const demMercYMax = latToMercY(DEM_LAT_MAX) // north
  const demMercRange = demMercYMax - demMercYMin

  // Longitude → u (linear)
  const uMin = (bounds.lonMin - DEM_LON_MIN) / (DEM_LON_MAX - DEM_LON_MIN)
  const uMax = (bounds.lonMax - DEM_LON_MIN) / (DEM_LON_MAX - DEM_LON_MIN)

  // Latitude → v (Mercator)
  // v=0 maps to south (latMin), v=1 maps to north (latMax)
  const vMin = (latToMercY(bounds.latMin) - demMercYMin) / demMercRange
  const vMax = (latToMercY(bounds.latMax) - demMercYMin) / demMercRange

  return [uMin, vMin, uMax, vMax]
}

export function useThreeScene(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  geoBounds: GeoBounds | null,
) {
  const mouseRef = useRef(new Vector2(0.5, 0.5))
  const targetMouseRef = useRef(new Vector2(0.5, 0.5))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const isMobile = window.innerWidth < 768
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dpr = isMobile
      ? Math.min(window.devicePixelRatio, 1)
      : Math.min(window.devicePixelRatio, 2)

    // Compute DEM UV mapping from geographic bounds
    // Default: show full DEM if no bounds provided
    let demUV = new Vector4(0, 0, 1, 1)
    if (geoBounds) {
      const [uMin, vMin, uMax, vMax] = geoBoundsToDemUV(geoBounds)
      demUV = new Vector4(uMin, vMin, uMax, vMax)
    }

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
    const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 10)
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

    const geo = new PlaneGeometry(2, 2)
    const DEM_SIZE = 2048

    // --- Water Material ---
    const waterMaterial = new ShaderMaterial({
      vertexShader: waterVertSrc,
      fragmentShader: waterFragSrc,
      uniforms: {
        u_mask: { value: null },
        u_time: { value: 0 },
        u_resolution: { value: new Vector2(canvas.clientWidth, canvas.clientHeight) },
        u_demUV: { value: demUV },
      },
      transparent: true,
      depthWrite: false,
    })
    const waterMesh = new Mesh(geo, waterMaterial)
    waterMesh.renderOrder = 0
    scene.add(waterMesh)

    // --- Terrain Material ---
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
        u_demUV: { value: demUV },
      },
      transparent: true,
      depthWrite: false,
    })
    const terrainMesh = new Mesh(geo, terrainMaterial)
    terrainMesh.renderOrder = 1
    scene.add(terrainMesh)

    // --- Paper Overlay Material ---
    const paperMaterial = new ShaderMaterial({
      vertexShader: terrainVertSrc,
      fragmentShader: paperFragSrc,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new Vector2(canvas.clientWidth, canvas.clientHeight) },
      },
      transparent: true,
      depthWrite: false,
      blending: MultiplyBlending,
    })
    const paperMesh = new Mesh(geo, paperMaterial)
    paperMesh.renderOrder = 2
    scene.add(paperMesh)

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

    const noise = new NoiseEffect({ premultiply: true })
    const vignette = new VignetteEffect({
      offset: 0.4,
      darkness: 0.5,
    })
    composer.addPass(new EffectPass(camera, noise, vignette))

    // --- Load textures then start rendering ---
    const clock = new Clock()

    Promise.all([loadTex('/data/dem-heightmap.png'), loadTex('/data/land-mask.png')]).then(
      ([demTex, maskTex]) => {
        terrainMaterial.uniforms.u_dem.value = demTex
        terrainMaterial.uniforms.u_mask.value = maskTex
        waterMaterial.uniforms.u_mask.value = maskTex
      },
    )

    // --- Mouse tracking ---
    const handleMouse = (e: MouseEvent) => {
      targetMouseRef.current.set(e.clientX / window.innerWidth, e.clientY / window.innerHeight)
    }
    if (!isMobile) {
      window.addEventListener('mousemove', handleMouse)
    }

    // --- Render loop ---
    let animFrameId = 0

    const render = () => {
      const elapsed = prefersReducedMotion ? 0 : clock.getElapsedTime()

      // Smooth mouse lerp
      if (!prefersReducedMotion && !isMobile) {
        mouseRef.current.lerp(targetMouseRef.current, 0.05)
      }

      const mouse = mouseRef.current

      // Update uniforms
      terrainMaterial.uniforms.u_time.value = elapsed
      terrainMaterial.uniforms.u_mouse.value.set(mouse.x, mouse.y)
      waterMaterial.uniforms.u_time.value = elapsed
      paperMaterial.uniforms.u_time.value = elapsed

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
      paperMaterial.uniforms.u_resolution.value = res
    }
    window.addEventListener('resize', handleResize)

    // --- Cleanup ---
    return () => {
      cancelAnimationFrame(animFrameId)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouse)
      renderer.dispose()
      composer.dispose()
      geo.dispose()
      terrainMaterial.dispose()
      waterMaterial.dispose()
      paperMaterial.dispose()
    }
  }, [canvasRef, geoBounds])
}
