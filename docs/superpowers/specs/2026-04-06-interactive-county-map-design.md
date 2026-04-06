# Interactive Map of England's Counties — Design Spec

An interactive antique-style map of England's 48 ceremonial counties. Each county links to a Tom Scott video (YouTube + Nebula) from his ongoing "Every County" series. Community-editable via a JSON file so anyone can add info or update videos through a GitHub PR.

## Data Layer

### `public/data/counties.json`

Single source of truth for all county data. Structure per county:

```json
{
  "id": "rutland",
  "name": "Rutland",
  "population": 41043,
  "areaSqKm": 382,
  "countyTown": {
    "name": "Oakham",
    "coords": [52.6703, -0.7290]
  },
  "description": "England's smallest historic county...",
  "coatOfArms": "/assets/arms/rutland.svg",
  "landmarks": [
    { "name": "Rutland Water", "coords": [52.6580, -0.7200] },
    { "name": "Oakham Castle", "coords": [52.6710, -0.7310] }
  ],
  "youtubeId": "abc123",
  "nebulaUrl": "https://nebula.tv/videos/...",
  "status": "released",
  "releaseDate": "2026-03-20"
}
```

- `status`: `"released"` or `"upcoming"`
- `releaseDate`: always present — shows "Released [date]" for released, "Coming [date] (X days)" for upcoming
- Upcoming counties only need `id`, `name`, `status`, `releaseDate` — the rest gets filled in via PR when the video drops
- `id` matches the GeoJSON feature property for polygon-to-data linkage
- Coords are `[lat, lng]` pairs

### `public/data/england-counties.geo.json`

GeoJSON for the 48 ceremonial county boundaries, downloaded from https://county-borders.co.uk/. Committed to the repo.

### `public/assets/arms/`

Coat of arms SVGs, one per county (e.g., `rutland.svg`).

### England Heightmap

A ~512x512 elevation texture of England used by the WebGL terrain shader. Source: publicly available SRTM or OS Terrain 50 DEM data, converted to a PNG heightmap (grayscale, white = high elevation) and committed to `public/assets/england-heightmap.png`.

## Map Architecture: SVG + WebGL Layers

The main view is a full-viewport map composed of three layers stacked via CSS:

### Layer 1 (back): WebGL Canvas — Atmosphere & Terrain

A fullscreen `<canvas>` element running raw WebGL (no Three.js — overkill for fullscreen quad shaders). Wrapped in a custom React hook.

