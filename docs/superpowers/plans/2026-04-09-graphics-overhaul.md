# Graphics Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the raw WebGL procedural background with a Three.js pipeline using real DEM terrain, stylized water shaders, full British Isles context, and post-processing for an awwwards-worthy 2.5D parallax map.

**Architecture:** Three.js scene with OrthographicCamera renders terrain (DEM heightmap + land mask), water, and paper overlay as fullscreen quads with custom GLSL shaders. Post-processing adds bloom, grain, and vignette. SVG overlay remains for county interactivity, with new background landmass paths for Scotland/Wales/Ireland.

**Tech Stack:** Three.js, postprocessing (pmndrs), custom GLSL shaders, D3-geo (existing), React 19, Vite 7

---

## File Map

### New Files
| File | Responsibility |
|---|---|
| `src/components/Map/ThreeBackground.tsx` | Three.js canvas component (replaces WebGLBackground) |
| `src/components/Map/BackgroundLandmasses.tsx` | SVG paths for Scotland, Wales, Ireland, IoM |
| `src/hooks/useThreeScene.ts` | Three.js scene lifecycle: renderer, camera, meshes, render loop, cleanup |
| `src/shaders/terrain.vert.glsl` | Fullscreen quad vertex shader with UV passthrough |
| `src/shaders/terrain.frag.glsl` | DEM sampling, hypsometric coloring, hillshade, parallax |
| `src/shaders/water.vert.glsl` | Fullscreen quad vertex shader |
| `src/shaders/water.frag.glsl` | Animated water with ripples, foam, depth gradient |
| `src/shaders/paper.frag.glsl` | Parchment grain + vignette overlay |
| `public/data/british-isles.geo.json` | Coastline polygons for non-England landmasses |
| `public/data/dem-heightmap.png` | Grayscale elevation data for British Isles |
| `public/data/land-mask.png` | Binary land/water mask aligned to DEM |
| `scripts/generate-dem-assets.py` | Script to download and process DEM + mask from public sources |

### Modified Files
| File | Changes |
|---|---|
| `package.json` | Add `three`, `postprocessing`, `@types/three` |
| `src/hooks/useGeoData.ts` | Add parallel fetch for `british-isles.geo.json`, export new type |
| `src/components/Map/CountySVG.tsx` | Integrate BackgroundLandmasses behind county paths |
| `src/components/Map/CountyPath.tsx` | Remove fill colors, stroke-only style, updated hover/selected states |
| `src/components/Map/CountyLabels.tsx` | Add text-shadow halo for legibility |
| `src/components/Map/MapView.tsx` | Swap WebGLBackground for ThreeBackground |

### Deleted Files
| File | Reason |
|---|---|
| `src/components/Map/WebGLBackground.tsx` | Replaced by ThreeBackground |
| `src/hooks/useWebGLCanvas.ts` | Replaced by useThreeScene |
| `src/shaders/background.frag.glsl` | Replaced by terrain/water/paper shaders |
| `src/shaders/fullscreen.vert.glsl` | Replaced by terrain.vert.glsl / water.vert.glsl |

---

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install three, postprocessing, and types**

```bash
cd /Users/reesz/Desktop/Fw/Projekte/tmp/tom-scott-county-series
pnpm add three postprocessing
pnpm add -D @types/three
```

- [ ] **Step 2: Verify installation**

```bash
pnpm ls three postprocessing
```

Expected: both packages listed with versions.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add three.js and postprocessing dependencies"
```

---

### Task 2: Source and Prepare DEM + Land Mask Assets

**Files:**
- Create: `scripts/generate-dem-assets.py`
- Create: `public/data/dem-heightmap.png`
- Create: `public/data/land-mask.png`

This task requires sourcing real elevation data and generating the two texture assets. The bounding box for the British Isles is approximately: west=-11, south=49, east=2, north=61.

- [ ] **Step 1: Write asset generation script**

Create `scripts/generate-dem-assets.py`. This script should:

1. Download ETOPO1 or SRTM data covering the British Isles bounding box (49N-61N, 11W-2E)
2. Resample to 2048x2048 equirectangular PNG
3. Normalize elevation: 0 (sea level) to 255 (max ~1345m), clamp negatives to 0
4. Output as grayscale PNG to `public/data/dem-heightmap.png`
5. Generate a land mask: white (255) where elevation > 0, black (0) for sea
6. Apply slight Gaussian blur (1-2px) to mask edges for smooth coastline transitions
7. Output mask to `public/data/land-mask.png`

Dependencies: `rasterio`, `numpy`, `Pillow`, `scipy` (for Gaussian blur). Use a publicly available DEM source — ETOPO1 from NOAA or a pre-cropped British Isles DEM.

If a suitable pre-made DEM PNG can be found online (e.g., from Mapzen terrain tiles or similar), download it directly instead of processing raw raster data. The key requirements are:
- Covers the full British Isles (GB + Ireland + surrounding islands)
- Grayscale, 2048x2048 or close
- Sea level = black, max elevation = white

```python
#!/usr/bin/env python3
"""
Generate DEM heightmap and land mask PNGs for the British Isles.

Bounding box: west=-11, south=49, east=2, north=61
Output: public/data/dem-heightmap.png (grayscale elevation)
        public/data/land-mask.png (binary land/water)

Requires: pip install numpy Pillow requests
Optional for raw raster: pip install rasterio scipy
"""

import numpy as np
from PIL import Image, ImageFilter
import requests
import io
import os

