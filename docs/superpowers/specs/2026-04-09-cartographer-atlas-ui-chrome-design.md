# Cartographer's Atlas — UI Chrome Redesign

## Overview

Rework all UI chrome (header, sidebar, menu, buttons, controls) from the current nautical/frosted-glass aesthetic to a "There Be Dragons" aged-parchment cartographic style. Parchment/sepia base with vivid accent colors (red, green, gold) for interactive elements. Includes a full sidebar content reorder and new landmark hover interaction.

## Design Decisions

| Element | Choice | Notes |
|---------|--------|-------|
| Aesthetic | Aged Parchment + vivid accents | Sepia base, gold highlights, red/green for actions |
| Header | Floating cartouche | No header bar; logo floats on map with subtitle |
| Menu | Simple drawer, left-slide | Parchment-styled, integrated trigger in cartouche |
| Sidebar | Bound atlas page | Leather spine, gold borders, corner ornaments |
| Map controls | Parchment buttons | Matching ink icons with gold borders |

## 1. Design Tokens (`src/styles.css`)

Replace the existing nautical palette with parchment/ink/gold tokens. Keep the same CSS custom property names where possible to minimize downstream changes.

### Light Mode

| Token | Value | Role |
|-------|-------|------|
| `--parchment` | `#f5e6c8` | Primary background surface |
| `--parchment-light` | `#faf3e0` | Lighter surface variant |
| `--parchment-dark` | `#e8d4a5` | Darker surface / hover state |
| `--ink` | `#3d2e1a` | Primary text |
| `--ink-soft` | `#8b7355` | Secondary/muted text |
| `--ink-faint` | `rgba(139,115,85,0.5)` | Tertiary text, placeholders |
| `--gold` | `#8b6914` | Accent, section headers, kickers |
| `--gold-line` | `rgba(180,140,60,0.3)` | Gold rule lines, borders |
| `--gold-line-subtle` | `rgba(180,140,60,0.15)` | Inner gold rules |
| `--leather` | `#5a4232` | Spine, strong borders |
| `--leather-dark` | `#2a1a0a` | Spine edge shadow |
| `--red-action` | `#9b2010` | YouTube, watch buttons text |
| `--red-action-bg` | `rgba(180,50,30,0.14)` | Watch button background |
| `--red-action-border` | `rgba(180,50,30,0.35)` | Watch button border |
| `--green-released` | `#2f6a4a` | Released status (keep existing `--palm`) |
| `--green-released-bg` | `rgba(79,140,100,0.15)` | Released badge bg |
| `--nebula-teal` | `#4fb8b2` | Nebula button accent |
| `--surface` | `rgba(244,228,193,0.94)` | Floating element backgrounds |
| `--surface-strong` | `rgba(248,235,205,0.97)` | Panel backgrounds |
| `--line` | `rgba(139,115,85,0.25)` | General borders/dividers |
| `--line-dotted` | `rgba(139,115,85,0.22)` | Dotted list separators |
| `--shadow-soft` | `rgba(90,74,58,0.15)` | Subtle shadows |
| `--shadow-strong` | `rgba(0,0,0,0.35)` | Panel drop shadows |
| `--wax-red` | `#c41e3a` | Wax seal accent (mobile FAB, decorative) |

### Dark Mode

Dark mode becomes "aged vellum" — darker, warmer parchment tones. All tokens not listed below keep their light-mode value:

| Token | Value |
|-------|-------|
| `--parchment` | `#1a1209` |
| `--parchment-light` | `#221a0f` |
| `--parchment-dark` | `#120c06` |
| `--ink` | `#d4c4a0` |
| `--ink-soft` | `rgba(180,155,115,0.7)` |
| `--ink-faint` | `rgba(180,155,115,0.35)` |
| `--gold` | `#c4a040` |
| `--gold-line` | `rgba(180,140,60,0.25)` |
| `--gold-line-subtle` | `rgba(180,140,60,0.12)` |
| `--leather` | `#3a2a18` |
| `--leather-dark` | `#1a0f05` |
| `--red-action` | `#d4644a` |
| `--red-action-bg` | `rgba(200,70,50,0.15)` |
| `--red-action-border` | `rgba(200,70,50,0.3)` |
| `--green-released` | `#6ec89a` |
| `--green-released-bg` | `rgba(110,200,154,0.12)` |
| `--nebula-teal` | `#60d7cf` |
| `--surface` | `rgba(26,18,9,0.94)` |
| `--surface-strong` | `rgba(34,26,15,0.97)` |
| `--line` | `rgba(180,140,60,0.18)` |
| `--line-dotted` | `rgba(180,140,60,0.15)` |
| `--shadow-soft` | `rgba(0,0,0,0.25)` |
| `--shadow-strong` | `rgba(0,0,0,0.5)` |

### Fonts

Keep `Fraunces` (serif, display) and `Manrope` (sans, body). Shift balance: Fraunces becomes the primary UI font for all chrome text (labels, nav items, county names). Manrope reserved for small functional text (badge counts, timestamps) only.

### Global Utility Classes

Update existing classes:

- `.island-shell` → `.atlas-panel`: Gold-bordered parchment surface with leather spine left-border, double gold inset rules, corner ornament positioning hooks
- `.island-kicker` → `.atlas-kicker`: Same uppercase treatment, color changes to `--gold`
- `.nav-link`: Serif font, gold underline gradient on hover
- `.rise-in`: Keep as-is

## 2. Floating Cartouche Header (`src/components/Layout/Header.tsx`)

Remove the fixed full-width header bar. Replace with a floating cartouche element.

### Structure

```
<div class="cartouche"> <!-- fixed top-14 left-14, z-30 -->
  <button class="cartouche-menu-btn" />   <!-- hamburger icon, opens left drawer -->
  <svg class="cartouche-compass" />        <!-- compass rose icon -->
  <div class="cartouche-title">
    <span class="cartouche-name">Every County</span>
    <span class="cartouche-subtitle">A Cartographic Journey</span>
  </div>
</div>
```

### Styling

- `position:fixed; top:14px; left:14px; z-index:30`
- Background: `var(--surface)` with `backdrop-blur`
- Border: `2px solid var(--line)`
- Border radius: `10px`
- Padding: `8px 16px`
- Ornamental corner accents: gold `::before`/`::after` pseudo-elements on top-left and top-right corners (2px gold border segments)
- Box shadow: `0 3px 10px var(--shadow-soft)`
- Menu button: no border, transparent bg, hover shows `var(--parchment-dark)`, 24x24 ink-colored hamburger SVG
- Compass: existing compass SVG, `--gold` stroke, 18x18
- Title: Fraunces 15px bold `--ink`, subtitle 8px uppercase `--ink-soft` with letter-spacing

### Behavior

- `pointer-events:auto` on the cartouche itself (no full-width wrapper needed)
- Hamburger click opens the left-sliding menu overlay
- No theme toggle in the cartouche — add a light/dark toggle as the last nav item in the menu overlay (sun/moon icon + "Light Mode" / "Dark Mode" label)

## 3. Menu Overlay (`src/components/Layout/MenuOverlay.tsx`)

### Changes from current

- Slide direction: **left** instead of right (`translate-x` from `-100%` to `0`)
- Position: `fixed left-0 top-0 h-full`
- Width: `max-w-xs` (md: `max-w-sm`) — same as current

### Styling

