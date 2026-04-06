# Interactive County Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an interactive antique-style map of England's 48 ceremonial counties with WebGL atmosphere, SVG county polygons, and detail panels linking to Tom Scott videos.

**Architecture:** SVG county polygons layered over a WebGL canvas (paper texture, terrain elevation, animated coastline). Side panel (desktop) / bottom sheet (mobile) for county details. Static JSON data file for community editing. TanStack Start file-based routing with deep-linkable county URLs.

**Tech Stack:** Vite 7, TanStack Start, React 19, Tailwind v4, raw WebGL shaders, d3-geo, @use-gesture/react, TypeScript.

---

## File Structure

```
public/
  data/
    counties.json                  # County metadata (community-editable)
    england-counties.geo.json      # GeoJSON boundaries (48 ceremonial counties)
  assets/
    arms/                          # Coat of arms SVGs per county
    england-heightmap.png          # 512x512 elevation texture
src/
  types/
    county.ts                      # TypeScript types for county data
  hooks/
    useCountyData.ts               # Load & parse counties.json
    useGeoData.ts                  # Load & parse GeoJSON
    useWebGLCanvas.ts              # WebGL setup, shader compilation, render loop
    useMapTransform.ts             # Zoom/pan state, gesture handling
  components/
    Map/
      MapContainer.tsx             # Orchestrates all three layers
      WebGLBackground.tsx          # Canvas element + useWebGLCanvas
      CountySVG.tsx                # SVG overlay with all county paths
      CountyPath.tsx               # Single county polygon (hover/click)
      CountyLabels.tsx             # SVG text labels for county names
      MapControls.tsx              # Zoom +/-, reset compass button
      MapLegend.tsx                # Released / Coming soon legend
    Detail/
      DetailPanel.tsx              # Desktop side panel wrapper
      BottomSheet.tsx              # Mobile bottom sheet wrapper
      CountyDetail.tsx             # Shared detail content
      CountyMiniMap.tsx            # Standalone county outline with markers
      VideoSection.tsx             # YouTube embed + Nebula link
      CountdownBadge.tsx           # "Coming May 15 — 39 days" badge
    Layout/
      Header.tsx                   # Floating map header (replaces starter)
      MenuOverlay.tsx              # Slide-in menu sidebar
      MobileListView.tsx           # Scrollable county list for mobile
    ui/                            # shadcn/ui primitives (as needed)
  shaders/
    paper.frag.glsl                # Paper texture fragment shader
    terrain.frag.glsl              # Terrain elevation + hillshading
    coastline.frag.glsl            # Animated coastline water effect
    fullscreen.vert.glsl           # Shared fullscreen quad vertex shader
  lib/
    projection.ts                  # d3-geo projection config for England
    utils.ts                       # (existing) cn() utility
    formatDate.ts                  # Date formatting + countdown calc
  routes/
    __root.tsx                     # Modified: remove Header/Footer wrapper
    index.tsx                      # Map view (the whole app)
    county.$id.tsx                 # Deep link — opens map + detail panel
    imprint.tsx                    # Legal page
    privacy.tsx                    # Data privacy page
```

---

## Task 1: Project Cleanup & Dependencies

Remove starter boilerplate and install new dependencies.

**Files:**
- Modify: `package.json`
- Modify: `src/routes/__root.tsx`
- Delete: `src/routes/about.tsx`
- Delete: `src/routes/demo.i18n.tsx`
- Modify: `src/components/Header.tsx` (will be fully rewritten in Task 8)
- Delete: `src/components/Footer.tsx`
- Delete: `src/components/LocaleSwitcher.tsx`

- [ ] **Step 1: Install new dependencies**

```bash
npm install d3-geo @use-gesture/react
npm install -D @types/d3-geo
```

- [ ] **Step 2: Delete starter boilerplate files**

```bash
rm src/routes/about.tsx
rm src/routes/demo.i18n.tsx
rm src/components/Footer.tsx
rm src/components/LocaleSwitcher.tsx
```

- [ ] **Step 3: Simplify `__root.tsx` — remove Header/Footer from shell**

Replace the `RootDocument` function in `src/routes/__root.tsx` with a minimal shell. The map pages will render their own layout; legal pages will too.

```tsx
import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'

import appCss from '../styles.css?url'

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: "Tom Scott's Every County" },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="font-sans antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  )
}
```

- [ ] **Step 4: Clear the index route to a placeholder**

Replace `src/routes/index.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: MapPage })

function MapPage() {
  return (
    <div className="flex h-dvh items-center justify-center">
      <p className="text-lg text-muted-foreground">Map loading...</p>
    </div>
  )
}
```

- [ ] **Step 5: Verify the app builds and runs**

```bash
npm run build
npm run dev
```

Expected: app loads at localhost:3000 showing "Map loading..." with no console errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: remove starter boilerplate, install d3-geo and use-gesture"
```

---

## Task 2: TypeScript Types & County Data

Define types and create the initial counties.json with a few sample counties.

**Files:**
- Create: `src/types/county.ts`
- Create: `public/data/counties.json`
- Create: `src/hooks/useCountyData.ts`
- Create: `src/lib/formatDate.ts`

- [ ] **Step 1: Create county types**

Create `src/types/county.ts`:

```ts
export interface Coordinates {
  lat: number
  lng: number
}

export interface Landmark {
  name: string
  coords: Coordinates
}

export interface CountyTown {
  name: string
  coords: Coordinates
}

export type CountyStatus = 'released' | 'upcoming'

export interface County {
  id: string
  name: string
  population: number | null
  areaSqKm: number | null
  countyTown: CountyTown | null
  description: string | null
  coatOfArms: string | null
  landmarks: Landmark[]
  youtubeId: string | null
  nebulaUrl: string | null
  status: CountyStatus
  releaseDate: string | null
}

export interface CountiesData {
  counties: County[]
}
```

- [ ] **Step 2: Create initial counties.json with 3 sample counties**

Create `public/data/counties.json`:

```json
{
  "counties": [
    {
      "id": "rutland",
      "name": "Rutland",
      "population": 41043,
      "areaSqKm": 382,
      "countyTown": { "name": "Oakham", "coords": { "lat": 52.6703, "lng": -0.7290 } },
      "description": "England's smallest ceremonial county, known for Rutland Water and its charming market towns.",
      "coatOfArms": "/assets/arms/rutland.svg",
      "landmarks": [
        { "name": "Rutland Water", "coords": { "lat": 52.658, "lng": -0.720 } },
        { "name": "Oakham Castle", "coords": { "lat": 52.671, "lng": -0.731 } }
      ],
      "youtubeId": "placeholder",
      "nebulaUrl": "https://nebula.tv/videos/placeholder",
      "status": "released",
      "releaseDate": "2026-03-20"
    },
    {
      "id": "greater-london",
      "name": "Greater London",
      "population": 8799800,
      "areaSqKm": 1572,
      "countyTown": { "name": "City of London", "coords": { "lat": 51.5155, "lng": -0.0922 } },
      "description": "The capital county, home to the UK's seat of government and a global cultural hub.",
      "coatOfArms": "/assets/arms/greater-london.svg",
      "landmarks": [
        { "name": "Tower of London", "coords": { "lat": 51.5081, "lng": -0.0759 } },
        { "name": "Buckingham Palace", "coords": { "lat": 51.5014, "lng": -0.1419 } }
      ],
      "youtubeId": null,
      "nebulaUrl": null,
      "status": "upcoming",
      "releaseDate": "2026-06-01"
    },
    {
      "id": "cornwall",
      "name": "Cornwall",
      "population": 573100,
      "areaSqKm": 3563,
      "countyTown": { "name": "Truro", "coords": { "lat": 50.2632, "lng": -5.0510 } },
      "description": "England's southwestern tip, famous for dramatic coastlines, tin mining heritage, and Cornish pasties.",
      "coatOfArms": "/assets/arms/cornwall.svg",
      "landmarks": [
        { "name": "St Michael's Mount", "coords": { "lat": 50.1171, "lng": -5.4773 } },
        { "name": "Eden Project", "coords": { "lat": 50.3601, "lng": -4.7447 } }
      ],
      "youtubeId": null,
      "nebulaUrl": null,
      "status": "upcoming",
      "releaseDate": "2026-05-15"
    }
  ]
}
```

- [ ] **Step 3: Create date formatting utility**

Create `src/lib/formatDate.ts`:

```ts
export function formatReleaseDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function daysUntil(dateStr: string): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function isUpcoming(dateStr: string): boolean {
  return daysUntil(dateStr) > 0
}
```

- [ ] **Step 4: Create useCountyData hook**

Create `src/hooks/useCountyData.ts`:

```ts
import { useEffect, useState } from 'react'
import type { CountiesData, County } from '#/types/county'

export function useCountyData() {
  const [counties, setCounties] = useState<County[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/data/counties.json')
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load county data: ${res.status}`)
        return res.json() as Promise<CountiesData>
      })
      .then((data) => {
        setCounties(data.counties)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  return { counties, loading, error }
}
```

- [ ] **Step 5: Verify JSON loads in browser**

Update `src/routes/index.tsx` temporarily to test:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useCountyData } from '#/hooks/useCountyData'

export const Route = createFileRoute('/')({ component: MapPage })

function MapPage() {
  const { counties, loading, error } = useCountyData()

  if (loading) return <div className="flex h-dvh items-center justify-center"><p>Loading...</p></div>
  if (error) return <div className="flex h-dvh items-center justify-center"><p>Error: {error}</p></div>

  return (
    <div className="flex h-dvh items-center justify-center">
      <p className="text-lg text-muted-foreground">
        Loaded {counties.length} counties: {counties.map(c => c.name).join(', ')}
      </p>
    </div>
  )
}
```

Expected: page shows "Loaded 3 counties: Rutland, Greater London, Cornwall"

- [ ] **Step 6: Commit**

```bash
git add src/types/county.ts public/data/counties.json src/hooks/useCountyData.ts src/lib/formatDate.ts src/routes/index.tsx
git commit -m "feat: add county types, sample data, and data loading hook"
```

---

## Task 3: GeoJSON Boundaries & Projection

Download the ceremonial county GeoJSON, set up d3-geo projection, and render basic SVG paths.

**Files:**
- Create: `public/data/england-counties.geo.json` (downloaded)
- Create: `src/hooks/useGeoData.ts`
- Create: `src/lib/projection.ts`

- [ ] **Step 1: Download and prepare GeoJSON**

Download the ceremonial counties GeoJSON from the `evansd/uk-ceremonial-counties` GitHub repo:

```bash
curl -L https://raw.githubusercontent.com/evansd/uk-ceremonial-counties/master/uk-ceremonial-counties.geojson -o /tmp/uk-ceremonial-counties.geojson
```

Then filter to England-only counties and ensure each feature has an `id` property that matches our `counties.json` IDs (lowercase, hyphenated). Write a quick Node script to do this:

```bash
node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('/tmp/uk-ceremonial-counties.geojson', 'utf8'));

// England's 48 ceremonial counties — filter out Scotland, Wales, NI
const englishCounties = [
  'Bedfordshire', 'Berkshire', 'Bristol', 'Buckinghamshire', 'Cambridgeshire',
  'Cheshire', 'City of London', 'Cornwall', 'Cumbria', 'Derbyshire', 'Devon',
  'Dorset', 'Durham', 'East Riding of Yorkshire', 'East Sussex', 'Essex',
  'Gloucestershire', 'Greater London', 'Greater Manchester', 'Hampshire',
  'Herefordshire', 'Hertfordshire', 'Isle of Wight', 'Kent', 'Lancashire',
  'Leicestershire', 'Lincolnshire', 'Merseyside', 'Middlesex', 'Norfolk',
  'North Yorkshire', 'Northamptonshire', 'Northumberland', 'Nottinghamshire',
  'Oxfordshire', 'Rutland', 'Shropshire', 'Somerset', 'South Yorkshire',
  'Staffordshire', 'Suffolk', 'Surrey', 'Tyne and Wear', 'Warwickshire',
  'West Midlands', 'West Sussex', 'West Yorkshire', 'Wiltshire', 'Worcestershire'
];

const toId = name => name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

