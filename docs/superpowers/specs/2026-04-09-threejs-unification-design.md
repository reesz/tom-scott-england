# Three.js Unification Design

**Date:** 2026-04-09
**Status:** Draft
**Supersedes:** Portions of `2026-04-09-graphics-overhaul-design.md` (SVG layer, component architecture sections)

## Problems Being Solved

1. **Resize breaks the map** — The SVG overlay uses `preserveAspectRatio="xMidYMid meet"` with a fixed 800x900 viewBox while Three.js maps to full viewport via `geoBounds`. On resize, these two coordinate systems drift apart, causing skewing and county/terrain mismatch.
2. **Not fullscreen on wide viewports** — The SVG's aspect-ratio-preserving scaling leaves gaps on viewports wider than 800:900.
3. **Labels become low-res on zoom** — SVG text doesn't scale cleanly with CSS transform-based zoom.

## Solution

Eliminate the dual-renderer architecture. Move county borders, fills, labels, and background landmasses from SVG into the existing Three.js scene. All map content shares one coordinate system (Mercator world space) and one camera. The water quad extends beyond the viewport so no cutoff is ever visible.

## Design Decisions

| Decision | Choice | Why |
|---|---|---|
| County geometry | `ShapeGeometry` from GeoJSON | Native Three.js, single coordinate system |
| Border rendering | `LineSegments` with `LineBasicMaterial` | Clean, performant, no extra dependencies |
| Labels | `Sprite` with `CanvasTexture` (serif font) | Scale naturally with zoom, high-res at 2x canvas |
| Hit detection | `Raycaster` on county fill meshes | 47 meshes is trivial, no spatial index needed |
| Pan/zoom | Orthographic camera manipulation | Replaces CSS transform approach, single source of truth |
| Hover/select effects | Emissive material + bloom post-processing | Warm glow aesthetic, leverages existing bloom pass |
| Water coverage | Oversized quad, repositioned with camera | User never sees an edge |

## Scene Graph

```
Three.js Scene (OrthographicCamera, top-down)
│
├── Water Plane (renderOrder: 0)
│   ├── Oversized quad (~3x viewport in world units)
│   ├── Repositions with camera so edges are never visible
│   └── Existing water shader (gradient, ripples, foam, sheen)
│
├── Terrain Plane (renderOrder: 1)
│   ├── Sized to DEM coverage bounds
│   └── Existing terrain shader (hypsometric color, hillshade, parallax)
│
├── Background Landmasses Group (renderOrder: 2)
│   ├── Scotland, Wales, Ireland, IoM as ShapeGeometry meshes
│   └── MeshBasicMaterial: rgba(180,170,155,0.3), no interaction
│
├── County Fills Group (renderOrder: 3)
│   ├── 47 ShapeGeometry meshes (one per county)
│   ├── Individual MeshStandardMaterial per county (transparent: true, depthWrite: false)
│   ├── Default: transparent fill
│   ├── Hover: warm parchment-gold tint (hsl 45,40%,70%) at ~0.12 opacity + emissive for bloom glow
│   ├── Selected: stronger tint (~0.18 opacity) + higher emissive intensity
│   └── Emissive transitions lerped over ~150ms in render loop
│
├── County Borders Group (renderOrder: 4)
│   ├── LineSegments per county
│   ├── Default stroke: rgba(60,50,40,0.4)
│   ├── Released counties: gold stroke rgba(180,150,60,0.6) with subtle emissive glow at rest
│   └── Hover: intensified glow on released, brightened stroke on all
│
├── Labels Group (renderOrder: 5)
│   ├── Sprite per county with CanvasTexture
│   ├── Serif font (Fraunces), subtle text shadow for readability
│   ├── Canvas rendered at 512px wide, 2x for retina
│   ├── Positioned at county centroid in world space
│   ├── Scale naturally with zoom (world-space sizing, no inverse scaling)
│   ├── Visibility: driven by county bounding box screen-space size vs minimum pixel threshold
│   └── Fade in/out by lerping sprite opacity
│
└── Post-Processing (EffectComposer)
    ├── Bloom (picks up emissive from hover/select/released glow)
    ├── Film grain
    └── Vignette
```

## Coordinate System

**World space = Mercator-projected geographic coordinates.**

GeoJSON lon/lat is projected through a Mercator formula to produce world-space X/Y. All geometry (counties, landmasses, labels) and both shader quads (water, terrain) live in this space. The orthographic camera frustum defines the visible slice.

### Projection

A simple Mercator projection function converts `[lon, lat]` → `[x, y]` in world units:
- `x = lon` (or scaled for aspect)
- `y = ln(tan(π/4 + lat/2))` (Mercator Y)

D3's `geoMercator` can still be used for centroid computation and the initial projection, but the output feeds Three.js geometry rather than SVG path strings.