# --- Configuration ---
BBOX = {"west": -11, "south": 49, "east": 2, "north": 61}
OUTPUT_SIZE = 2048
DEM_OUTPUT = os.path.join(os.path.dirname(__file__), "..", "public", "data", "dem-heightmap.png")
MASK_OUTPUT = os.path.join(os.path.dirname(__file__), "..", "public", "data", "land-mask.png")

def fetch_terrain_tiles():
    """
    Fetch terrain-RGB tiles from Mapzen/AWS terrain tiles and decode to elevation.
    Uses zoom level 7 which gives ~1km resolution — sufficient for 2048px output.
    
    Terrain-RGB encoding: elevation = (R * 256 + G + B / 256) - 32768
    """
    from math import floor, log, tan, pi, cos
    
    zoom = 7
    
    def lat_lon_to_tile(lat, lon, zoom):
        n = 2 ** zoom
        x = int(floor((lon + 180.0) / 360.0 * n))
        y = int(floor((1.0 - log(tan(lat * pi / 180.0) + 1.0 / cos(lat * pi / 180.0)) / pi) / 2.0 * n))
        return x, y
    
    x_min, y_min = lat_lon_to_tile(BBOX["north"], BBOX["west"], zoom)
    x_max, y_max = lat_lon_to_tile(BBOX["south"], BBOX["east"], zoom)
    
    tile_size = 256
    width = (x_max - x_min + 1) * tile_size
    height = (y_max - y_min + 1) * tile_size
    
    elevation = np.zeros((height, width), dtype=np.float32)
    
    for ty in range(y_min, y_max + 1):
        for tx in range(x_min, x_max + 1):
            url = f"https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{zoom}/{tx}/{ty}.png"
            print(f"  Fetching tile {zoom}/{tx}/{ty}...")
            try:
                resp = requests.get(url, timeout=30)
                resp.raise_for_status()
                img = Image.open(io.BytesIO(resp.content))
                arr = np.array(img, dtype=np.float32)
                # Terrarium encoding: elevation = (R * 256 + G + B / 256) - 32768
                elev = (arr[:, :, 0] * 256.0 + arr[:, :, 1] + arr[:, :, 2] / 256.0) - 32768.0
                
                px = (tx - x_min) * tile_size
                py = (ty - y_min) * tile_size
                elevation[py:py + tile_size, px:px + tile_size] = elev
            except Exception as e:
                print(f"  Warning: failed to fetch tile {tx}/{ty}: {e}")
    
    return elevation, x_min, y_min, x_max, y_max

def main():
    print("Fetching terrain tiles...")
    elevation, x_min, y_min, x_max, y_max = fetch_terrain_tiles()
    
    print("Processing DEM heightmap...")
    # Clamp: sea level and below = 0
    elevation = np.clip(elevation, 0, None)
    # Normalize to 0-255 (max British Isles elevation ~1345m Ben Nevis)
    max_elev = max(np.max(elevation), 1345.0)
    normalized = (elevation / max_elev * 255.0).astype(np.uint8)
    
    # Resize to 2048x2048
    dem_img = Image.fromarray(normalized, mode='L')
    dem_img = dem_img.resize((OUTPUT_SIZE, OUTPUT_SIZE), Image.LANCZOS)
    
    os.makedirs(os.path.dirname(DEM_OUTPUT), exist_ok=True)
    dem_img.save(DEM_OUTPUT)
    print(f"  Saved DEM to {DEM_OUTPUT}")
    
    print("Generating land mask...")
    # Land = where elevation > 0 (after clipping, anything > 0 is land)
    mask_arr = np.array(dem_img)
    land_mask = np.where(mask_arr > 0, 255, 0).astype(np.uint8)
    mask_img = Image.fromarray(land_mask, mode='L')
    # Slight blur for smooth coastline edges
    mask_img = mask_img.filter(ImageFilter.GaussianBlur(radius=2))
    mask_img.save(MASK_OUTPUT)
    print(f"  Saved land mask to {MASK_OUTPUT}")
    
    print("Done!")

if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run the script**

```bash
cd /Users/reesz/Desktop/Fw/Projekte/tmp/tom-scott-county-series
pip install numpy Pillow requests
python scripts/generate-dem-assets.py
```

Expected: Two files created:
- `public/data/dem-heightmap.png` (grayscale, 2048x2048, ~1-2MB)
- `public/data/land-mask.png` (near-binary with soft edges, 2048x2048, ~200KB)

- [ ] **Step 3: Verify assets visually**

Open both PNGs. The DEM should show bright spots in the Scottish Highlands, Pennines, Lake District, and Snowdonia. The mask should clearly show the British Isles outline with all islands.

If the tiles don't work (S3 endpoint changes, etc.), alternative approach: download a pre-made British Isles DEM from a GIS data source and convert manually with Pillow.

- [ ] **Step 4: Commit**

```bash
git add scripts/generate-dem-assets.py public/data/dem-heightmap.png public/data/land-mask.png
git commit -m "feat: add DEM heightmap and land mask assets for British Isles"
```

---

### Task 3: Source British Isles GeoJSON

**Files:**
- Create: `public/data/british-isles.geo.json`

- [ ] **Step 1: Download and prepare the GeoJSON**

Source a simplified coastline GeoJSON for the full British Isles from Natural Earth (ne_50m_admin_0_countries or ne_110m_land). We need polygons for:
- Great Britain (as a single shape, not split by country — or Scotland + Wales + England as one merged polygon)
- Ireland (Republic + Northern Ireland as one shape)
- Isle of Man