const filtered = {
  type: 'FeatureCollection',
  features: data.features
    .filter(f => englishCounties.includes(f.properties.name || f.properties.NAME))
    .map(f => ({
      ...f,
      properties: {
        id: toId(f.properties.name || f.properties.NAME),
        name: f.properties.name || f.properties.NAME
      }
    }))
};

console.log('Found', filtered.features.length, 'English counties');
filtered.features.forEach(f => console.log(' -', f.properties.name, '(' + f.properties.id + ')'));

fs.writeFileSync('public/data/england-counties.geo.json', JSON.stringify(filtered));
"
```

Expected: prints "Found 48 English counties" (or close — adjust the list if the source uses slightly different names). Verify the output file exists and is valid JSON.

Note: The exact county names in the source may differ. Inspect the downloaded file's property names first:

```bash
node -e "
const data = JSON.parse(require('fs').readFileSync('/tmp/uk-ceremonial-counties.geojson','utf8'));
const names = data.features.map(f => f.properties.name || f.properties.NAME || JSON.stringify(f.properties));
console.log('Total features:', names.length);
names.sort().forEach(n => console.log(n));
"
```

Adapt the filter list based on actual property names found.

- [ ] **Step 2: Create projection utility**

Create `src/lib/projection.ts`:

```ts
import { geoMercator, geoPath } from 'd3-geo'
import type { GeoPermissibleObjects } from 'd3-geo'

export function createEnglandProjection(width: number, height: number) {
  // Center on England, roughly [52.5, -1.5]
  const projection = geoMercator()
    .center([-1.5, 52.5])
    .scale(width * 4.5)
    .translate([width / 2, height / 2])

  return projection
}

export function createPathGenerator(width: number, height: number) {
  const projection = createEnglandProjection(width, height)
  return geoPath().projection(projection)
}

export function fitProjectionToFeatures(
  width: number,
  height: number,
  geojson: GeoPermissibleObjects
) {
  const projection = geoMercator().fitSize([width, height], geojson)
  const pathGenerator = geoPath().projection(projection)
  return { projection, pathGenerator }
}
```

- [ ] **Step 3: Create useGeoData hook**

Create `src/hooks/useGeoData.ts`:

```ts
import { useEffect, useState } from 'react'
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson'

export interface CountyFeatureProperties {
  id: string
  name: string
}

export type CountyFeature = GeoJSON.Feature<Polygon | MultiPolygon, CountyFeatureProperties>
export type CountyFeatureCollection = FeatureCollection<Polygon | MultiPolygon, CountyFeatureProperties>

export function useGeoData() {
  const [geoData, setGeoData] = useState<CountyFeatureCollection | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/data/england-counties.geo.json')
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load GeoJSON: ${res.status}`)
        return res.json() as Promise<CountyFeatureCollection>
      })
      .then((data) => {
        setGeoData(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  return { geoData, loading, error }
}
```

- [ ] **Step 4: Test by rendering basic SVG paths on the index page**

Update `src/routes/index.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useCountyData } from '#/hooks/useCountyData'
import { useGeoData } from '#/hooks/useGeoData'
import { fitProjectionToFeatures } from '#/lib/projection'

export const Route = createFileRoute('/')({ component: MapPage })

function MapPage() {
  const { counties, loading: countiesLoading } = useCountyData()
  const { geoData, loading: geoLoading } = useGeoData()

  if (countiesLoading || geoLoading) {
    return <div className="flex h-dvh items-center justify-center"><p>Loading...</p></div>
  }

  if (!geoData) {
    return <div className="flex h-dvh items-center justify-center"><p>No geo data</p></div>
  }

  const width = 800
  const height = 900
  const { pathGenerator } = fitProjectionToFeatures(width, height, geoData)

  return (
    <div className="flex h-dvh items-center justify-center bg-[#f4e8c1]">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full max-h-dvh w-auto">
        {geoData.features.map((feature) => {
          const d = pathGenerator(feature)
          if (!d) return null
          const county = counties.find((c) => c.id === feature.properties.id)
          const isReleased = county?.status === 'released'
          return (
            <path
              key={feature.properties.id}
              d={d}
              fill={isReleased ? 'rgba(79, 140, 100, 0.3)' : 'rgba(150, 150, 150, 0.2)'}
              stroke="#5a4a3a"
              strokeWidth={0.5}
            />
          )
        })}
      </svg>
    </div>
  )
}
```

Expected: England's counties render as SVG paths on a parchment-colored background. Rutland should be slightly green (released), others grey.

- [ ] **Step 5: Commit**

```bash
git add public/data/england-counties.geo.json src/hooks/useGeoData.ts src/lib/projection.ts src/routes/index.tsx
git commit -m "feat: add GeoJSON boundaries, d3-geo projection, render county SVG paths"
```

---

## Task 4: WebGL Paper Texture Shader

Set up the raw WebGL pipeline and render the aged paper background.

**Files:**
- Create: `src/shaders/fullscreen.vert.glsl`
- Create: `src/shaders/paper.frag.glsl`
- Create: `src/hooks/useWebGLCanvas.ts`
- Create: `src/components/Map/WebGLBackground.tsx`

- [ ] **Step 1: Configure Vite to import GLSL files as strings**

Add to `vite.config.ts` — a simple raw import config. Vite supports `?raw` suffix natively, so we'll use that convention in imports. No plugin needed.

Alternatively, add a type declaration. Create `src/types/glsl.d.ts`:

```ts
declare module '*.glsl' {
  const value: string
  export default value
}
```

And update `vite.config.ts` to add the raw loader for `.glsl` files:

```ts
// Add inside the defineConfig plugins array, before tailwindcss():
{
  name: 'glsl-loader',
  transform(code: string, id: string) {
    if (id.endsWith('.glsl')) {
      return {
        code: `export default ${JSON.stringify(code)};`,
        map: null,
      }
    }
  },
},
```

- [ ] **Step 2: Create the fullscreen quad vertex shader**

Create `src/shaders/fullscreen.vert.glsl`:

```glsl
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
```

- [ ] **Step 3: Create the paper texture fragment shader**

Create `src/shaders/paper.frag.glsl`:

```glsl
precision mediump float;

varying vec2 v_uv;
uniform vec2 u_resolution;
uniform float u_time;

// Simplex-style hash for noise
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

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 5; i++) {
    value += amplitude * snoise(p);
    p *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  vec2 uv = v_uv;

  // Base parchment color
  vec3 paperBase = vec3(0.957, 0.910, 0.757); // #f4e8c1

  // Paper grain (multi-octave noise)
  float grain = fbm(uv * 40.0) * 0.06;

  // Larger stain variations
  float stain = fbm(uv * 3.0 + 42.0) * 0.04;

  // Fold creases (two diagonal lines)
  float crease1 = smoothstep(0.002, 0.0, abs(uv.x + uv.y * 0.3 - 0.65));
  float crease2 = smoothstep(0.002, 0.0, abs(uv.x * 0.4 - uv.y + 0.3));
  float creases = (crease1 + crease2) * 0.08;

  // Vignette
  vec2 vignetteUV = uv * 2.0 - 1.0;
  float vignette = 1.0 - dot(vignetteUV * 0.5, vignetteUV * 0.5);
  vignette = smoothstep(0.0, 1.0, vignette);

  // Combine
  vec3 color = paperBase + grain + stain - creases;
  color *= mix(0.82, 1.0, vignette);

  // Very subtle warm shift over time (living paper)
  color += vec3(0.01, 0.005, 0.0) * sin(u_time * 0.3);

  gl_FragColor = vec4(color, 1.0);
}
```

- [ ] **Step 4: Create useWebGLCanvas hook**

Create `src/hooks/useWebGLCanvas.ts`:

```ts
import { useEffect, useRef, useCallback } from 'react'
import vertexSource from '#/shaders/fullscreen.vert.glsl'
import paperFragSource from '#/shaders/paper.frag.glsl'

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('Failed to create shader')
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    throw new Error(`Shader compile error: ${info}`)
  }
  return shader
}

function createProgram(gl: WebGLRenderingContext, vertSrc: string, fragSrc: string): WebGLProgram {
  const vert = compileShader(gl, gl.VERTEX_SHADER, vertSrc)
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc)
  const program = gl.createProgram()
  if (!program) throw new Error('Failed to create program')
  gl.attachShader(program, vert)
  gl.attachShader(program, frag)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program)
    throw new Error(`Program link error: ${info}`)
  }
  return program
}

export function useWebGLCanvas(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const animFrameRef = useRef<number>(0)
  const startTimeRef = useRef<number>(Date.now())

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl')
    if (!gl) {
      console.warn('WebGL not supported')
      return
    }

    // Detect mobile for half-resolution rendering
    const isMobile = window.innerWidth < 768
    const dpr = isMobile ? Math.min(window.devicePixelRatio, 1) : Math.min(window.devicePixelRatio, 2)

    const resize = () => {
      canvas.width = canvas.clientWidth * dpr
      canvas.height = canvas.clientHeight * dpr
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    resize()
    window.addEventListener('resize', resize)

    // Create fullscreen quad
    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    )

    // Compile paper shader
    const program = createProgram(gl, vertexSource, paperFragSource)
    const aPosition = gl.getAttribLocation(program, 'a_position')
    const uResolution = gl.getUniformLocation(program, 'u_resolution')
    const uTime = gl.getUniformLocation(program, 'u_time')

    const render = () => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000

      gl.useProgram(program)
      gl.enableVertexAttribArray(aPosition)
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0)

      gl.uniform2f(uResolution, canvas.width, canvas.height)
      gl.uniform1f(uTime, elapsed)

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

      animFrameRef.current = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [canvasRef])
}
```

- [ ] **Step 5: Create WebGLBackground component**

Create `src/components/Map/WebGLBackground.tsx`:

```tsx
import { useRef } from 'react'
import { useWebGLCanvas } from '#/hooks/useWebGLCanvas'

export function WebGLBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useWebGLCanvas(canvasRef)

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ zIndex: 0 }}
    />
  )
}
```

- [ ] **Step 6: Integrate into the map page**

Update `src/routes/index.tsx` to layer the WebGL canvas behind the SVG:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useCountyData } from '#/hooks/useCountyData'
import { useGeoData } from '#/hooks/useGeoData'
import { fitProjectionToFeatures } from '#/lib/projection'
import { WebGLBackground } from '#/components/Map/WebGLBackground'

export const Route = createFileRoute('/')({ component: MapPage })

function MapPage() {
  const { counties, loading: countiesLoading } = useCountyData()
  const { geoData, loading: geoLoading } = useGeoData()

  if (countiesLoading || geoLoading) {
    return <div className="flex h-dvh items-center justify-center"><p>Loading...</p></div>
  }

  if (!geoData) {
    return <div className="flex h-dvh items-center justify-center"><p>No geo data</p></div>
  }

  const width = 800
  const height = 900
  const { pathGenerator } = fitProjectionToFeatures(width, height, geoData)

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <WebGLBackground />
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="absolute inset-0 h-full w-full"
        style={{ zIndex: 1 }}
        preserveAspectRatio="xMidYMid meet"
      >
        {geoData.features.map((feature) => {
          const d = pathGenerator(feature)
          if (!d) return null
          const county = counties.find((c) => c.id === feature.properties.id)
          const isReleased = county?.status === 'released'
          return (
            <path
              key={feature.properties.id}
              d={d}
              fill={isReleased ? 'rgba(79, 140, 100, 0.25)' : 'rgba(150, 150, 140, 0.15)'}
              stroke="rgba(90, 74, 58, 0.6)"
              strokeWidth={0.5}
            />
          )
        })}
      </svg>
    </div>
  )
}
```

Expected: parchment paper texture renders behind semi-transparent county SVGs. The paper grain and vignette should be visible.

- [ ] **Step 7: Commit**

```bash
git add src/shaders/ src/hooks/useWebGLCanvas.ts src/components/Map/WebGLBackground.tsx src/routes/index.tsx src/types/glsl.d.ts vite.config.ts
git commit -m "feat: add WebGL paper texture shader behind county SVG layer"
```

---

## Task 5: Terrain Elevation Shader

Add the heightmap-based terrain coloring to the WebGL background.

**Files:**
- Create: `src/shaders/terrain.frag.glsl`
- Create: `public/assets/england-heightmap.png` (generated/sourced)
- Modify: `src/hooks/useWebGLCanvas.ts`

- [ ] **Step 1: Source or generate the heightmap**

Option A (recommended): Download a public domain DEM of England and convert to a 512x512 grayscale PNG. A good free source is the SRTM 90m data from CGIAR-CSI or OpenTopography.

For the MVP, generate a placeholder procedural heightmap. Create a quick script:

```bash
node -e "
// Generate a rough placeholder heightmap of England
// Real heightmap to be sourced from SRTM data later
const { createCanvas } = require('canvas');
// If canvas isn't available, just create a 1x1 white pixel PNG as placeholder
const fs = require('fs');
// Minimal 512x512 gray PNG placeholder — replace with real DEM data
console.log('TODO: Replace with real England DEM heightmap');
console.log('For now, the terrain shader will use procedural elevation');
"
```

For the initial implementation, the terrain shader will use procedural noise-based elevation (no texture needed). The real heightmap texture will be swapped in later.

- [ ] **Step 2: Create terrain fragment shader**

Create `src/shaders/terrain.frag.glsl`:

```glsl
precision mediump float;