- Background: `var(--surface-strong)` (parchment, not frosted glass)
- Left border: none (it's flush left). Right border: `1px solid var(--line)`
- Backdrop blur on the overlay backdrop: `bg-black/30 backdrop-blur-sm` (keep)
- Header area: "Navigation" in `--gold`, 10px uppercase, `letter-spacing:0.2em`
- Gold divider: `linear-gradient(90deg, transparent, var(--gold-line), transparent)`
- Nav items: Fraunces 16px, `--ink-soft` default, `--ink` on hover/active
- Active item: left gold border accent (`border-left: 3px solid var(--gold)`) + subtle gold bg
- Sub-descriptions: italic `--ink-soft` 11px below each nav item
- Footer blurb: italic `--ink-soft` at bottom

### Behavior

- Escape key closes (keep)
- Backdrop click closes (keep)
- Transition: `duration-300 ease-out` (keep)

## 4. Detail Panel — Bound Atlas Page (`src/components/Detail/DetailPanel.tsx`)

### Visual Treatment

- `position:fixed; right:0; top:0; bottom:0; z-index:20`
- Width: `w-[320px]` (lg: `w-[400px]`) — same as current
- Slide animation: `translateX` right-to-left (keep)

**Leather spine:**
- Left border: 14px wide div with leather gradient (`linear-gradient(90deg, var(--leather-dark), var(--leather), var(--leather-dark))`)
- Gold stitching: repeating vertical gradient on the spine center (5px gold, 5px transparent)

**Page surface:**
- Background: `var(--parchment-light)`
- Double gold rule inset: outer border 2px `var(--gold-line)` at 12px inset, inner border 0.5px `var(--gold-line-subtle)` at 16px inset
- Both via `::before` and `::after` pseudo-elements with `position:absolute; pointer-events:none`

**Corner ornaments:**
- Four SVG corner flourishes (leaf/scroll motif), positioned at 8px from each corner
- Opacity 0.45, stroke `var(--gold)`
- Existing hand-drawn SVG style

**Close button:**
- Top-right, inside the gold border
- `border-radius:8px; border:1px solid var(--line); background:var(--parchment-dark)` on hover

### Content Reorder (`src/components/Detail/CountyDetail.tsx`)

Current order: name → mini map → stats → landmarks → video
New order:

1. **Video embed** (`VideoSection`)
   - Moves to the very top of the panel content
   - `aspect-video rounded-lg border border-[var(--line)]`
   - Sits within the scrollable content area below the close button

2. **Platform buttons** (YouTube / Nebula)
   - Two side-by-side buttons below the video
   - YouTube: `--red-action` text, `--red-action-bg` background, `--red-action-border` border
   - Nebula: `--nebula-teal` text, teal-tinted bg/border
   - Both: Fraunces 12px, `border-radius:6px`, `padding:10px`, full-width in a 2-col grid

3. **County name + description**
   - Gold kicker label: "County Details" in `--gold`, 9px uppercase
   - Gold divider line
   - Name: Fraunces 22px bold `--ink`
   - Description: 13px italic `--ink-soft`

4. **Mini map** (`CountyMiniMap`)
   - Same SVG rendering, styled with parchment background
   - Border: `1px solid var(--gold-line)`
   - Landmark dots rendered as small circles with `data-landmark-id` attributes
   - Default: `var(--green-released)` fill at 0.4 opacity
   - Highlighted (on landmark list hover): scale to 1.5x, opacity 1.0, gold stroke — via CSS class toggle

5. **Stats** (towns, landmarks count)
   - Side-by-side, separated by a vertical gold gradient line
   - Numbers: Fraunces 18px bold
   - Labels: 8px uppercase `--ink-soft`

6. **Landmarks list**
   - Section header: `--gold` kicker
   - Each item: 12px `--ink`, dotted bottom border `var(--line-dotted)`
   - **On hover**: 
     - Background shifts to `var(--parchment-dark)`
     - Corresponding dot in mini map above gets highlighted class
     - Popover appears (see below)

### Landmark Popover

- Triggered on hover of a landmark list item
- Positioned above the hovered item, pointing down with a small triangle
- Content: landmark name (bold) + one-line description if available
- Styling: `var(--surface)` bg, `var(--line)` border, `border-radius:8px`, `padding:8px 12px`, `box-shadow` with `--shadow-soft`
- Small downward-pointing triangle pseudo-element
- Appears with `opacity` + `translateY(-4px)` transition

### Landmark ↔ Mini Map Coordination

- `CountyDetail` manages a `hoveredLandmarkId` state
- Passed down to both the landmarks list and `CountyMiniMap`
- Mini map dots have `data-landmark-id` matching the landmark list items
- On hover: landmarks list sets `hoveredLandmarkId`, mini map applies `.landmark-highlight` class to matching dot
- CSS handles the visual change (scale, opacity, stroke)

## 5. Bottom Sheet — Mobile (`src/components/Detail/BottomSheet.tsx`)

Same content reorder as DetailPanel. Visual treatment simplified for mobile:

- No leather spine (unnecessary on a bottom sheet)
- Background: `var(--parchment-light)`
- Top border-radius: `rounded-t-2xl` (keep)
- Drag handle: gold-tinted pill instead of grey (`var(--gold-line)`)
- Single gold rule line below the drag handle area
- Corner ornaments: top-left and top-right only
- Content and interactions identical to desktop panel

## 6. Map Controls (`src/components/Map/MapControls.tsx`)

- Same position: `absolute bottom-4 right-4` (mobile), `top-20 right-4` (md+)
- Three stacked buttons in `flex-col gap-2`
- Each button: `44x44px`, `border-radius:10px`
- Background: `var(--surface)` with `backdrop-blur`
- Border: `1.5px solid var(--line)`
- Icons: hand-drawn SVG style, `stroke: var(--ink)`, `stroke-width:2`
- Hover: `background: var(--parchment-dark)`
- Active: `scale-95` (keep)
- Box shadow: `0 2px 8px var(--shadow-soft)`

## 7. Supporting Elements

### Map Legend (`MapLegend.tsx`)
- Same position and structure
- Background: `var(--surface)` with `backdrop-blur`
- Border: `var(--line)`
- Legend squares: released = `var(--green-released)` fill, coming soon = hatched pattern using `var(--ink-soft)`
- Text: Fraunces serif

### Mobile Counties FAB (`routes/index.tsx`)
- Parchment pill: `var(--surface)` bg, `var(--line)` border
- Icon: list SVG in `var(--ink)`
- Text: Fraunces "Counties" in `var(--ink)`

### CountdownBadge (`CountdownBadge.tsx`)
- Released: `var(--green-released-bg)` background, `var(--green-released)` text + dot
- Upcoming: `var(--parchment-dark)` background, `var(--ink-soft)` text + dot

### MobileListView (`MobileListView.tsx`)
- Background: `var(--surface-strong)`
- Sticky header: "All Counties" in Fraunces, gold kicker for section labels
- Items: parchment hover state
- Same slide-up/down behavior

### VideoSection (`VideoSection.tsx`)
- Tab bar: YouTube tab active = `--red-action-bg` + `--red-action` text; Nebula tab active = teal bg + `--nebula-teal` text
- Video frame: `border: 1px solid var(--line)`, `border-radius` kept

## 8. What Does NOT Change

- Component file structure and hierarchy
- Three.js map rendering, shaders, terrain/water
- TanStack Router setup and route structure
- Mobile bottom sheet drag gesture behavior
- Data fetching hooks (`useCountyData`, `useGeoData`)
- Label sprite generation (`createLabelSprite`)
- Mercator/geo utilities
- Theme init script mechanism (just swap class detection)
- `cn()` utility usage pattern

## 9. Migration Notes

- All token changes are in `src/styles.css` `:root` and `.dark` blocks
- Tailwind `@theme inline` block updated to expose new tokens
- Components reference tokens via `var(--token-name)` — the existing pattern
- Font balance shift (more Fraunces) is purely class-level, no new font imports
- The landmark hover interaction is the only new state management (local `useState` in `CountyDetail`)
- No new dependencies required