Filter to just these features. Simplify geometry to keep the file under 500KB. The features need `id` and `name` properties.

Use ogr2ogr, mapshaper.org, or a Node script to process. Example with mapshaper:

```bash
# If using mapshaper CLI:
npx mapshaper ne_50m_admin_0_countries.shp \
  -filter "NAME == 'United Kingdom' || NAME == 'Ireland' || NAME == 'Isle of Man'" \
  -simplify 15% \
  -o format=geojson public/data/british-isles.geo.json
```

Alternatively, download from a GeoJSON source like geojson.io or Natural Earth's GeoJSON exports, and manually trim in a text editor.

The output format should be:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": { "id": "great-britain", "name": "Great Britain" },
      "geometry": { "type": "MultiPolygon", "coordinates": [...] }
    },
    {
      "type": "Feature",
      "properties": { "id": "ireland", "name": "Ireland" },
      "geometry": { "type": "Polygon", "coordinates": [...] }
    },
    {
      "type": "Feature",
      "properties": { "id": "isle-of-man", "name": "Isle of Man" },
      "geometry": { "type": "Polygon", "coordinates": [...] }
    }
  ]
}
```

- [ ] **Step 2: Verify the GeoJSON**

Open in geojson.io or similar to confirm outlines look correct and include all major islands (Hebrides, Orkney, Shetland, Anglesey, Isle of Wight, Channel Islands).

- [ ] **Step 3: Commit**

```bash
git add public/data/british-isles.geo.json
git commit -m "feat: add British Isles coastline GeoJSON"
```

---

### Task 4: Write Terrain Shaders

**Files:**
- Create: `src/shaders/terrain.vert.glsl`
- Create: `src/shaders/terrain.frag.glsl`

- [ ] **Step 1: Write the vertex shader**

Create `src/shaders/terrain.vert.glsl`:

```glsl
varying vec2 v_uv;