**Paper texture (full canvas):**
- Multi-octave Perlin noise for fiber grain
- Warm yellowed base tone (#f4e8c1 range)
- Subtle vignette darkening at edges
- Faint fold-line creases (fixed-position darker lines)

**Terrain elevation:**
- Heightmap texture of England colorized by elevation: deep green valleys, lighter green hills, tan/brown uplands, muted purple peaks (Lake District, Pennines)
- Subtle hillshading (simulated light from northwest — classic cartographic convention)
- Visible through the semi-transparent SVG county fills

**Coastline animation:**
- Edge detection on the land boundary
- Animated wave lines rippling outward from the coast (stippled sea style)
- Gentle color shift in the water (deep blue-green, subtle movement)

**Interaction response:**
- Subtle parallax on mouse movement
- When hovering a county: the SVG layer passes the hovered county ID to a shared React state; the WebGL shader receives the county's bounding box or a mask texture and brightens the terrain beneath it

**Performance:**
- All shaders run at half-resolution on mobile, upscaled with CSS
- Coastline animation frame rate capped at 30fps
- Terrain heightmap is a single small texture (~512x512)
- Paper grain is procedural (no large texture downloads)

### Layer 2 (mid): SVG Overlay — County Polygons

GeoJSON projected to screen coordinates via `d3-geo` and rendered as SVG `<path>` elements.

- Each county is a clickable/hoverable polygon
- Released counties: semi-transparent fill that lets the terrain show through
- Upcoming counties: desaturated/greyed out with a hatching pattern (like uncharted territory on old maps)
- Hover effect: county border glows, slight brightness increase, hand-drawn border animation (dash-offset to simulate being "drawn in")
- County name labels rendered as SVG text, styled to look like hand-lettered cartography

### Layer 3 (front): UI Chrome

- Header bar (floating, transparent with backdrop blur)
- Legend ("Released" / "Coming soon")
- Desktop: side panel (slides in on county click)
- Mobile: bottom sheet (slides up on county tap)

### Zoom & Pan

CSS/JS transform-based (no map library). SVG and WebGL canvas transform in sync.
- Desktop: scroll-wheel zoom, drag to pan
- Mobile: pinch-to-zoom, drag to pan
- Powered by `@use-gesture/react`

## County Detail View

### Side Panel (Desktop, >1024px)

~400px wide, slides in from the right. Map pans to keep selected county centered in remaining space. Close button or click another county to switch.

### Bottom Sheet (Mobile, <768px)

- Tap a county: sheet slides up to ~40% height showing header + stats
- Drag up: expands to full screen, revealing video + landmarks
- Drag down or tap outside: dismisses

### Content Layout

**Header area:**
- County coat of arms SVG (small, top-left)
- County name in Fraunces display serif
- Status badge: "Released [date]" or "Coming [date] — X days to go"

**County outline map:**
- County polygon rendered as standalone SVG, zoomed to fit
- County town marked with a pin/dot icon + label
- Landmarks shown as discoverable markers (icon, name on hover/tap)
- Antique styling (paper tint, hand-drawn border feel)

**Info section:**
- Population, area (sq km), county town — compact stat row
- Short paragraph description

**Video section:**
- Two buttons: "YouTube" and "Nebula"
- YouTube: embedded iframe player
- Nebula: link out (no public embed API)
- Upcoming counties: countdown displayed prominently instead, with "Subscribe to get notified" link

## Header & Menu

**Header bar:**
- Floating overlay on the map (transparent + backdrop blur, using existing `--header-bg` style)
- Left: project title/logo
- Right: hamburger menu icon (all breakpoints for consistency)

**Menu sidebar overlay:**
- Slides in as full-height overlay panel
- Semi-transparent backdrop dims the map
- Contains: Imprint, Data Privacy, About, future links
- Antique aesthetic (paper-toned background, serif headings)
- Close button + click-outside-to-dismiss
- Mobile: full-width overlay

## Responsive Layout

**Desktop (>1024px):**
- Full viewport map, floating header bar
- Side panel from right on county click (400px)
- Map pans to keep selected county centered in remaining space
- Mouse hover shows county name tooltip + highlight

**Tablet (768–1024px):**
- Same as desktop, side panel narrower (~320px)
- County labels slightly smaller

**Mobile (<768px):**
- Map fills full viewport, title in small floating chip top-left
- Bottom sheet on county tap
- County names hidden at default zoom, appear on zoom in
- Floating "list view" button — shows all 48 counties as scrollable list (released first, upcoming at bottom). Tapping a county flies the map to it and opens the sheet.
- Zoom controls: bottom-left (avoids thumb conflict with sheet)

**Shared:**
- Floating +/- zoom buttons, reset zoom compass icon
- All touch targets minimum 44x44px
- `prefers-reduced-motion`: disable coastline animation, parallax, hand-drawn animations. Static but styled.

## Routing

- **`/`** — main map view
- **`/county/:id`** — deep link to a specific county (map centers on it, detail panel opens). Shareable.
- **`/imprint`** — legal page
- **`/privacy`** — data privacy page

County routes don't navigate away from the map — they set the URL and open the panel. Browser back closes the panel, returns to `/`.

Existing starter routes (`/about`, `/demo.i18n`) are removed.

## Technology Stack

**Already in place:**
- Vite 7 + TanStack Start + React 19
- Tailwind v4 (with `@tailwindcss/vite`)
- TypeScript, shadcn/ui primitives
- Fraunces + Manrope fonts

**To add:**
- Raw WebGL (custom hook, no Three.js) — fullscreen quad shaders for paper/terrain/coastline
- `d3-geo` — GeoJSON to SVG coordinate projection
- `@use-gesture/react` — pinch-to-zoom, drag-to-pan, bottom sheet drag

**Build-time assets:**
- GeoJSON from county-borders.co.uk (committed to repo)
- England heightmap texture (~512x512)
- Coat of arms SVGs per county

**Not using:**
- Leaflet/MapLibre (custom SVG + WebGL instead)
- Three.js (raw WebGL is simpler for fullscreen shaders)
- Any database or API (static JSON)