varying vec2 v_uv;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mapBounds; // [x_offset, y_offset] of England in UV space
uniform vec2 u_mapSize;   // [width, height] of England in UV space

// Reuse noise functions
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

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 6; i++) {
    value += amplitude * snoise(p);
    p *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

// Simulate England's terrain: higher in north/west (Pennines, Lake District)
float terrainHeight(vec2 uv) {
  // Base terrain from noise
  float h = fbm(uv * 8.0 + vec2(100.0, 200.0)) * 0.5 + 0.5;

  // Bias: north and west are higher (Pennines, Lake District, Peak District)
  float northBias = smoothstep(0.3, 0.9, uv.y) * 0.3;
  float westBias = smoothstep(0.6, 0.2, uv.x) * 0.15;

  h = h * 0.6 + northBias + westBias;
  return clamp(h, 0.0, 1.0);
}

// Classic cartographic color ramp
vec3 terrainColor(float h) {
  vec3 deepGreen = vec3(0.45, 0.58, 0.37);   // lowland valleys
  vec3 lightGreen = vec3(0.62, 0.72, 0.48);   // gentle hills
  vec3 tan = vec3(0.72, 0.65, 0.50);           // uplands
  vec3 brown = vec3(0.60, 0.48, 0.35);         // high hills
  vec3 purple = vec3(0.52, 0.42, 0.48);        // mountain peaks

  if (h < 0.25) return mix(deepGreen, lightGreen, h / 0.25);
  if (h < 0.45) return mix(lightGreen, tan, (h - 0.25) / 0.2);
  if (h < 0.65) return mix(tan, brown, (h - 0.45) / 0.2);
  return mix(brown, purple, (h - 0.65) / 0.35);
}

// Hillshading: light from northwest
float hillshade(vec2 uv, float h) {
  float dx = terrainHeight(uv + vec2(0.002, 0.0)) - terrainHeight(uv - vec2(0.002, 0.0));
  float dy = terrainHeight(uv + vec2(0.0, 0.002)) - terrainHeight(uv - vec2(0.0, 0.002));
  vec3 normal = normalize(vec3(-dx * 4.0, -dy * 4.0, 1.0));
  vec3 lightDir = normalize(vec3(-0.5, 0.5, 0.8)); // NW light
  return max(dot(normal, lightDir), 0.0);
}

void main() {
  vec2 uv = v_uv;

  float h = terrainHeight(uv);
  vec3 terrain = terrainColor(h);

  // Apply hillshading
  float shade = hillshade(uv, h);
  terrain *= mix(0.7, 1.1, shade);

  gl_FragColor = vec4(terrain, 1.0);
}
```

- [ ] **Step 3: Combine paper + terrain in useWebGLCanvas**

Update `src/hooks/useWebGLCanvas.ts` to render both shaders. The approach: render terrain first, then blend paper on top with alpha.

Update the hook to accept a mode or compose both shaders into one combined fragment shader. The simpler approach is a single combined shader. Create `src/shaders/background.frag.glsl` that combines both:

Create `src/shaders/background.frag.glsl`:

```glsl
precision mediump float;

varying vec2 v_uv;
uniform vec2 u_resolution;
uniform float u_time;

// --- Noise functions (same as before) ---
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

// --- Terrain ---
float terrainHeight(vec2 uv) {
  float h = fbm(uv * 8.0 + vec2(100.0, 200.0), 6) * 0.5 + 0.5;
  float northBias = smoothstep(0.3, 0.9, uv.y) * 0.3;
  float westBias = smoothstep(0.6, 0.2, uv.x) * 0.15;
  h = h * 0.6 + northBias + westBias;
  return clamp(h, 0.0, 1.0);
}

vec3 terrainColor(float h) {
  vec3 deepGreen = vec3(0.45, 0.58, 0.37);
  vec3 lightGreen = vec3(0.62, 0.72, 0.48);
  vec3 tan_ = vec3(0.72, 0.65, 0.50);
  vec3 brown = vec3(0.60, 0.48, 0.35);
  vec3 purple = vec3(0.52, 0.42, 0.48);

  if (h < 0.25) return mix(deepGreen, lightGreen, h / 0.25);
  if (h < 0.45) return mix(lightGreen, tan_, (h - 0.25) / 0.2);
  if (h < 0.65) return mix(tan_, brown, (h - 0.45) / 0.2);
  return mix(brown, purple, (h - 0.65) / 0.35);
}

float hillshade(vec2 uv) {
  float dx = terrainHeight(uv + vec2(0.002, 0.0)) - terrainHeight(uv - vec2(0.002, 0.0));
  float dy = terrainHeight(uv + vec2(0.0, 0.002)) - terrainHeight(uv - vec2(0.0, 0.002));
  vec3 normal = normalize(vec3(-dx * 4.0, -dy * 4.0, 1.0));
  vec3 lightDir = normalize(vec3(-0.5, 0.5, 0.8));
  return max(dot(normal, lightDir), 0.0);
}

// --- Paper ---
vec3 paperTexture(vec2 uv) {
  vec3 base = vec3(0.957, 0.910, 0.757);
  float grain = fbm(uv * 40.0, 5) * 0.06;
  float stain = fbm(uv * 3.0 + 42.0, 4) * 0.04;
  float crease1 = smoothstep(0.002, 0.0, abs(uv.x + uv.y * 0.3 - 0.65));
  float crease2 = smoothstep(0.002, 0.0, abs(uv.x * 0.4 - uv.y + 0.3));
  float creases = (crease1 + crease2) * 0.08;
  vec2 vigUV = uv * 2.0 - 1.0;
  float vignette = 1.0 - dot(vigUV * 0.5, vigUV * 0.5);
  vignette = smoothstep(0.0, 1.0, vignette);
  vec3 color = base + grain + stain - creases;
  color *= mix(0.82, 1.0, vignette);
  return color;
}

// --- Coastline water ---
float coastlineWater(vec2 uv) {
  // Simple animated water based on noise
  float wave = snoise(uv * 20.0 + vec2(u_time * 0.15, u_time * 0.1)) * 0.5 + 0.5;
  float ripple = snoise(uv * 40.0 - vec2(u_time * 0.2, 0.0)) * 0.3;
  return wave * 0.7 + ripple * 0.3;
}

void main() {
  vec2 uv = v_uv;

  // Paper base
  vec3 paper = paperTexture(uv);

  // Terrain
  float h = terrainHeight(uv);
  vec3 terrain = terrainColor(h);
  float shade = hillshade(uv);
  terrain *= mix(0.7, 1.1, shade);

  // Blend terrain onto paper (terrain shows through paper)
  vec3 color = mix(paper, terrain, 0.55);

  // Add paper grain on top
  color += fbm(uv * 60.0, 3) * 0.02;

  // Subtle time-based warmth
  color += vec3(0.008, 0.004, 0.0) * sin(u_time * 0.3);

  gl_FragColor = vec4(color, 1.0);
}
```

- [ ] **Step 4: Update useWebGLCanvas to use combined shader**

Replace the contents of `src/hooks/useWebGLCanvas.ts` — change the import to use the combined background shader:

```ts
import { useEffect, useRef } from 'react'
import vertexSource from '#/shaders/fullscreen.vert.glsl'
import fragmentSource from '#/shaders/background.frag.glsl'

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('Failed to create shader')
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    throw new Error(`Shader compile error: ${info}`)
  }
  return shader
}

function createProgram(gl: WebGLRenderingContext, vertSrc: string, fragSrc: string): WebGLProgram {
  const vert = compileShader(gl, gl.VERTEX_SHADER, vertSrc)
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc)
  const program = gl.createProgram()
  if (!program) throw new Error('Failed to create program')
  gl.attachShader(program, vert)
  gl.attachShader(program, frag)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program)
    throw new Error(`Program link error: ${info}`)
  }
  return program
}

export function useWebGLCanvas(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const animFrameRef = useRef<number>(0)
  const startTimeRef = useRef<number>(Date.now())

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl')
    if (!gl) {
      console.warn('WebGL not supported')
      return
    }

    const isMobile = window.innerWidth < 768
    const dpr = isMobile ? Math.min(window.devicePixelRatio, 1) : Math.min(window.devicePixelRatio, 2)

    const resize = () => {
      canvas.width = canvas.clientWidth * dpr
      canvas.height = canvas.clientHeight * dpr
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    resize()
    window.addEventListener('resize', resize)

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)

    const program = createProgram(gl, vertexSource, fragmentSource)
    const aPosition = gl.getAttribLocation(program, 'a_position')
    const uResolution = gl.getUniformLocation(program, 'u_resolution')
    const uTime = gl.getUniformLocation(program, 'u_time')

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const render = () => {
      const elapsed = prefersReducedMotion ? 0 : (Date.now() - startTimeRef.current) / 1000

      gl.useProgram(program)
      gl.enableVertexAttribArray(aPosition)
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0)

      gl.uniform2f(uResolution, canvas.width, canvas.height)
      gl.uniform1f(uTime, elapsed)

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

      animFrameRef.current = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [canvasRef])
}
```

- [ ] **Step 5: Verify terrain + paper renders**

```bash
npm run dev
```

Expected: the background shows blended paper texture with colorized terrain (greens in lowlands, browns/purple in the north). SVG county paths overlay on top.

- [ ] **Step 6: Commit**

```bash
git add src/shaders/background.frag.glsl src/shaders/terrain.frag.glsl src/hooks/useWebGLCanvas.ts
git commit -m "feat: add combined paper + terrain elevation WebGL shader"
```

Note: Delete the standalone `paper.frag.glsl` and `terrain.frag.glsl` if they were created — the combined `background.frag.glsl` replaces them:

```bash
rm -f src/shaders/paper.frag.glsl src/shaders/terrain.frag.glsl
```

---

## Task 6: SVG County Component with Hover Effects

Extract county paths into proper components with hover state and hand-drawn border animation.

**Files:**
- Create: `src/components/Map/CountyPath.tsx`
- Create: `src/components/Map/CountySVG.tsx`
- Create: `src/components/Map/CountyLabels.tsx`
- Modify: `src/routes/index.tsx`

- [ ] **Step 1: Create CountyPath component**

Create `src/components/Map/CountyPath.tsx`:

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

  // Fill colors
  let fill = 'rgba(150, 150, 140, 0.12)' // default unknown
  if (isReleased) fill = 'rgba(79, 140, 100, 0.22)'
  if (isUpcoming) fill = 'url(#hatch)' // hatching pattern for uncharted territory
  if (isHovered) fill = isReleased ? 'rgba(79, 184, 120, 0.35)' : 'rgba(180, 180, 170, 0.25)'
  if (isSelected) fill = isReleased ? 'rgba(79, 184, 120, 0.45)' : 'rgba(180, 180, 170, 0.35)'

  // Stroke
  const strokeColor = isHovered || isSelected ? 'rgba(90, 74, 58, 0.9)' : 'rgba(90, 74, 58, 0.5)'
  const strokeWidth = isHovered || isSelected ? 1.2 : 0.5

  // Hand-drawn dash animation on hover
  const pathLength = 5000 // approximate — works for the animation
  const dashProps = isHovered
    ? {
        strokeDasharray: pathLength,
        strokeDashoffset: 0,
        style: {
          transition: 'stroke-dashoffset 0.8s ease-in-out, fill 0.2s ease, stroke 0.2s ease',
        },
      }
    : {
        style: {
          transition: 'fill 0.2s ease, stroke 0.2s ease, stroke-width 0.2s ease',
        },
      }

  return (
    <path
      d={d}
      fill={fill}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
      className="cursor-pointer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`${featureName}${isReleased ? ' — video available' : isUpcoming ? ' — coming soon' : ''}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick() }}
      {...dashProps}
    >
      {/* Hatching pattern for upcoming counties */}
      {isUpcoming && !isHovered && !isSelected && (
        <title>{featureName} — Coming soon</title>
      )}
    </path>
  )
}
```

- [ ] **Step 2: Create CountySVG component**

Create `src/components/Map/CountySVG.tsx`:

```tsx
import type { GeoPath, GeoPermissibleObjects } from 'd3-geo'
import type { County } from '#/types/county'
import type { CountyFeatureCollection } from '#/hooks/useGeoData'
import { CountyPath } from './CountyPath'