void main() {
  v_uv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

This uses Three.js built-in attributes (`position`, `uv`) and uniforms (`projectionMatrix`, `modelViewMatrix`).

- [ ] **Step 2: Write the fragment shader**

Create `src/shaders/terrain.frag.glsl`:

```glsl
precision highp float;

varying vec2 v_uv;

uniform sampler2D u_dem;
uniform sampler2D u_mask;
uniform vec2 u_mouse;
uniform float u_time;
uniform vec2 u_resolution;

// --- Noise for micro-detail ---
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                      -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                            + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
                           dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// --- Hypsometric color scale ---
vec3 terrainColor(float h) {
  // 0m: #4a7c59 rich green
  vec3 c0 = vec3(0.290, 0.486, 0.349);
  // 50m: #6b9e5a mid green
  vec3 c1 = vec3(0.420, 0.620, 0.353);
  // 150m: #a8c36a light green-yellow
  vec3 c2 = vec3(0.659, 0.765, 0.416);
  // 300m: #c4a855 tan/buff
  vec3 c3 = vec3(0.769, 0.659, 0.333);
  // 500m: #a07040 warm brown
  vec3 c4 = vec3(0.627, 0.439, 0.251);
  // 800m+: #7a5060 purple-brown
  vec3 c5 = vec3(0.478, 0.314, 0.376);
  // Peaks: light grey
  vec3 c6 = vec3(0.85, 0.82, 0.80);

  // Elevation stops normalized to 0-1 (max ~1345m)
  // 50/1345=0.037, 150/1345=0.112, 300/1345=0.223, 500/1345=0.372, 800/1345=0.595
  if (h < 0.037) return mix(c0, c1, h / 0.037);
  if (h < 0.112) return mix(c1, c2, (h - 0.037) / 0.075);
  if (h < 0.223) return mix(c2, c3, (h - 0.112) / 0.111);
  if (h < 0.372) return mix(c3, c4, (h - 0.223) / 0.149);
  if (h < 0.595) return mix(c4, c5, (h - 0.372) / 0.223);
  return mix(c5, c6, (h - 0.595) / 0.405);
}

// --- Hillshade ---
float hillshade(vec2 uv, vec2 texelSize) {
  float hL = texture2D(u_dem, uv - vec2(texelSize.x, 0.0)).r;
  float hR = texture2D(u_dem, uv + vec2(texelSize.x, 0.0)).r;
  float hD = texture2D(u_dem, uv - vec2(0.0, texelSize.y)).r;
  float hU = texture2D(u_dem, uv + vec2(0.0, texelSize.y)).r;

  vec3 normal = normalize(vec3(
    (hL - hR) * 4.0,
    (hD - hU) * 4.0,
    1.0
  ));

  // NW light, azimuth 315, altitude 45
  vec3 lightDir = normalize(vec3(-0.5, 0.5, 0.707));
  float shade = dot(normal, lightDir);

  // Ambient floor of 0.35
  return mix(0.35, 1.1, shade * 0.5 + 0.5);
}

void main() {
  // Parallax offset based on mouse + elevation
  vec2 mouseOffset = (u_mouse - 0.5) * 2.0;
  float elevation = texture2D(u_dem, v_uv).r;
  float landMask = texture2D(u_mask, v_uv).r;

  // Higher terrain shifts more for parallax depth
  vec2 parallax = mouseOffset * elevation * 0.015;
  vec2 uv = v_uv + parallax;

  // Re-sample with parallax-offset UV
  float h = texture2D(u_dem, uv).r;
  float mask = texture2D(u_mask, uv).r;

  // Terrain color
  vec3 color = terrainColor(h);

  // Hillshade lighting
  vec2 texelSize = 1.0 / vec2(textureSize(u_dem, 0));
  float shade = hillshade(uv, texelSize);
  color *= shade;

  // Subtle noise detail overlay
  float detail = snoise(uv * 60.0) * 0.02;
  color += detail;

  // Apply land mask: alpha = 0 over water
  float alpha = smoothstep(0.1, 0.5, mask);
  gl_FragColor = vec4(color, alpha);
}
```

Note: `textureSize` requires GLSL 300 es or a WebGL2 context. Since Three.js uses WebGL2 by default, this is fine. If we need WebGL1 fallback, we'd pass texel size as a uniform instead.

- [ ] **Step 3: Verify shaders compile (will be tested fully in Task 7)**

At this point, just confirm the files are saved with correct syntax. Full compilation testing happens when the Three.js scene is wired up.

- [ ] **Step 4: Commit**

```bash
git add src/shaders/terrain.vert.glsl src/shaders/terrain.frag.glsl
git commit -m "feat: add terrain vertex and fragment shaders with DEM sampling"
```

---

### Task 5: Write Water Shader

**Files:**
- Create: `src/shaders/water.vert.glsl`
- Create: `src/shaders/water.frag.glsl`

- [ ] **Step 1: Write the water vertex shader**

Create `src/shaders/water.vert.glsl`:

```glsl
varying vec2 v_uv;

void main() {
  v_uv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

- [ ] **Step 2: Write the water fragment shader**

Create `src/shaders/water.frag.glsl`:

```glsl
precision highp float;

varying vec2 v_uv;

uniform sampler2D u_mask;
uniform float u_time;
uniform vec2 u_resolution;

// --- Noise ---
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                      -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                            + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
                           dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 p, int octaves) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 6; i++) {
    if (i >= octaves) break;
    value += amplitude * snoise(p);
    p *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  float mask = texture2D(u_mask, v_uv).r;

  // Water only where mask < 0.5 (ocean)
  float waterAlpha = smoothstep(0.5, 0.1, mask);
  if (waterAlpha < 0.01) discard;

  // Distance from nearest land for depth gradient
  // Approximate: mask value near coast is between 0.1-0.5 due to blur
  float coastDist = 1.0 - smoothstep(0.0, 0.4, mask);

  // Water colors
  vec3 coastColor = vec3(0.537, 0.722, 0.769); // #89b8c4
  vec3 midColor   = vec3(0.290, 0.478, 0.541); // #4a7a8a
  vec3 deepColor  = vec3(0.165, 0.290, 0.353); // #2a4a5a

  // Depth gradient
  vec3 baseColor = mix(coastColor, midColor, smoothstep(0.0, 0.5, coastDist));
  baseColor = mix(baseColor, deepColor, smoothstep(0.5, 1.0, coastDist));

  // Animated ripples - multi-octave
  float ripple1 = snoise(v_uv * 20.0 + vec2(u_time * 0.04, u_time * 0.02)) * 0.5 + 0.5;
  float ripple2 = snoise(v_uv * 35.0 - vec2(u_time * 0.06, u_time * 0.015)) * 0.5 + 0.5;
  float ripple3 = snoise(v_uv * 50.0 + vec2(u_time * 0.03, -u_time * 0.04)) * 0.5 + 0.5;
  float ripples = ripple1 * 0.5 + ripple2 * 0.3 + ripple3 * 0.2;

  // Ripple influence on color (subtle brightness variation)
  baseColor += ripples * 0.04;

  // Fresnel-like sheen on ripple peaks
  float sheen = smoothstep(0.65, 0.85, ripples);
  baseColor += sheen * 0.08;

  // Shore foam — bright fringe near land
  float foamZone = smoothstep(0.4, 0.15, mask) * smoothstep(0.0, 0.1, mask);
  float foamNoise = snoise(v_uv * 80.0 + vec2(u_time * 0.1, 0.0)) * 0.5 + 0.5;
  float foamPulse = sin(u_time * 1.5) * 0.3 + 0.7;
  float foam = foamZone * smoothstep(0.3, 0.7, foamNoise) * foamPulse;
  baseColor = mix(baseColor, vec3(1.0), foam * 0.3);

  gl_FragColor = vec4(baseColor, waterAlpha);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/shaders/water.vert.glsl src/shaders/water.frag.glsl
git commit -m "feat: add water shaders with ripples, depth gradient, and shore foam"
```

---

### Task 6: Write Paper Overlay Shader

**Files:**
- Create: `src/shaders/paper.frag.glsl`

- [ ] **Step 1: Write the paper fragment shader**

Create `src/shaders/paper.frag.glsl` — extracted and simplified from the old `background.frag.glsl`:

```glsl
precision highp float;

varying vec2 v_uv;

uniform float u_time;
uniform vec2 u_resolution;

// Noise
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                      -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                            + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
                           dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 p, int octaves) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 5; i++) {
    if (i >= octaves) break;
    value += amplitude * snoise(p);
    p *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  // Parchment grain
  float grain = fbm(v_uv * 40.0 + u_time * 0.01, 4) * 0.06;

  // Vignette
  vec2 vigUV = v_uv * 2.0 - 1.0;
  float vignette = 1.0 - dot(vigUV * 0.6, vigUV * 0.6);
  vignette = smoothstep(0.0, 1.0, vignette);

  // Warm parchment tint for multiply blend
  vec3 tint = vec3(0.96, 0.93, 0.85);
  tint += grain;
  tint *= mix(0.85, 1.0, vignette);

  // Low opacity multiply overlay
  gl_FragColor = vec4(tint, 0.08);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/shaders/paper.frag.glsl
git commit -m "feat: add paper overlay shader with grain and vignette"
```

---

### Task 7: Build useThreeScene Hook

**Files:**
- Create: `src/hooks/useThreeScene.ts`

This is the core integration. It creates the Three.js renderer, loads textures, creates meshes with the custom shaders, sets up post-processing, and runs the render loop.

- [ ] **Step 1: Create the hook**

Create `src/hooks/useThreeScene.ts`:

```typescript
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
  Clock,
  Vector2,
  type Texture,
} from 'three'
import { EffectComposer, RenderPass, EffectPass, BloomEffect, VignetteEffect, NoiseEffect } from 'postprocessing'
import terrainVertSrc from '#/shaders/terrain.vert.glsl'
import terrainFragSrc from '#/shaders/terrain.frag.glsl'
import waterVertSrc from '#/shaders/water.vert.glsl'
import waterFragSrc from '#/shaders/water.frag.glsl'
import paperFragSrc from '#/shaders/paper.frag.glsl'