### Shader UV Mapping

Terrain and water shaders sample textures based on UV coordinates derived from the camera frustum's world-space bounds. On each frame:
1. Read camera frustum corners in world coords
2. Map to DEM texture UV space (same `geoBoundsToDemUV` logic, but driven by camera instead of viewport+SVG)
3. Pass as `u_demUV` uniform

Water quad: UV is computed relative to the water quad's own geometry, which is repositioned each frame to stay centered on the camera. The shader always receives full-coverage UVs.

## Camera & Navigation

### Pan
- `pointerdown` + `pointermove`: compute delta in world coords (unproject pointer positions), shift camera position
- Clamping: UK must remain partially visible (camera center can't drift more than ~2 degrees beyond UK bounds)

### Zoom
- `wheel` / pinch gesture: scale camera frustum width and height
- Zoom toward pointer: the world-space point under the cursor stays fixed while frustum resizes around it
- Min zoom: full UK visible with padding
- Max zoom: roughly single-county level

### Fly-To
- On county select: lerp camera position toward county centroid, lerp frustum size toward a preset zoom level
- Easing: ease-in-out over ~600ms
- Parallax dampened during animation

### Resize
On `window.resize`:
1. `renderer.setSize(innerWidth, innerHeight)`
2. Adjust camera frustum horizontal extent for new aspect ratio, keep vertical extent and center unchanged
3. Reposition water quad to stay centered
4. Update composer size

No SVG recalculation, no geoBounds recomputation. The camera just shows a wider or narrower slice of the same world.

### Panel Compensation
When the detail panel opens on desktop (~320-400px on right), offset camera center leftward by half the panel width in world units. The selected county appears centered in the remaining viewport space.

## Interaction Flow

1. **Pointermove** → raycaster tests county fill meshes
   - Hit: set `canvas.style.cursor = 'pointer'`, lerp hovered county's emissive/opacity up
   - No hit: set cursor to `'default'` (or `'grab'` if panning), lerp previous hover out
2. **Pointerdown on county** → set selected county, trigger fly-to, dispatch to React state for detail panel
3. **Pointerdown on empty** + drag → pan (cursor: `'grabbing'`)
4. **Wheel / pinch** → zoom

React state management: `useThreeScene` communicates selected/hovered county ID back to React via a callback or ref. The detail panel, bottom sheet, and other HTML UI read from React state as before.

## What Gets Removed

| File | Reason |
|---|---|
| `CountySVG.tsx` | County geometry now in Three.js |
| `CountyPath.tsx` | Replaced by ShapeGeometry meshes |
| `CountyLabels.tsx` | Replaced by Sprite labels |
| `BackgroundLandmasses.tsx` | Replaced by Three.js ShapeGeometry |
| `useMapTransform.ts` | Camera replaces CSS transforms |
| `MapContainer.tsx` wrapping logic | Simplified — no longer applies CSS transform, just hosts canvas |
| `geoBounds` calculation in `MapView.tsx` | Camera frustum replaces this |
| `lib/projection.ts` D3 path generation | No longer needed for SVG `d` strings (keep if used for centroids) |

## What Gets Modified

| File | Changes |
|---|---|
| `useThreeScene.ts` | Becomes the entire map renderer: adds county geometry, labels, raycasting, camera controls, hover/select state |
| `MapView.tsx` | Simplified orchestrator — mounts canvas + HTML overlays, passes callbacks for selection |
| `MapContainer.tsx` | Simplified wrapper — no CSS transforms, just a container div |
| `terrain.frag.glsl` | UV sampling driven by camera frustum instead of `geoBounds` uniform (minor) |
| `water.frag.glsl` | Same UV change; water quad repositioning handled in JS |

## What Stays As-Is

- Detail panel (`DetailPanel`, `CountyDetail`)
- Bottom sheet (mobile)
- Map legend, map controls (zoom/reset buttons)
- Mobile list view
- County data hooks (`useCountyData`)
- Geo data hooks (`useGeoData`)
- Header component
- Water and terrain shader core logic (color, ripples, hillshade, parallax)

## Mobile Considerations

- Skip bloom post-processing pass
- DPR capped at 1
- Parallax disabled (no mouse on touch devices)
- Touch gestures: single-finger pan, pinch zoom, tap to select
- Same raycaster logic for tap detection

## Performance Notes

- 47 county meshes + 47 sprites + 2 fullscreen quads = lightweight scene
- Raycasting 47 flat meshes per pointermove is negligible
- Canvas textures for labels: ~47 × 512×128 × 4 bytes × 2 (retina) ≈ 25MB texture memory — acceptable
- ShapeGeometry from GeoJSON: one-time triangulation cost on init, cached thereafter
- No per-frame geometry updates; only uniform/material property changes