interface CountySVGProps {
  geoData: CountyFeatureCollection
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
      {/* SVG hatching pattern for upcoming counties */}
      <defs>
        <pattern id="hatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(90, 74, 58, 0.15)" strokeWidth="1" />
        </pattern>
      </defs>

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

- [ ] **Step 3: Create CountyLabels component**

Create `src/components/Map/CountyLabels.tsx`:

```tsx
import type { GeoProjection } from 'd3-geo'
import { geoCentroid } from 'd3-geo'
import type { CountyFeatureCollection } from '#/hooks/useGeoData'

interface CountyLabelsProps {
  geoData: CountyFeatureCollection
  projection: GeoProjection
  width: number
  height: number
}

export function CountyLabels({ geoData, projection, width, height }: CountyLabelsProps) {
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ zIndex: 2 }}
      preserveAspectRatio="xMidYMid meet"
    >
      {geoData.features.map((feature) => {
        const centroid = geoCentroid(feature)
        const [x, y] = projection(centroid) ?? [0, 0]
        return (
          <text
            key={feature.properties.id}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="select-none"
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: '5px',
              fill: 'rgba(90, 74, 58, 0.7)',
              letterSpacing: '0.05em',
            }}
          >
            {feature.properties.name}
          </text>
        )
      })}
    </svg>
  )
}
```

- [ ] **Step 4: Update index.tsx to use new components**

Replace `src/routes/index.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import { useCountyData } from '#/hooks/useCountyData'
import { useGeoData } from '#/hooks/useGeoData'
import { fitProjectionToFeatures } from '#/lib/projection'
import { WebGLBackground } from '#/components/Map/WebGLBackground'
import { CountySVG } from '#/components/Map/CountySVG'
import { CountyLabels } from '#/components/Map/CountyLabels'

export const Route = createFileRoute('/')({ component: MapPage })

function MapPage() {
  const { counties, loading: countiesLoading } = useCountyData()
  const { geoData, loading: geoLoading } = useGeoData()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const handleSelect = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id))
  }, [])

  const handleHover = useCallback((id: string | null) => {
    setHoveredId(id)
  }, [])

  if (countiesLoading || geoLoading) {
    return <div className="flex h-dvh items-center justify-center"><p>Loading...</p></div>
  }

  if (!geoData) {
    return <div className="flex h-dvh items-center justify-center"><p>No geo data</p></div>
  }

  const width = 800
  const height = 900
  const { projection, pathGenerator } = fitProjectionToFeatures(width, height, geoData)

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <WebGLBackground />
      <CountySVG
        geoData={geoData}
        pathGenerator={pathGenerator}
        counties={counties}
        selectedId={selectedId}
        onSelect={handleSelect}
        onHover={handleHover}
        width={width}
        height={height}
      />
      <CountyLabels
        geoData={geoData}
        projection={projection}
        width={width}
        height={height}
      />

      {/* Temporary: show selected county name */}
      {selectedId && (
        <div className="absolute bottom-4 left-4 z-10 rounded-xl bg-white/80 px-4 py-2 shadow-lg backdrop-blur">
          <p className="text-sm font-semibold">
            Selected: {counties.find(c => c.id === selectedId)?.name ?? selectedId}
          </p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Verify hover/click interactions**

```bash
npm run dev
```

Expected: hovering a county highlights it (brighter fill, thicker border). Clicking selects it (even brighter). County names appear as labels. A small chip at the bottom shows the selected county name.

- [ ] **Step 6: Commit**

```bash
git add src/components/Map/CountyPath.tsx src/components/Map/CountySVG.tsx src/components/Map/CountyLabels.tsx src/routes/index.tsx
git commit -m "feat: add interactive SVG county components with hover and selection"
```

---

## Task 7: Zoom, Pan & Gesture Handling

Add zoom/pan controls powered by @use-gesture/react, syncing SVG and WebGL layers.

**Files:**
- Create: `src/hooks/useMapTransform.ts`
- Create: `src/components/Map/MapContainer.tsx`
- Create: `src/components/Map/MapControls.tsx`
- Modify: `src/routes/index.tsx`

- [ ] **Step 1: Create useMapTransform hook**

Create `src/hooks/useMapTransform.ts`:

```ts
import { useState, useCallback, useRef } from 'react'
import { useGesture } from '@use-gesture/react'

export interface MapTransform {
  x: number
  y: number
  scale: number
}

const MIN_SCALE = 0.8
const MAX_SCALE = 8

export function useMapTransform() {
  const [transform, setTransform] = useState<MapTransform>({ x: 0, y: 0, scale: 1 })
  const containerRef = useRef<HTMLDivElement>(null)

  const bind = useGesture(
    {
      onDrag: ({ delta: [dx, dy] }) => {
        setTransform((prev) => ({
          ...prev,
          x: prev.x + dx,
          y: prev.y + dy,
        }))
      },
      onPinch: ({ offset: [scale] }) => {
        setTransform((prev) => ({
          ...prev,
          scale: Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale)),
        }))
      },
      onWheel: ({ delta: [, dy], event }) => {
        event.preventDefault()
        setTransform((prev) => {
          const factor = dy > 0 ? 0.95 : 1.05
          const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale * factor))
          return { ...prev, scale: newScale }
        })
      },
    },
    {
      target: containerRef,
      drag: { filterTaps: true },
      pinch: { scaleBounds: { min: MIN_SCALE, max: MAX_SCALE } },
      wheel: { eventOptions: { passive: false } },
    }
  )

  const zoomIn = useCallback(() => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.min(MAX_SCALE, prev.scale * 1.3),
    }))
  }, [])

  const zoomOut = useCallback(() => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.max(MIN_SCALE, prev.scale / 1.3),
    }))
  }, [])

  const resetView = useCallback(() => {
    setTransform({ x: 0, y: 0, scale: 1 })
  }, [])

  const transformStyle = `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`

  return {
    transform,
    transformStyle,
    containerRef,
    bind,
    zoomIn,
    zoomOut,
    resetView,
  }
}
```

- [ ] **Step 2: Create MapControls component**

Create `src/components/Map/MapControls.tsx`:

```tsx
interface MapControlsProps {
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
}

export function MapControls({ onZoomIn, onZoomOut, onReset }: MapControlsProps) {
  const buttonClass =
    'flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] text-[var(--sea-ink)] shadow-md backdrop-blur transition hover:bg-[var(--link-bg-hover)] active:scale-95'

  return (
    <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2 md:bottom-auto md:right-4 md:top-20">
      <button onClick={onZoomIn} className={buttonClass} aria-label="Zoom in">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="10" y1="4" x2="10" y2="16" />
          <line x1="4" y1="10" x2="16" y2="10" />
        </svg>
      </button>
      <button onClick={onZoomOut} className={buttonClass} aria-label="Zoom out">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="4" y1="10" x2="16" y2="10" />
        </svg>
      </button>
      <button onClick={onReset} className={buttonClass} aria-label="Reset view">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="10" cy="10" r="7" />
          <line x1="10" y1="3" x2="10" y2="7" />
          <line x1="10" y1="5" x2="8" y2="3" />
          <line x1="10" y1="5" x2="12" y2="3" />
        </svg>
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Create MapContainer that applies transforms**

Create `src/components/Map/MapContainer.tsx`:

```tsx
import type { ReactNode } from 'react'
import { useMapTransform } from '#/hooks/useMapTransform'
import { MapControls } from './MapControls'

interface MapContainerProps {
  children: ReactNode
}

export function MapContainer({ children }: MapContainerProps) {
  const { transformStyle, containerRef, zoomIn, zoomOut, resetView } = useMapTransform()

  return (
    <div ref={containerRef} className="relative h-dvh w-full overflow-hidden touch-none">
      <div
        className="h-full w-full origin-center"
        style={{ transform: transformStyle, willChange: 'transform' }}
      >
        {children}
      </div>
      <MapControls onZoomIn={zoomIn} onZoomOut={zoomOut} onReset={resetView} />
    </div>
  )
}
```

- [ ] **Step 4: Wire MapContainer into index.tsx**

Update `src/routes/index.tsx` — wrap the map layers in `MapContainer`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import { useCountyData } from '#/hooks/useCountyData'
import { useGeoData } from '#/hooks/useGeoData'
import { fitProjectionToFeatures } from '#/lib/projection'
import { WebGLBackground } from '#/components/Map/WebGLBackground'
import { CountySVG } from '#/components/Map/CountySVG'
import { CountyLabels } from '#/components/Map/CountyLabels'
import { MapContainer } from '#/components/Map/MapContainer'

export const Route = createFileRoute('/')({ component: MapPage })

function MapPage() {
  const { counties, loading: countiesLoading } = useCountyData()
  const { geoData, loading: geoLoading } = useGeoData()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const handleSelect = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id))
  }, [])

  const handleHover = useCallback((id: string | null) => {
    setHoveredId(id)
  }, [])

  if (countiesLoading || geoLoading) {
    return <div className="flex h-dvh items-center justify-center"><p>Loading...</p></div>
  }

  if (!geoData) {
    return <div className="flex h-dvh items-center justify-center"><p>No geo data</p></div>
  }

  const width = 800
  const height = 900
  const { projection, pathGenerator } = fitProjectionToFeatures(width, height, geoData)

  return (
    <MapContainer>
      <WebGLBackground />
      <CountySVG
        geoData={geoData}
        pathGenerator={pathGenerator}
        counties={counties}
        selectedId={selectedId}
        onSelect={handleSelect}
        onHover={handleHover}
        width={width}
        height={height}
      />
      <CountyLabels
        geoData={geoData}
        projection={projection}
        width={width}
        height={height}
      />
    </MapContainer>
  )
}
```

- [ ] **Step 5: Verify zoom/pan works**

```bash
npm run dev
```

Expected: scroll-wheel zooms in/out, drag pans the map, pinch-to-zoom on mobile. +/- buttons and reset button work. The WebGL canvas and SVG layers transform together.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useMapTransform.ts src/components/Map/MapControls.tsx src/components/Map/MapContainer.tsx src/routes/index.tsx
git commit -m "feat: add zoom/pan gesture handling with map controls"
```

---

## Task 8: Header & Menu Overlay

Replace the starter header with the floating map header and slide-in menu.

**Files:**
- Rewrite: `src/components/Header.tsx` → `src/components/Layout/Header.tsx`
- Create: `src/components/Layout/MenuOverlay.tsx`
- Modify: `src/routes/index.tsx`
- Delete: `src/components/ThemeToggle.tsx` (keep if wanted, optional)

- [ ] **Step 1: Create MenuOverlay component**

Create `src/components/Layout/MenuOverlay.tsx`:

```tsx
import { useEffect, useCallback } from 'react'
import { Link } from '@tanstack/react-router'

interface MenuOverlayProps {
  isOpen: boolean
  onClose: () => void
}

export function MenuOverlay({ isOpen, onClose }: MenuOverlayProps) {
  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <nav
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-xs border-l border-[var(--line)] bg-[var(--surface-strong)] shadow-2xl backdrop-blur-lg transition-transform duration-300 ease-out md:max-w-sm ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="Main menu"
      >
        <div className="flex items-center justify-between border-b border-[var(--line)] px-6 py-4">
          <h2 className="display-title text-lg font-bold text-[var(--sea-ink)]">Menu</h2>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl transition hover:bg-[var(--link-bg-hover)]"
            aria-label="Close menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="4" x2="16" y2="16" />
              <line x1="16" y1="4" x2="4" y2="16" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-1 px-4 py-4">
          <Link
            to="/"
            onClick={onClose}
            className="rounded-xl px-4 py-3 text-base font-semibold text-[var(--sea-ink)] no-underline transition hover:bg-[var(--link-bg-hover)]"
          >
            Map
          </Link>
          <Link
            to="/imprint"
            onClick={onClose}
            className="rounded-xl px-4 py-3 text-base font-semibold text-[var(--sea-ink-soft)] no-underline transition hover:bg-[var(--link-bg-hover)]"
          >
            Imprint
          </Link>
          <Link
            to="/privacy"
            onClick={onClose}
            className="rounded-xl px-4 py-3 text-base font-semibold text-[var(--sea-ink-soft)] no-underline transition hover:bg-[var(--link-bg-hover)]"
          >
            Data Privacy
          </Link>
        </div>

        <div className="absolute bottom-6 px-6 text-xs text-[var(--sea-ink-soft)]">
          <p>A community project tracking Tom Scott's Every County series.</p>
        </div>
      </nav>
    </>
  )
}
```

- [ ] **Step 2: Create new Header component**

Create `src/components/Layout/Header.tsx`:

```tsx
import { useState, useCallback } from 'react'
import { Link } from '@tanstack/react-router'
import { MenuOverlay } from './MenuOverlay'

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const toggleMenu = useCallback(() => setMenuOpen((prev) => !prev), [])
  const closeMenu = useCallback(() => setMenuOpen(false), [])

  return (
    <>
      <header className="pointer-events-none fixed left-0 right-0 top-0 z-30 p-3">
        <div className="pointer-events-auto mx-auto flex max-w-screen-xl items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1.5 text-sm font-semibold text-[var(--sea-ink)] no-underline shadow-md backdrop-blur-lg sm:px-4 sm:py-2"
          >
            <span className="h-2 w-2 rounded-full bg-[linear-gradient(90deg,#56c6be,#7ed3bf)]" />
            <span className="display-title">Every County</span>
          </Link>

          <button
            onClick={toggleMenu}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--chip-line)] bg-[var(--chip-bg)] shadow-md backdrop-blur-lg transition hover:bg-[var(--link-bg-hover)]"
            aria-label="Open menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="17" y2="6" />
              <line x1="3" y1="10" x2="17" y2="10" />
              <line x1="3" y1="14" x2="17" y2="14" />
            </svg>
          </button>
        </div>
      </header>

      <MenuOverlay isOpen={menuOpen} onClose={closeMenu} />
    </>
  )
}
```

- [ ] **Step 3: Delete old header, add Header to index.tsx**

```bash
rm src/components/Header.tsx
rm -f src/components/ThemeToggle.tsx
```

Update `src/routes/index.tsx` — add the Header import and render it inside the map page (outside MapContainer so it stays fixed):

Add at the top of the return, before `<MapContainer>`:

```tsx
import { Header } from '#/components/Layout/Header'

// In the return, wrap like:
return (
  <>
    <Header />
    <MapContainer>
      {/* ... existing layers ... */}
    </MapContainer>
  </>
)
```

- [ ] **Step 4: Verify header and menu**

```bash
npm run dev
```

Expected: floating header with "Every County" chip and hamburger button. Clicking hamburger opens slide-in menu with Map/Imprint/Privacy links. Clicking backdrop or X closes it.

- [ ] **Step 5: Commit**

```bash
git add src/components/Layout/Header.tsx src/components/Layout/MenuOverlay.tsx src/routes/index.tsx
git add -u  # catches deleted files
git commit -m "feat: add floating header with slide-in menu overlay"
```

---

## Task 9: County Detail Panel (Desktop Side Panel)

Build the desktop side panel that shows county information.

**Files:**
- Create: `src/components/Detail/DetailPanel.tsx`
- Create: `src/components/Detail/CountyDetail.tsx`
- Create: `src/components/Detail/CountyMiniMap.tsx`
- Create: `src/components/Detail/VideoSection.tsx`
- Create: `src/components/Detail/CountdownBadge.tsx`
- Modify: `src/routes/index.tsx`

- [ ] **Step 1: Create CountdownBadge component**

Create `src/components/Detail/CountdownBadge.tsx`:

```tsx
import { formatReleaseDate, daysUntil } from '#/lib/formatDate'

interface CountdownBadgeProps {
  status: 'released' | 'upcoming'
  releaseDate: string | null
}

export function CountdownBadge({ status, releaseDate }: CountdownBadgeProps) {
  if (!releaseDate) return null

  if (status === 'released') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(79,140,100,0.15)] px-3 py-1 text-xs font-semibold text-[var(--palm)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--palm)]" />
        Released {formatReleaseDate(releaseDate)}
      </span>
    )
  }

  const days = daysUntil(releaseDate)
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(150,150,140,0.15)] px-3 py-1 text-xs font-semibold text-[var(--sea-ink-soft)]">
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--sea-ink-soft)]" />
      Coming {formatReleaseDate(releaseDate)}
      {days > 0 && ` — ${days} day${days === 1 ? '' : 's'} to go`}
    </span>
  )
}
```

- [ ] **Step 2: Create VideoSection component**

Create `src/components/Detail/VideoSection.tsx`:

```tsx
import { useState } from 'react'

interface VideoSectionProps {
  youtubeId: string | null
  nebulaUrl: string | null
  status: 'released' | 'upcoming'
  releaseDate: string | null
}

export function VideoSection({ youtubeId, nebulaUrl, status }: VideoSectionProps) {
  const [activeTab, setActiveTab] = useState<'youtube' | 'nebula'>('youtube')

  if (status === 'upcoming') {
    return (
      <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6 text-center">
        <p className="text-sm text-[var(--sea-ink-soft)]">Video coming soon</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-3 flex gap-2">
        <button
          onClick={() => setActiveTab('youtube')}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
            activeTab === 'youtube'
              ? 'bg-[rgba(255,0,0,0.1)] text-red-700'
              : 'text-[var(--sea-ink-soft)] hover:bg-[var(--link-bg-hover)]'
          }`}
        >
          YouTube
        </button>
        <button
          onClick={() => setActiveTab('nebula')}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
            activeTab === 'nebula'
              ? 'bg-[rgba(79,184,178,0.15)] text-[var(--lagoon-deep)]'
              : 'text-[var(--sea-ink-soft)] hover:bg-[var(--link-bg-hover)]'
          }`}
        >
          Nebula
        </button>
      </div>

      {activeTab === 'youtube' && youtubeId && (
        <div className="aspect-video overflow-hidden rounded-xl border border-[var(--line)]">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
            title="YouTube video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      )}

      {activeTab === 'nebula' && nebulaUrl && (
        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6 text-center">
          <p className="mb-3 text-sm text-[var(--sea-ink-soft)]">Watch on Nebula</p>
          <a
            href={nebulaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-[rgba(79,184,178,0.15)] px-5 py-2.5 text-sm font-semibold text-[var(--lagoon-deep)] no-underline transition hover:bg-[rgba(79,184,178,0.25)]"
          >
            Open on Nebula
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 2h7v7M12 2L2 12" />
            </svg>
          </a>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create CountyMiniMap component**

Create `src/components/Detail/CountyMiniMap.tsx`:

```tsx
import { useMemo } from 'react'
import { geoPath, geoMercator } from 'd3-geo'
import type { CountyFeature } from '#/hooks/useGeoData'
import type { County } from '#/types/county'

interface CountyMiniMapProps {
  feature: CountyFeature
  county: County
}

export function CountyMiniMap({ feature, county }: CountyMiniMapProps) {
  const size = 200

  const { pathD, townPos, landmarkPositions } = useMemo(() => {
    const projection = geoMercator().fitSize([size, size], feature)
    const pathGen = geoPath().projection(projection)
    const pathD = pathGen(feature) ?? ''

    const townPos = county.countyTown
      ? projection([county.countyTown.coords.lng, county.countyTown.coords.lat])
      : null

    const landmarkPositions = county.landmarks.map((lm) => ({
      name: lm.name,
      pos: projection([lm.coords.lng, lm.coords.lat]),
    }))

    return { pathD, townPos, landmarkPositions }
  }, [feature, county])

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto w-full max-w-[200px]">
      <path
        d={pathD}
        fill="rgba(79, 140, 100, 0.15)"
        stroke="rgba(90, 74, 58, 0.6)"
        strokeWidth={1}
        strokeLinejoin="round"
      />

      {/* County town marker */}
      {townPos && (
        <g>
          <circle cx={townPos[0]} cy={townPos[1]} r={4} fill="var(--lagoon-deep)" stroke="white" strokeWidth={1.5} />
          <text
            x={townPos[0]}
            y={(townPos[1] ?? 0) - 8}
            textAnchor="middle"
            style={{ fontSize: '8px', fill: 'var(--sea-ink)', fontWeight: 600 }}
          >
            {county.countyTown?.name}
          </text>
        </g>
      )}

      {/* Landmark markers */}
      {landmarkPositions.map(
        (lm) =>
          lm.pos && (
            <g key={lm.name}>
              <circle cx={lm.pos[0]} cy={lm.pos[1]} r={2.5} fill="var(--palm)" opacity={0.7} />
              <title>{lm.name}</title>
            </g>
          )
      )}
    </svg>
  )
}
```

- [ ] **Step 4: Create CountyDetail content component**

Create `src/components/Detail/CountyDetail.tsx`:

```tsx
import type { County } from '#/types/county'
import type { CountyFeature } from '#/hooks/useGeoData'
import { CountdownBadge } from './CountdownBadge'
import { CountyMiniMap } from './CountyMiniMap'
import { VideoSection } from './VideoSection'

interface CountyDetailProps {
  county: County
  feature: CountyFeature
}

export function CountyDetail({ county, feature }: CountyDetailProps) {
  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        {county.coatOfArms && (
          <img
            src={county.coatOfArms}
            alt={`${county.name} coat of arms`}
            className="h-12 w-12 object-contain"
          />
        )}
        <div>
          <h2 className="display-title text-xl font-bold text-[var(--sea-ink)]">{county.name}</h2>
          <CountdownBadge status={county.status} releaseDate={county.releaseDate} />
        </div>
      </div>

      {/* Mini map */}
      <CountyMiniMap feature={feature} county={county} />

      {/* Stats */}
      {(county.population || county.areaSqKm || county.countyTown) && (
        <div className="grid grid-cols-3 gap-3 text-center">
          {county.population && (
            <div>
              <p className="text-xs text-[var(--sea-ink-soft)]">Population</p>
              <p className="text-sm font-semibold text-[var(--sea-ink)]">
                {county.population.toLocaleString('en-GB')}
              </p>
            </div>
          )}
          {county.areaSqKm && (
            <div>
              <p className="text-xs text-[var(--sea-ink-soft)]">Area</p>
              <p className="text-sm font-semibold text-[var(--sea-ink)]">{county.areaSqKm} km²</p>
            </div>
          )}
          {county.countyTown && (
            <div>
              <p className="text-xs text-[var(--sea-ink-soft)]">County Town</p>
              <p className="text-sm font-semibold text-[var(--sea-ink)]">{county.countyTown.name}</p>
            </div>
          )}
        </div>
      )}

      {/* Description */}
      {county.description && (
        <p className="text-sm leading-relaxed text-[var(--sea-ink-soft)]">{county.description}</p>
      )}

      {/* Landmarks */}
      {county.landmarks.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--sea-ink-soft)]">
            Notable Landmarks
          </h3>
          <ul className="flex flex-wrap gap-2">
            {county.landmarks.map((lm) => (
              <li
                key={lm.name}
                className="rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1 text-xs text-[var(--sea-ink)]"
              >
                {lm.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Video */}
      <VideoSection
        youtubeId={county.youtubeId}
        nebulaUrl={county.nebulaUrl}
        status={county.status}
        releaseDate={county.releaseDate}
      />
    </div>
  )
}
```

- [ ] **Step 5: Create DetailPanel wrapper**

Create `src/components/Detail/DetailPanel.tsx`:

```tsx
import type { ReactNode } from 'react'

interface DetailPanelProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
}