interface ThreeSceneState {
  renderer: WebGLRenderer
  composer: EffectComposer
  clock: Clock
  terrainMaterial: ShaderMaterial
  waterMaterial: ShaderMaterial
  paperMaterial: ShaderMaterial
  animFrameId: number
}

export function useThreeScene(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const mouseRef = useRef(new Vector2(0.5, 0.5))
  const targetMouseRef = useRef(new Vector2(0.5, 0.5))
  const stateRef = useRef<ThreeSceneState | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const isMobile = window.innerWidth < 768
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dpr = isMobile ? Math.min(window.devicePixelRatio, 1) : Math.min(window.devicePixelRatio, 2)

    // --- Renderer ---
    const renderer = new WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(dpr)
    renderer.setSize(canvas.clientWidth, canvas.clientHeight)
    renderer.autoClear = false

    // --- Scene & Camera ---
    const scene = new Scene()
    const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 10)
    camera.position.z = 5

    // --- Load Textures ---
    const loader = new TextureLoader()
    const loadTex = (url: string): Promise<Texture> =>
      new Promise((resolve, reject) => {
        loader.load(url, (tex) => {
          tex.minFilter = LinearFilter
          tex.magFilter = LinearFilter
          resolve(tex)
        }, undefined, reject)
      })

    const geo = new PlaneGeometry(2, 2)

    // --- Water Material ---
    const waterMaterial = new ShaderMaterial({
      vertexShader: waterVertSrc,
      fragmentShader: waterFragSrc,
      uniforms: {
        u_mask: { value: null },
        u_time: { value: 0 },
        u_resolution: { value: new Vector2(canvas.clientWidth, canvas.clientHeight) },
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
      },
      transparent: true,
      depthWrite: false,
    })
    const terrainMesh = new Mesh(geo, terrainMaterial)
    terrainMesh.renderOrder = 1
    scene.add(terrainMesh)

    // --- Paper Overlay Material ---
    const paperMaterial = new ShaderMaterial({
      vertexShader: terrainVertSrc, // reuse same passthrough vertex shader
      fragmentShader: paperFragSrc,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new Vector2(canvas.clientWidth, canvas.clientHeight) },
      },
      transparent: true,
      depthWrite: false,
      blending: 2, // MultiplyBlending
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
    // @ts-expect-error - blendMode opacity access varies by version
    if (noise.blendMode?.opacity) noise.blendMode.opacity.value = 0.03

    const vignette = new VignetteEffect({
      offset: 0.4,
      darkness: 0.5,
    })
    composer.addPass(new EffectPass(camera, noise, vignette))

    // --- Load textures then start rendering ---
    const clock = new Clock()

    Promise.all([
      loadTex('/data/dem-heightmap.png'),
      loadTex('/data/land-mask.png'),
    ]).then(([demTex, maskTex]) => {
      terrainMaterial.uniforms.u_dem.value = demTex
      terrainMaterial.uniforms.u_mask.value = maskTex
      waterMaterial.uniforms.u_mask.value = maskTex
    })

    // --- Mouse tracking ---
    const handleMouse = (e: MouseEvent) => {
      targetMouseRef.current.set(
        e.clientX / window.innerWidth,
        e.clientY / window.innerHeight
      )
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

    stateRef.current = {
      renderer,
      composer,
      clock,
      terrainMaterial,
      waterMaterial,
      paperMaterial,
      animFrameId,
    }

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
  }, [canvasRef])
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useThreeScene.ts
git commit -m "feat: add useThreeScene hook with Three.js renderer, post-processing"
```

---

### Task 8: Create ThreeBackground Component and Wire Up

**Files:**
- Create: `src/components/Map/ThreeBackground.tsx`
- Modify: `src/components/Map/MapView.tsx:6,66`

- [ ] **Step 1: Create ThreeBackground component**

Create `src/components/Map/ThreeBackground.tsx`:

```tsx
import { useRef } from 'react'
import { useThreeScene } from '#/hooks/useThreeScene'

export function ThreeBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useThreeScene(canvasRef)

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ zIndex: 0 }}
    />
  )
}
```

- [ ] **Step 2: Update MapView to use ThreeBackground**

In `src/components/Map/MapView.tsx`, change the import and usage:

Replace:
```typescript
import { WebGLBackground } from './WebGLBackground'
```
With:
```typescript
import { ThreeBackground } from './ThreeBackground'
```

Replace:
```tsx
        <WebGLBackground />
```
With:
```tsx
        <ThreeBackground />
```

- [ ] **Step 3: Run dev server and verify rendering**

```bash
pnpm dev
```

Open http://localhost:3000. You should see:
- Water shader rendering in the ocean areas
- Terrain with DEM-based relief and hypsometric colors on land
- Paper grain overlay on top
- Parallax effect when moving the mouse
- County SVG paths still visible on top

If textures haven't loaded yet (Task 2 not complete), the scene will render but terrain/water will be blank until texture uniforms are populated.

- [ ] **Step 4: Commit**

```bash
git add src/components/Map/ThreeBackground.tsx src/components/Map/MapView.tsx
git commit -m "feat: replace WebGLBackground with ThreeBackground using Three.js"
```

---

### Task 9: Update useGeoData to Load British Isles GeoJSON

**Files:**
- Modify: `src/hooks/useGeoData.ts`

- [ ] **Step 1: Add British Isles data loading**

Replace the full content of `src/hooks/useGeoData.ts`:

```typescript
import { useEffect, useState } from 'react'
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson'

export interface CountyFeatureProperties {
  id: string
  name: string
}

export type CountyFeature = GeoJSON.Feature<Polygon | MultiPolygon, CountyFeatureProperties>
export type CountyFeatureCollection = FeatureCollection<Polygon | MultiPolygon, CountyFeatureProperties>

export interface IslandFeatureProperties {
  id: string
  name: string
}

export type IslandFeatureCollection = FeatureCollection<Polygon | MultiPolygon, IslandFeatureProperties>