export function DetailPanel({ isOpen, onClose, children }: DetailPanelProps) {
  return (
    <aside
      className={`fixed right-0 top-0 z-20 hidden h-full w-[320px] border-l border-[var(--line)] bg-[var(--surface-strong)] shadow-2xl backdrop-blur-lg transition-transform duration-300 ease-out md:block lg:w-[400px] ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="flex items-center justify-end px-4 pt-16">
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-lg transition hover:bg-[var(--link-bg-hover)]"
          aria-label="Close detail panel"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="4" x2="14" y2="14" />
            <line x1="14" y1="4" x2="4" y2="14" />
          </svg>
        </button>
      </div>
      <div className="h-[calc(100%-5rem)] overflow-y-auto px-6 pb-8">
        {children}
      </div>
    </aside>
  )
}
```

- [ ] **Step 6: Integrate DetailPanel into index.tsx**

Update `src/routes/index.tsx` to show the detail panel when a county is selected:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback, useMemo } from 'react'
import { useCountyData } from '#/hooks/useCountyData'
import { useGeoData } from '#/hooks/useGeoData'
import { fitProjectionToFeatures } from '#/lib/projection'
import { WebGLBackground } from '#/components/Map/WebGLBackground'
import { CountySVG } from '#/components/Map/CountySVG'
import { CountyLabels } from '#/components/Map/CountyLabels'
import { MapContainer } from '#/components/Map/MapContainer'
import { Header } from '#/components/Layout/Header'
import { DetailPanel } from '#/components/Detail/DetailPanel'
import { CountyDetail } from '#/components/Detail/CountyDetail'

export const Route = createFileRoute('/')({ component: MapPage })

function MapPage() {
  const { counties, loading: countiesLoading } = useCountyData()
  const { geoData, loading: geoLoading } = useGeoData()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const handleSelect = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id))
  }, [])

  const handleHover = useCallback((id: string | null) => {
    setHoveredId(id)
  }, [])

  const handleCloseDetail = useCallback(() => {
    setSelectedId(null)
  }, [])

  const selectedCounty = useMemo(
    () => counties.find((c) => c.id === selectedId),
    [counties, selectedId]
  )

  const selectedFeature = useMemo(
    () => geoData?.features.find((f) => f.properties.id === selectedId),
    [geoData, selectedId]
  )

  if (countiesLoading || geoLoading) {
    return <div className="flex h-dvh items-center justify-center"><p>Loading...</p></div>
  }

  if (!geoData) {
    return <div className="flex h-dvh items-center justify-center"><p>No geo data</p></div>
  }

  const width = 800
  const height = 900
  const { projection, pathGenerator } = fitProjectionToFeatures(width, height, geoData)

  return (
    <>
      <Header />
      <MapContainer>
        <WebGLBackground />
        <CountySVG
          geoData={geoData}
          pathGenerator={pathGenerator}
          counties={counties}
          selectedId={selectedId}
          onSelect={handleSelect}
          onHover={handleHover}
          width={width}
          height={height}
        />
        <CountyLabels
          geoData={geoData}
          projection={projection}
          width={width}
          height={height}
        />
      </MapContainer>

      <DetailPanel isOpen={!!selectedId} onClose={handleCloseDetail}>
        {selectedCounty && selectedFeature && (
          <CountyDetail county={selectedCounty} feature={selectedFeature} />
        )}
      </DetailPanel>
    </>
  )
}
```

- [ ] **Step 7: Verify detail panel**

```bash
npm run dev
```

Expected: clicking a county on desktop slides in a side panel from the right showing the county name, mini map, stats, description, landmarks, and video section. Clicking X or the same county again closes it.

- [ ] **Step 8: Commit**

```bash
git add src/components/Detail/
git add src/routes/index.tsx
git commit -m "feat: add desktop county detail side panel with mini map and video"
```

---

## Task 10: Mobile Bottom Sheet

Add the mobile bottom sheet as an alternative to the side panel.

**Files:**
- Create: `src/components/Detail/BottomSheet.tsx`
- Modify: `src/routes/index.tsx`

- [ ] **Step 1: Create BottomSheet component**

Create `src/components/Detail/BottomSheet.tsx`:

```tsx
import { useRef, useCallback, type ReactNode } from 'react'
import { useDrag } from '@use-gesture/react'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
}

type SheetState = 'closed' | 'peek' | 'full'

export function BottomSheet({ isOpen, onClose, children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef<SheetState>('peek')
  const yOffsetRef = useRef(0)

  const getSnapY = useCallback((state: SheetState) => {
    const vh = window.innerHeight
    switch (state) {
      case 'closed': return vh
      case 'peek': return vh * 0.6  // 40% visible
      case 'full': return 40        // near top, leave room for header
    }
  }, [])

  const snapTo = useCallback((state: SheetState) => {
    stateRef.current = state
    const sheet = sheetRef.current
    if (!sheet) return
    const y = getSnapY(state)
    sheet.style.transform = `translateY(${y}px)`
    sheet.style.transition = 'transform 0.3s ease-out'
    if (state === 'closed') {
      setTimeout(onClose, 300)
    }
  }, [getSnapY, onClose])

  const bind = useDrag(
    ({ movement: [, my], velocity: [, vy], direction: [, dy], cancel }) => {
      const sheet = sheetRef.current
      if (!sheet) return

      sheet.style.transition = 'none'
      const baseY = getSnapY(stateRef.current)
      const newY = Math.max(40, baseY + my)
      sheet.style.transform = `translateY(${newY}px)`

      // On release
      if (Math.abs(vy) > 0.5) {
        // Fast fling
        if (dy > 0) {
          // Fling down
          snapTo(stateRef.current === 'full' ? 'peek' : 'closed')
        } else {
          // Fling up
          snapTo('full')
        }
        cancel()
        return
      }
    },
    {
      from: () => [0, getSnapY(stateRef.current)],
      axis: 'y',
      filterTaps: true,
    }
  )

  // When sheet becomes open, snap to peek
  if (isOpen && stateRef.current === 'closed') {
    stateRef.current = 'peek'
  }

  const snapY = isOpen ? getSnapY(stateRef.current) : getSnapY('closed')

  return (
    <div
      ref={sheetRef}
      {...bind()}
      className={`fixed left-0 right-0 z-20 h-[calc(100dvh-40px)] touch-none rounded-t-2xl border-t border-[var(--line)] bg-[var(--surface-strong)] shadow-2xl backdrop-blur-lg md:hidden`}
      style={{
        transform: `translateY(${snapY}px)`,
        transition: 'transform 0.3s ease-out',
      }}
    >
      {/* Drag handle */}
      <div className="flex justify-center py-3">
        <div className="h-1 w-10 rounded-full bg-[var(--line)]" />
      </div>

      <div className="h-[calc(100%-2rem)] overflow-y-auto px-5 pb-8">
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add BottomSheet to index.tsx**

Update `src/routes/index.tsx` — add the BottomSheet alongside the DetailPanel:

After the `<DetailPanel>` block, add:

```tsx
import { BottomSheet } from '#/components/Detail/BottomSheet'

// In the return, after </DetailPanel>:
<BottomSheet isOpen={!!selectedId} onClose={handleCloseDetail}>
  {selectedCounty && selectedFeature && (
    <CountyDetail county={selectedCounty} feature={selectedFeature} />
  )}
</BottomSheet>
```

The `DetailPanel` has `hidden md:block` and `BottomSheet` has `md:hidden`, so they're mutually exclusive by breakpoint.

- [ ] **Step 3: Verify on mobile viewport**

Open browser dev tools, switch to mobile viewport (375x812). Click a county — bottom sheet should slide up to 40% height. Drag up to expand to full screen. Drag down to dismiss.

- [ ] **Step 4: Commit**

```bash
git add src/components/Detail/BottomSheet.tsx src/routes/index.tsx
git commit -m "feat: add mobile bottom sheet for county details"
```

---

## Task 11: Routing & Deep Links

Set up TanStack file routes for county deep links and legal pages.

**Files:**
- Create: `src/routes/county.$id.tsx`
- Create: `src/routes/imprint.tsx`
- Create: `src/routes/privacy.tsx`
- Modify: `src/routes/index.tsx`

- [ ] **Step 1: Create county deep link route**

Create `src/routes/county.$id.tsx`:

```tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useCountyData } from '#/hooks/useCountyData'
import { useGeoData } from '#/hooks/useGeoData'
import { fitProjectionToFeatures } from '#/lib/projection'
import { WebGLBackground } from '#/components/Map/WebGLBackground'
import { CountySVG } from '#/components/Map/CountySVG'
import { CountyLabels } from '#/components/Map/CountyLabels'
import { MapContainer } from '#/components/Map/MapContainer'
import { Header } from '#/components/Layout/Header'
import { DetailPanel } from '#/components/Detail/DetailPanel'
import { BottomSheet } from '#/components/Detail/BottomSheet'
import { CountyDetail } from '#/components/Detail/CountyDetail'

export const Route = createFileRoute('/county/$id')({ component: CountyPage })

function CountyPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { counties, loading: countiesLoading } = useCountyData()
  const { geoData, loading: geoLoading } = useGeoData()

  const handleSelect = (newId: string) => {
    if (newId === id) {
      navigate({ to: '/' })
    } else {
      navigate({ to: '/county/$id', params: { id: newId } })
    }
  }

  const handleClose = () => {
    navigate({ to: '/' })
  }

  if (countiesLoading || geoLoading) {
    return <div className="flex h-dvh items-center justify-center"><p>Loading...</p></div>
  }

  if (!geoData) {
    return <div className="flex h-dvh items-center justify-center"><p>No geo data</p></div>
  }

  const width = 800
  const height = 900
  const { projection, pathGenerator } = fitProjectionToFeatures(width, height, geoData)

  const county = counties.find((c) => c.id === id)
  const feature = geoData.features.find((f) => f.properties.id === id)

  return (
    <>
      <Header />
      <MapContainer>
        <WebGLBackground />
        <CountySVG
          geoData={geoData}
          pathGenerator={pathGenerator}
          counties={counties}
          selectedId={id}
          onSelect={handleSelect}
          onHover={() => {}}
          width={width}
          height={height}
        />
        <CountyLabels geoData={geoData} projection={projection} width={width} height={height} />
      </MapContainer>

      <DetailPanel isOpen={!!county} onClose={handleClose}>
        {county && feature && <CountyDetail county={county} feature={feature} />}
      </DetailPanel>

      <BottomSheet isOpen={!!county} onClose={handleClose}>
        {county && feature && <CountyDetail county={county} feature={feature} />}
      </BottomSheet>
    </>
  )
}
```

- [ ] **Step 2: Update index.tsx to navigate on county select**

Update `src/routes/index.tsx` — change `handleSelect` to navigate:

```tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'

// Inside MapPage:
const navigate = useNavigate()

const handleSelect = useCallback((id: string) => {
  navigate({ to: '/county/$id', params: { id } })
}, [navigate])

// Remove selectedId state — on the index route, nothing is selected
// Remove DetailPanel and BottomSheet from index.tsx (they live on the county route now)
```

- [ ] **Step 3: Create imprint page**

Create `src/routes/imprint.tsx`:

```tsx
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/imprint')({ component: ImprintPage })

function ImprintPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <Link to="/" className="mb-8 inline-flex items-center gap-1 text-sm text-[var(--lagoon-deep)]">
        &larr; Back to map
      </Link>
      <h1 className="display-title mb-6 text-3xl font-bold text-[var(--sea-ink)]">Imprint</h1>
      <div className="prose text-[var(--sea-ink-soft)]">
        <p>This is a community fan project tracking Tom Scott's "Every County" video series.</p>
        <p>This site is not affiliated with Tom Scott or his production team.</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create privacy page**

Create `src/routes/privacy.tsx`:

```tsx
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/privacy')({ component: PrivacyPage })

function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <Link to="/" className="mb-8 inline-flex items-center gap-1 text-sm text-[var(--lagoon-deep)]">
        &larr; Back to map
      </Link>
      <h1 className="display-title mb-6 text-3xl font-bold text-[var(--sea-ink)]">Data Privacy</h1>
      <div className="prose text-[var(--sea-ink-soft)]">
        <p>This site embeds YouTube videos via youtube-nocookie.com. YouTube's privacy policy applies when you play a video.</p>
        <p>No personal data is collected, stored, or processed by this site. No cookies are set by this site.</p>
        <p>The site is hosted as a static page. No analytics or tracking is used.</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Verify routing**

```bash
npm run dev
```

Test:
- `/` shows the map with no panel open
- Clicking a county navigates to `/county/rutland` and opens the panel
- Browser back returns to `/`
- `/imprint` and `/privacy` show their respective pages
- Direct URL `/county/rutland` opens with the panel showing

- [ ] **Step 6: Commit**

```bash
git add src/routes/county.\$id.tsx src/routes/imprint.tsx src/routes/privacy.tsx src/routes/index.tsx
git commit -m "feat: add county deep links, imprint, and privacy routes"
```

---

## Task 12: Mobile List View

Add the floating list-view button and scrollable county list for mobile discovery.

**Files:**
- Create: `src/components/Layout/MobileListView.tsx`
- Modify: `src/routes/index.tsx`

- [ ] **Step 1: Create MobileListView component**

Create `src/components/Layout/MobileListView.tsx`:

```tsx
import { useCallback } from 'react'
import type { County } from '#/types/county'
import { CountdownBadge } from '#/components/Detail/CountdownBadge'

interface MobileListViewProps {
  counties: County[]
  isOpen: boolean
  onClose: () => void
  onSelectCounty: (id: string) => void
}

export function MobileListView({ counties, isOpen, onClose, onSelectCounty }: MobileListViewProps) {
  const released = counties.filter((c) => c.status === 'released')
  const upcoming = counties
    .filter((c) => c.status === 'upcoming')
    .sort((a, b) => {
      if (!a.releaseDate || !b.releaseDate) return 0
      return new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime()
    })

  const handleSelect = useCallback(
    (id: string) => {
      onSelectCounty(id)
      onClose()
    },
    [onSelectCounty, onClose]
  )

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-black/30 backdrop-blur-sm transition-opacity md:hidden ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      <div
        className={`fixed inset-x-0 bottom-0 z-30 max-h-[85dvh] overflow-y-auto rounded-t-2xl border-t border-[var(--line)] bg-[var(--surface-strong)] shadow-2xl backdrop-blur-lg transition-transform duration-300 md:hidden ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-[var(--line)] bg-[var(--surface-strong)] px-5 py-3">
          <h2 className="display-title text-base font-bold text-[var(--sea-ink)]">All Counties</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[var(--link-bg-hover)]"
            aria-label="Close list"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="3" x2="13" y2="13" />
              <line x1="13" y1="3" x2="3" y2="13" />
            </svg>
          </button>
        </div>

        {released.length > 0 && (
          <div className="px-4 py-3">
            <p className="island-kicker mb-2">Released</p>
            {released.map((c) => (
              <button
                key={c.id}
                onClick={() => handleSelect(c.id)}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition hover:bg-[var(--link-bg-hover)]"
              >
                <span className="text-sm font-semibold text-[var(--sea-ink)]">{c.name}</span>
                <CountdownBadge status={c.status} releaseDate={c.releaseDate} />
              </button>
            ))}
          </div>
        )}

        {upcoming.length > 0 && (
          <div className="border-t border-[var(--line)] px-4 py-3">
            <p className="island-kicker mb-2">Coming Soon</p>
            {upcoming.map((c) => (
              <button
                key={c.id}
                onClick={() => handleSelect(c.id)}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition hover:bg-[var(--link-bg-hover)]"
              >
                <span className="text-sm text-[var(--sea-ink-soft)]">{c.name}</span>
                <CountdownBadge status={c.status} releaseDate={c.releaseDate} />
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 2: Add list button and MobileListView to index.tsx**

Add to `src/routes/index.tsx`:

```tsx
import { MobileListView } from '#/components/Layout/MobileListView'

// Add state:
const [listOpen, setListOpen] = useState(false)

// Add before </> closing:
<button
  onClick={() => setListOpen(true)}
  className="fixed bottom-4 left-4 z-10 flex h-11 items-center gap-2 rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-4 shadow-md backdrop-blur-lg md:hidden"
  aria-label="Show county list"
>
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="2" y1="4" x2="14" y2="4" />
    <line x1="2" y1="8" x2="14" y2="8" />
    <line x1="2" y1="12" x2="10" y2="12" />
  </svg>
  <span className="text-sm font-semibold text-[var(--sea-ink)]">Counties</span>
</button>

<MobileListView
  counties={counties}
  isOpen={listOpen}
  onClose={() => setListOpen(false)}
  onSelectCounty={handleSelect}
/>
```

- [ ] **Step 3: Verify on mobile viewport**

Expected: a "Counties" floating button in the bottom-left on mobile. Tapping it opens a scrollable list with released counties first, upcoming sorted by date. Tapping a county navigates to it.

- [ ] **Step 4: Commit**

```bash
git add src/components/Layout/MobileListView.tsx src/routes/index.tsx
git commit -m "feat: add mobile county list view for discovery"
```

---

## Task 13: Map Legend & Reduced Motion

Add the map legend and respect `prefers-reduced-motion`.

**Files:**
- Create: `src/components/Map/MapLegend.tsx`
- Modify: `src/routes/index.tsx`
- Modify: `src/components/Map/CountyPath.tsx`

- [ ] **Step 1: Create MapLegend component**

Create `src/components/Map/MapLegend.tsx`:

```tsx
export function MapLegend() {
  return (
    <div className="absolute bottom-4 left-4 z-10 hidden rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 shadow-md backdrop-blur-lg md:block">
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-[rgba(79,140,100,0.35)]" />
          <span className="text-[var(--sea-ink-soft)]">Released</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-[rgba(150,150,140,0.25)]" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(90,74,58,0.1) 2px, rgba(90,74,58,0.1) 3px)' }} />
          <span className="text-[var(--sea-ink-soft)]">Coming Soon</span>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add legend to index.tsx**

Add `<MapLegend />` inside the return, after `<MapContainer>` (as a sibling, not a child — it's fixed positioned):

```tsx
import { MapLegend } from '#/components/Map/MapLegend'

// In the return, after </MapContainer>:
<MapLegend />
```

- [ ] **Step 3: Add reduced motion support to CountyPath**

Update `src/components/Map/CountyPath.tsx` — check for reduced motion and skip the dash animation:

Add at the top of the component:

```tsx
const prefersReducedMotion = typeof window !== 'undefined'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches
```

Then in the dash animation section, skip if reduced motion:

```tsx
const dashProps = isHovered && !prefersReducedMotion
  ? { /* ... existing dash props ... */ }
  : { style: { transition: prefersReducedMotion ? 'none' : 'fill 0.2s ease, stroke 0.2s ease, stroke-width 0.2s ease' } }
```

- [ ] **Step 4: Verify**

```bash
npm run dev
```

Expected: legend visible on desktop bottom-left. With `prefers-reduced-motion` enabled in browser, hover animations are disabled.

- [ ] **Step 5: Commit**

```bash
git add src/components/Map/MapLegend.tsx src/components/Map/CountyPath.tsx src/routes/index.tsx
git commit -m "feat: add map legend and prefers-reduced-motion support"
```

---

## Task 14: Refactor Shared Map Rendering

The county route (`county.$id.tsx`) duplicates a lot of map rendering code from `index.tsx`. Extract shared logic.

**Files:**
- Create: `src/components/Map/MapView.tsx`
- Modify: `src/routes/index.tsx`
- Modify: `src/routes/county.$id.tsx`

- [ ] **Step 1: Create MapView component**

Create `src/components/Map/MapView.tsx` — extracts all the shared map rendering:

```tsx
import { useState, useCallback, useMemo } from 'react'
import { useCountyData } from '#/hooks/useCountyData'
import { useGeoData } from '#/hooks/useGeoData'
import { fitProjectionToFeatures } from '#/lib/projection'
import { WebGLBackground } from './WebGLBackground'
import { CountySVG } from './CountySVG'
import { CountyLabels } from './CountyLabels'
import { MapContainer } from './MapContainer'
import { MapLegend } from './MapLegend'
import { Header } from '#/components/Layout/Header'
import { DetailPanel } from '#/components/Detail/DetailPanel'
import { BottomSheet } from '#/components/Detail/BottomSheet'
import { CountyDetail } from '#/components/Detail/CountyDetail'
import type { County } from '#/types/county'
import type { CountyFeature } from '#/hooks/useGeoData'

interface MapViewProps {
  selectedId: string | null
  onSelectCounty: (id: string) => void
  onCloseDetail: () => void
}

export function MapView({ selectedId, onSelectCounty, onCloseDetail }: MapViewProps) {
  const { counties, loading: countiesLoading } = useCountyData()
  const { geoData, loading: geoLoading } = useGeoData()
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const selectedCounty = useMemo(
    () => counties.find((c) => c.id === selectedId),
    [counties, selectedId]
  )

  const selectedFeature = useMemo(
    () => geoData?.features.find((f) => f.properties.id === selectedId) as CountyFeature | undefined,
    [geoData, selectedId]
  )

  if (countiesLoading || geoLoading) {
    return <div className="flex h-dvh items-center justify-center"><p>Loading...</p></div>
  }

  if (!geoData) {
    return <div className="flex h-dvh items-center justify-center"><p>No geo data</p></div>
  }

  const width = 800
  const height = 900
  const { projection, pathGenerator } = fitProjectionToFeatures(width, height, geoData)

  return (
    <>
      <Header />
      <MapContainer>
        <WebGLBackground />
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
        <CountyLabels geoData={geoData} projection={projection} width={width} height={height} />
      </MapContainer>
      <MapLegend />

      <DetailPanel isOpen={!!selectedCounty} onClose={onCloseDetail}>
        {selectedCounty && selectedFeature && (
          <CountyDetail county={selectedCounty} feature={selectedFeature} />
        )}
      </DetailPanel>

      <BottomSheet isOpen={!!selectedCounty} onClose={onCloseDetail}>
        {selectedCounty && selectedFeature && (
          <CountyDetail county={selectedCounty} feature={selectedFeature} />
        )}
      </BottomSheet>
    </>
  )
}
```

- [ ] **Step 2: Simplify index.tsx**

Replace `src/routes/index.tsx`:

```tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback, useState } from 'react'
import { MapView } from '#/components/Map/MapView'
import { MobileListView } from '#/components/Layout/MobileListView'
import { useCountyData } from '#/hooks/useCountyData'

export const Route = createFileRoute('/')({ component: MapPage })

function MapPage() {
  const navigate = useNavigate()
  const { counties } = useCountyData()
  const [listOpen, setListOpen] = useState(false)

  const handleSelect = useCallback((id: string) => {
    navigate({ to: '/county/$id', params: { id } })
  }, [navigate])

  return (
    <>
      <MapView selectedId={null} onSelectCounty={handleSelect} onCloseDetail={() => {}} />

      <button
        onClick={() => setListOpen(true)}
        className="fixed bottom-4 left-4 z-10 flex h-11 items-center gap-2 rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-4 shadow-md backdrop-blur-lg md:hidden"
        aria-label="Show county list"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="2" y1="4" x2="14" y2="4" />
          <line x1="2" y1="8" x2="14" y2="8" />
          <line x1="2" y1="12" x2="10" y2="12" />
        </svg>
        <span className="text-sm font-semibold text-[var(--sea-ink)]">Counties</span>
      </button>

      <MobileListView
        counties={counties}
        isOpen={listOpen}
        onClose={() => setListOpen(false)}
        onSelectCounty={handleSelect}
      />
    </>
  )
}
```

- [ ] **Step 3: Simplify county.$id.tsx**

Replace `src/routes/county.$id.tsx`:

```tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback } from 'react'
import { MapView } from '#/components/Map/MapView'

export const Route = createFileRoute('/county/$id')({ component: CountyPage })

function CountyPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()

  const handleSelect = useCallback((newId: string) => {
    if (newId === id) {
      navigate({ to: '/' })
    } else {
      navigate({ to: '/county/$id', params: { id: newId } })
    }
  }, [id, navigate])

  const handleClose = useCallback(() => {
    navigate({ to: '/' })
  }, [navigate])

  return <MapView selectedId={id} onSelectCounty={handleSelect} onCloseDetail={handleClose} />
}
```

- [ ] **Step 4: Verify everything still works**

```bash
npm run dev
```

Test both routes, detail panels, and mobile views.

- [ ] **Step 5: Commit**

```bash
git add src/components/Map/MapView.tsx src/routes/index.tsx src/routes/county.\$id.tsx
git commit -m "refactor: extract shared MapView component to deduplicate route code"
```

---

## Task 15: Populate Full County Data

Fill in all 48 ceremonial counties in the JSON file with basic data. Videos will be placeholder for now.

**Files:**
- Modify: `public/data/counties.json`

- [ ] **Step 1: Populate all 48 counties**

Update `public/data/counties.json` with all 48 ceremonial counties of England. Each needs at minimum: `id`, `name`, `status` (`"upcoming"` for most), `releaseDate` (null for unknown). For counties with known data, fill in `population`, `areaSqKm`, `countyTown` (with coords), `description`, `landmarks` (with coords).

This is a data entry task. Research each county and fill in the fields. The `id` values must match the GeoJSON feature property IDs generated in Task 3.

The full list of 48 ceremonial counties:
Bedfordshire, Berkshire, Bristol, Buckinghamshire, Cambridgeshire, Cheshire, City of London, Cornwall, Cumbria, Derbyshire, Devon, Dorset, Durham, East Riding of Yorkshire, East Sussex, Essex, Gloucestershire, Greater London, Greater Manchester, Hampshire, Herefordshire, Hertfordshire, Isle of Wight, Kent, Lancashire, Leicestershire, Lincolnshire, Merseyside, Middlesex, Norfolk, North Yorkshire, Northamptonshire, Northumberland, Nottinghamshire, Oxfordshire, Rutland, Shropshire, Somerset, South Yorkshire, Staffordshire, Suffolk, Surrey, Tyne and Wear, Warwickshire, West Midlands, West Sussex, West Yorkshire, Wiltshire, Worcestershire.

Note: That's 49 items — the exact count may vary (City of London and Greater London are sometimes counted separately). Verify against the GeoJSON features.

- [ ] **Step 2: Verify all IDs match GeoJSON**

```bash
node -e "
const geo = JSON.parse(require('fs').readFileSync('public/data/england-counties.geo.json','utf8'));
const data = JSON.parse(require('fs').readFileSync('public/data/counties.json','utf8'));
const geoIds = new Set(geo.features.map(f => f.properties.id));
const dataIds = new Set(data.counties.map(c => c.id));
const missingInData = [...geoIds].filter(id => !dataIds.has(id));
const missingInGeo = [...dataIds].filter(id => !geoIds.has(id));
console.log('GeoJSON features:', geoIds.size);
console.log('Data counties:', dataIds.size);
if (missingInData.length) console.log('In GeoJSON but missing from data:', missingInData);
if (missingInGeo.length) console.log('In data but missing from GeoJSON:', missingInGeo);
if (!missingInData.length && !missingInGeo.length) console.log('All IDs match!');
"
```

Expected: "All IDs match!"

- [ ] **Step 3: Commit**

```bash
git add public/data/counties.json
git commit -m "feat: populate all 48 ceremonial counties with basic data"
```

---

## Task 16: Coastline Animation Enhancement

Add the animated coastline/water effect to the WebGL shader.

**Files:**
- Modify: `src/shaders/background.frag.glsl`

- [ ] **Step 1: Enhance the background shader with coastline water**

Update `src/shaders/background.frag.glsl` — add a water detection area and animated coastal effects. The water is anything outside the land area. Since we don't have a land mask texture, we approximate using coordinates (England roughly occupies a known UV region).

Add before the `main()` function:

```glsl
// Water / coastline effect
vec3 waterColor(vec2 uv, float time) {
  // Deep blue-green water base
  vec3 deepWater = vec3(0.22, 0.35, 0.38);
  vec3 lightWater = vec3(0.32, 0.48, 0.50);

  // Animated waves
  float wave1 = snoise(uv * 15.0 + vec2(time * 0.08, time * 0.05)) * 0.5 + 0.5;
  float wave2 = snoise(uv * 25.0 - vec2(time * 0.12, time * 0.03)) * 0.5 + 0.5;
  float waves = wave1 * 0.6 + wave2 * 0.4;

  vec3 water = mix(deepWater, lightWater, waves * 0.3);

  // Stippled wave lines (old map style)
  float stipple = sin((uv.x + uv.y * 0.5) * 80.0 + time * 2.0) * 0.5 + 0.5;
  stipple = smoothstep(0.4, 0.6, stipple);
  water += stipple * 0.03;

  return water;
}
```

Update `main()` to detect water areas and blend:

```glsl
void main() {
  vec2 uv = v_uv;

  // Paper base
  vec3 paper = paperTexture(uv);

  // Terrain
  float h = terrainHeight(uv);
  vec3 terrain = terrainColor(h);
  float shade = hillshade(uv);
  terrain *= mix(0.7, 1.1, shade);

  // Land/terrain blended with paper
  vec3 land = mix(paper, terrain, 0.55);
  land += fbm(uv * 60.0, 3) * 0.02;

  // Water
  vec3 water = waterColor(uv, u_time);
  // Blend water with paper texture
  water = mix(paper * 0.7, water, 0.6);

  // For now, the whole canvas is land+paper. The SVG layer handles
  // which areas are counties. We'll make the edges look like water.
  // Use a simple gradient: water at the edges, land in the center
  float edgeDist = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  float waterMask = smoothstep(0.15, 0.05, edgeDist);

  vec3 color = mix(land, water, waterMask);

  // Subtle time-based warmth
  color += vec3(0.008, 0.004, 0.0) * sin(u_time * 0.3);

  gl_FragColor = vec4(color, 1.0);
}
```

- [ ] **Step 2: Verify animated coastline**

```bash
npm run dev
```

Expected: edges of the canvas show animated blue-green water with stippled wave lines. The land area in the center shows the terrain + paper blend. The animation should be subtle and smooth.

- [ ] **Step 3: Commit**

```bash
git add src/shaders/background.frag.glsl
git commit -m "feat: add animated coastline water effect to WebGL background"
```

---

## Task 17: Styles Cleanup & Antique Theme Polish

Update the CSS to properly support the map layout and antique aesthetic.

**Files:**
- Modify: `src/styles.css`

- [ ] **Step 1: Clean up styles.css**

Remove starter-specific styles and ensure the map-centric layout works. Update `src/styles.css`:

- Keep the font imports (Fraunces + Manrope)
- Keep the Tailwind import and theme config
- Keep the CSS custom properties (they work well for the antique theme)
- Remove the `body` background gradients (the WebGL canvas handles this now)
- Remove the `body::before` and `body::after` pseudo-elements
- Keep `.display-title`, `.island-kicker`, utility classes

Key changes:

```css
body {
  margin: 0;
  color: var(--sea-ink);
  font-family: var(--font-sans);
  background-color: #f4e8c1; /* fallback parchment if WebGL fails */
  overflow: hidden; /* map is full-viewport */
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

Remove `body::before` and `body::after` blocks entirely.

- [ ] **Step 2: Verify no visual regressions**

```bash
npm run dev
```

Expected: map page looks the same (WebGL handles background). Legal pages still render correctly.

- [ ] **Step 3: Commit**

```bash
git add src/styles.css
git commit -m "chore: clean up CSS for map-centric layout, remove starter backgrounds"
```

---

## Task 18: Build Verification & Final Checks

Ensure everything builds, runs, and the main flows work.

**Files:** None new — verification only.

- [ ] **Step 1: Run build**

```bash
npm run build
```

Expected: builds successfully with no TypeScript errors.

- [ ] **Step 2: Run preview**

```bash
npm run preview
```

Test the production build locally:
- Map renders with WebGL background + SVG counties
- Hovering counties highlights them
- Clicking navigates to `/county/<id>` with detail panel
- Mobile viewport: bottom sheet works, list view works
- Menu overlay opens/closes
- `/imprint` and `/privacy` pages render
- Deep linking to `/county/rutland` works

- [ ] **Step 3: Check for console errors**

Open browser dev tools, check for:
- No WebGL shader compilation errors
- No fetch failures for JSON/GeoJSON
- No React errors or warnings

- [ ] **Step 4: Commit any fixes**

If any issues were found and fixed:

```bash
git add -A
git commit -m "fix: address build verification issues"
```

- [ ] **Step 5: Final commit if everything is clean**

```bash
git log --oneline -15
```

Verify the commit history is clean and each commit represents a logical unit of work.

---

## Task 19: Polish — Fly-to-County, Label Visibility & Parallax

Address remaining spec requirements for map interaction polish.

**Files:**
- Modify: `src/hooks/useMapTransform.ts`
- Modify: `src/components/Map/MapView.tsx`
- Modify: `src/components/Map/CountyLabels.tsx`
- Modify: `src/hooks/useWebGLCanvas.ts`

- [ ] **Step 1: Add flyTo method to useMapTransform**

Update `src/hooks/useMapTransform.ts` — add a `flyTo` function that smoothly animates the map to center on a given point:

```ts
const flyTo = useCallback((targetX: number, targetY: number, targetScale?: number) => {
  setTransform({
    x: -targetX + window.innerWidth / 2,
    y: -targetY + window.innerHeight / 2,
    scale: targetScale ?? Math.max(2, transform.scale),
  })
}, [transform.scale])
```

Export `flyTo` from the hook.

- [ ] **Step 2: Call flyTo when a county is selected**

In `MapView`, when `selectedId` changes, compute the centroid of the selected county and call `flyTo`. Use `geoCentroid` from d3-geo to get the center, then project it to screen coordinates.

- [ ] **Step 3: Make CountyLabels zoom-aware**

Update `src/components/Map/CountyLabels.tsx` to accept a `scale` prop from the map transform. Hide labels when `scale < 1.5` on mobile (< 768px viewport):

```tsx
const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
const showLabels = isMobile ? scale >= 1.5 : true

if (!showLabels) return null
```

Pass the current `transform.scale` from MapContainer down through MapView.

- [ ] **Step 4: Add subtle parallax to WebGL canvas**

Update `src/hooks/useWebGLCanvas.ts` to track mouse position and pass it as a uniform `u_mouse` to the shader. Add to `background.frag.glsl`:

```glsl
uniform vec2 u_mouse; // normalized 0-1

// In main(), offset the UV slightly based on mouse position for parallax:
vec2 parallaxOffset = (u_mouse - 0.5) * 0.01;
vec2 uv = v_uv + parallaxOffset;
```

Track mouse in the hook:

```ts
const mouseRef = useRef({ x: 0.5, y: 0.5 })

useEffect(() => {
  const handleMouse = (e: MouseEvent) => {
    mouseRef.current = {
      x: e.clientX / window.innerWidth,
      y: e.clientY / window.innerHeight,
    }
  }
  window.addEventListener('mousemove', handleMouse)
  return () => window.removeEventListener('mousemove', handleMouse)
}, [])

// In render loop:
const uMouse = gl.getUniformLocation(program, 'u_mouse')
gl.uniform2f(uMouse, mouseRef.current.x, mouseRef.current.y)
```

Skip parallax if `prefers-reduced-motion` is set (pass `0.5, 0.5` as static center).

- [ ] **Step 5: Verify all polish items**

```bash
npm run dev
```

Test:
- Clicking a county smoothly pans the map to center it
- On mobile, labels are hidden at default zoom but appear when zoomed in
- Moving the mouse causes a subtle parallax shift on the background

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useMapTransform.ts src/components/Map/MapView.tsx src/components/Map/CountyLabels.tsx src/hooks/useWebGLCanvas.ts src/shaders/background.frag.glsl
git commit -m "feat: add fly-to-county, zoom-dependent labels, and mouse parallax"
```