export function useGeoData() {
  const [geoData, setGeoData] = useState<CountyFeatureCollection | null>(null)
  const [islandsData, setIslandsData] = useState<IslandFeatureCollection | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/data/england-counties.geo.json').then((res) => {
        if (!res.ok) throw new Error(`Failed to load counties GeoJSON: ${res.status}`)
        return res.json() as Promise<CountyFeatureCollection>
      }),
      fetch('/data/british-isles.geo.json').then((res) => {
        if (!res.ok) throw new Error(`Failed to load British Isles GeoJSON: ${res.status}`)
        return res.json() as Promise<IslandFeatureCollection>
      }),
    ])
      .then(([counties, islands]) => {
        setGeoData(counties)
        setIslandsData(islands)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  return { geoData, islandsData, loading, error }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useGeoData.ts
git commit -m "feat: load British Isles GeoJSON alongside county data"
```

---

### Task 10: Create BackgroundLandmasses Component

**Files:**
- Create: `src/components/Map/BackgroundLandmasses.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/Map/BackgroundLandmasses.tsx`:

```tsx
import type { GeoPath, GeoPermissibleObjects } from 'd3-geo'
import type { IslandFeatureCollection } from '#/hooks/useGeoData'

interface BackgroundLandmassesProps {
  islandsData: IslandFeatureCollection
  pathGenerator: GeoPath<unknown, GeoPermissibleObjects>
}

export function BackgroundLandmasses({ islandsData, pathGenerator }: BackgroundLandmassesProps) {
  return (
    <g>
      {islandsData.features.map((feature) => {
        const d = pathGenerator(feature)
        if (!d) return null
        return (
          <path
            key={feature.properties.id}
            d={d}
            fill="rgba(180, 170, 155, 0.3)"
            stroke="rgba(90, 74, 58, 0.1)"
            strokeWidth={0.5}
            className="pointer-events-none"
          />
        )
      })}
    </g>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Map/BackgroundLandmasses.tsx
git commit -m "feat: add BackgroundLandmasses component for non-England landmasses"
```

---

### Task 11: Integrate BackgroundLandmasses into CountySVG

**Files:**
- Modify: `src/components/Map/CountySVG.tsx`
- Modify: `src/components/Map/MapView.tsx`

- [ ] **Step 1: Update CountySVG to accept and render islands data**

Replace the full content of `src/components/Map/CountySVG.tsx`:

```tsx
import type { GeoPath, GeoPermissibleObjects } from 'd3-geo'
import type { County } from '#/types/county'
import type { CountyFeatureCollection, IslandFeatureCollection } from '#/hooks/useGeoData'
import { CountyPath } from './CountyPath'
import { BackgroundLandmasses } from './BackgroundLandmasses'

interface CountySVGProps {
  geoData: CountyFeatureCollection
  islandsData: IslandFeatureCollection | null
  pathGenerator: GeoPath<unknown, GeoPermissibleObjects>
  counties: County[]
  selectedId: string | null
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
  width: number
  height: number
}

export function CountySVG({
  geoData,
  islandsData,
  pathGenerator,
  counties,
  selectedId,
  onSelect,
  onHover,
  width,
  height,
}: CountySVGProps) {
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="absolute inset-0 h-full w-full"
      style={{ zIndex: 1 }}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Background landmasses (Scotland, Wales, Ireland) behind county paths */}
      {islandsData && (
        <BackgroundLandmasses islandsData={islandsData} pathGenerator={pathGenerator} />
      )}

      {/* England county paths */}
      {geoData.features.map((feature) => {
        const d = pathGenerator(feature)
        if (!d) return null
        const county = counties.find((c) => c.id === feature.properties.id)
        return (
          <CountyPath
            key={feature.properties.id}
            d={d}
            county={county}
            featureId={feature.properties.id}
            featureName={feature.properties.name}
            onSelect={onSelect}
            onHover={onHover}
            isSelected={selectedId === feature.properties.id}
          />
        )
      })}
    </svg>
  )
}
```

- [ ] **Step 2: Update MapView to pass islandsData**

In `src/components/Map/MapView.tsx`, update the `useGeoData` destructuring and `CountySVG` props.

Replace:
```typescript
  const { geoData, loading: geoLoading } = useGeoData()
```
With:
```typescript
  const { geoData, islandsData, loading: geoLoading } = useGeoData()
```

Replace:
```tsx
        <CountySVG
          geoData={geoData}
          pathGenerator={pathGenerator}
          counties={counties}
          selectedId={selectedId}
          onSelect={onSelectCounty}
          onHover={setHoveredId}
          width={width}
          height={height}
        />
```
With:
```tsx
        <CountySVG
          geoData={geoData}
          islandsData={islandsData}
          pathGenerator={pathGenerator}
          counties={counties}
          selectedId={selectedId}
          onSelect={onSelectCounty}
          onHover={setHoveredId}
          width={width}
          height={height}
        />
```

- [ ] **Step 3: Verify in browser**

```bash
pnpm dev
```

Scotland, Wales, Ireland should appear as muted grey shapes behind the England county paths. The projection should include them since `fitProjectionToFeatures` uses the England counties bounding box — the islands GeoJSON uses the same projection so they'll extend beyond the viewport edges (which is fine, they provide geographic context).

Note: if the islands are too far outside the viewport, we may need to adjust the projection to fit a combined bounding box. Check and adjust in `MapView.tsx` if needed.

- [ ] **Step 4: Commit**

```bash
git add src/components/Map/CountySVG.tsx src/components/Map/MapView.tsx
git commit -m "feat: integrate British Isles landmasses behind county paths"
```

---

### Task 12: Restyle CountyPath for Stroke-Only Design

**Files:**
- Modify: `src/components/Map/CountyPath.tsx`

- [ ] **Step 1: Update CountyPath styling**

Replace the full content of `src/components/Map/CountyPath.tsx`:

```tsx
import { useState, useCallback } from 'react'
import type { County } from '#/types/county'

interface CountyPathProps {
  d: string
  county: County | undefined
  featureId: string
  featureName: string
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
  isSelected: boolean
}

export function CountyPath({
  d,
  county,
  featureId,
  featureName,
  onSelect,
  onHover,
  isSelected,
}: CountyPathProps) {
  const [isHovered, setIsHovered] = useState(false)
  const prefersReducedMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const isReleased = county?.status === 'released'
  const isUpcoming = county?.status === 'upcoming'

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true)
    onHover(featureId)
  }, [featureId, onHover])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
    onHover(null)
  }, [onHover])

  const handleClick = useCallback(() => {
    onSelect(featureId)
  }, [featureId, onSelect])

  // Transparent fills — terrain shows through
  let fill = 'transparent'
  if (isHovered) fill = 'rgba(255, 255, 255, 0.15)'
  if (isSelected) fill = 'rgba(255, 255, 255, 0.2)'

  // Stroke styling — released gets gold accent
  let strokeColor = 'rgba(60, 50, 40, 0.4)'
  let strokeWidth = 0.8
  if (isReleased) strokeColor = 'rgba(180, 150, 60, 0.6)'
  if (isHovered || isSelected) {
    strokeColor = isReleased ? 'rgba(200, 170, 60, 0.9)' : 'rgba(60, 50, 40, 0.8)'
    strokeWidth = 1.4
  }

  const transition = prefersReducedMotion
    ? 'none'
    : 'fill 0.15s ease-in, stroke 0.15s ease-in, stroke-width 0.15s ease-in'

  return (
    <path
      d={d}
      fill={fill}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
      className="cursor-pointer"
      style={{ transition }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`${featureName}${isReleased ? ' — video available' : isUpcoming ? ' — coming soon' : ''}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick() }}
    />
  )
}
```

Key changes from the original:
- Removed all fill colors (green, hatch pattern)
- Fills are now transparent by default, light white on hover/select
- Removed the `<defs>` hatch pattern reference (the pattern definition in CountySVG can also be removed)
- Released counties have a gold-tinted stroke
- Simplified transition (removed dash animation)

- [ ] **Step 2: Remove hatch pattern definition from CountySVG**

In `src/components/Map/CountySVG.tsx`, remove the `<defs>` block since hatch patterns are no longer used:

Remove:
```tsx
      <defs>
        <pattern id="hatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(90, 74, 58, 0.15)" strokeWidth="1" />
        </pattern>
      </defs>
```

(This block was already removed in the Task 11 rewrite. Confirm it's not present.)

- [ ] **Step 3: Commit**

```bash
git add src/components/Map/CountyPath.tsx src/components/Map/CountySVG.tsx
git commit -m "feat: restyle county paths to stroke-only with gold accent for released"
```

---

### Task 13: Add Text Halo to County Labels

**Files:**
- Modify: `src/components/Map/CountyLabels.tsx`

- [ ] **Step 1: Add text-shadow halo**

Replace the `style` prop on the `<text>` element in `src/components/Map/CountyLabels.tsx:37-42`:

Replace:
```typescript
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: '5px',
              fill: 'rgba(90, 74, 58, 0.7)',
              letterSpacing: '0.05em',
            }}
```
With:
```typescript
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: '5px',
              fill: 'rgba(60, 50, 40, 0.85)',
              letterSpacing: '0.05em',
              paintOrder: 'stroke',
              stroke: 'rgba(255, 255, 255, 0.6)',
              strokeWidth: '1.5px',
              strokeLinejoin: 'round',
            }}
```

This uses `paintOrder: 'stroke'` to render the stroke behind the fill, creating a white halo effect that improves legibility over the terrain without using `<filter>` elements (which are expensive in SVG).

- [ ] **Step 2: Commit**

```bash
git add src/components/Map/CountyLabels.tsx
git commit -m "feat: add white text halo to county labels for terrain legibility"
```

---

### Task 14: Delete Old WebGL Files

**Files:**
- Delete: `src/components/Map/WebGLBackground.tsx`
- Delete: `src/hooks/useWebGLCanvas.ts`
- Delete: `src/shaders/background.frag.glsl`
- Delete: `src/shaders/fullscreen.vert.glsl`

- [ ] **Step 1: Verify no remaining imports reference these files**

```bash
cd /Users/reesz/Desktop/Fw/Projekte/tmp/tom-scott-county-series
grep -r "WebGLBackground\|useWebGLCanvas\|background\.frag\|fullscreen\.vert" src/ --include="*.ts" --include="*.tsx" -l
```

Expected: no files listed (imports were already updated in Task 8).

- [ ] **Step 2: Delete the files**

```bash
rm src/components/Map/WebGLBackground.tsx
rm src/hooks/useWebGLCanvas.ts
rm src/shaders/background.frag.glsl
rm src/shaders/fullscreen.vert.glsl
```

- [ ] **Step 3: Verify build**

```bash
pnpm build
```

Expected: build succeeds with no errors referencing deleted files.

- [ ] **Step 4: Commit**

```bash
git add -u
git commit -m "chore: remove old WebGL background files replaced by Three.js"
```

---

### Task 15: Visual Tuning and Bug Fixes

**Files:**
- Potentially modify: any shader or component file

This is a catch-all task for visual polish after everything is wired up. Run the dev server and iterate on:

- [ ] **Step 1: Verify DEM alignment**

Open the app. The terrain colors should align with the land mask and the SVG county outlines. If there's misalignment between the Three.js canvas and the SVG overlay, the issue is likely the UV coordinate space. The Three.js quad covers the full viewport while the SVG uses a viewBox of `0 0 800 900`. Verify that both layers line up visually.

If misaligned: adjust the Three.js camera or plane dimensions to match the SVG's aspect ratio. The OrthographicCamera should use the same aspect ratio as the SVG viewBox.

- [ ] **Step 2: Tune hypsometric colors**

Compare the terrain coloring to the reference image. Adjust color stops in `terrain.frag.glsl` if needed. The greens should be rich and saturated for lowlands, transitioning to warm brown/tan for highlands.

- [ ] **Step 3: Tune water**

Check that:
- Shore foam appears as a soft white fringe along coastlines
- Ripples are subtle, not noisy
- Depth gradient transitions smoothly from coast to deep ocean
- No harsh edges between water and land (the blurred mask should handle this)

- [ ] **Step 4: Tune post-processing**

Bloom should be barely perceptible — just a soft glow on bright spots. Grain should be very subtle. Vignette should darken the edges gently. Adjust values in `useThreeScene.ts` if any effect is too strong.

- [ ] **Step 5: Test parallax**

Move the mouse around. Mountains should shift more than lowlands. The effect should be smooth (lerped), not jittery. If the parallax amount feels wrong, adjust the `0.015` multiplier in `terrain.frag.glsl`.

- [ ] **Step 6: Test mobile**

Resize to mobile viewport or use device emulation. Verify:
- Parallax is disabled
- No bloom (performance)
- Water still animates
- Labels are legible
- Gestures (pinch zoom, drag) still work

- [ ] **Step 7: Test reduced motion**

Enable `prefers-reduced-motion` in browser dev tools. Verify:
- Water is static
- No parallax
- No grain animation
- Page is still functional

- [ ] **Step 8: Commit any adjustments**

```bash
git add -A
git commit -m "fix: visual tuning for terrain, water, and post-processing"
```

---

## Task Dependency Order

```
Task 1 (deps) ─────────────┐
Task 2 (DEM assets) ───────┤
Task 3 (GeoJSON) ──────────┤
Task 4 (terrain shaders) ──┼──→ Task 7 (useThreeScene) ──→ Task 8 (wire up) ──→ Task 14 (cleanup) ──→ Task 15 (tuning)
Task 5 (water shader) ─────┤
Task 6 (paper shader) ─────┘
                            
Task 3 (GeoJSON) ──→ Task 9 (useGeoData) ──→ Task 10 (BackgroundLandmasses) ──→ Task 11 (integrate SVG)
                                                                                         │
Task 12 (CountyPath restyle) ───────────────────────────────────────────────────────────┘
Task 13 (label halo) ──────────────────────────────────────────────────────────────────┘
```

Tasks 1-6 can be parallelized. Tasks 7-8 depend on 1+4+5+6. Tasks 9-11 depend on 3. Tasks 12-13 are independent. Task 14 depends on 8. Task 15 depends on everything.
