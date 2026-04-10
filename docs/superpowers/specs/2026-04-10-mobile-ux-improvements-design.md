# Mobile UX Improvements: Bottom Sheet + Touch Clicks

## Context

The mobile experience has two issues:
1. **Bottom sheet** is always partially visible (no way to fully dismiss), has no close button, and drag UX lacks momentum/velocity — feels janky compared to native bottom sheets.
2. **County clicks on mobile** are unreliable — finger taps frequently register as drags due to a too-tight movement threshold (3px), and raycasting relies on stale hover state that doesn't exist on touch devices.

## Fix 1: Bottom Sheet — Replace with Vaul

### What changes
- **Remove**: Custom `BottomSheet.tsx` implementation using `@use-gesture/react`
- **Add**: `vaul` package (~4KB gzip) — purpose-built bottom sheet with spring physics, momentum, snap points
- **Remove** `@use-gesture/react` dependency if no longer used elsewhere

### Vaul Drawer configuration
- `snapPoints={[0.5, 1]}` — half-screen and full-screen (minus 40px header)
- `activeSnapPoint` controlled state, starts at `0.5` on open
- `open={panelOpen}` / `onOpenChange` tied to route state via `onCloseDetail()`
- `modal={false}` — map remains interactive behind sheet
- `direction="bottom"`
- Content area scrollable only when at full snap point

### Behavior
| State | Trigger | Position |
|-------|---------|----------|
| Hidden | No county selected | Sheet not rendered / fully off-screen |
| Half (0.5) | County selected | 50% viewport — shows video, platform buttons, county header + coat of arms + description start |
| Full (1) | Drag up from half | `100dvh - 40px` — all content scrollable (stats, mini map, landmarks) |
| Half → Hidden | Drag down from half | Dismisses sheet, calls `onCloseDetail()` |
| Full → Half | Drag down on handle from full | Snaps back to 50% |

### Close button
- Visible X button in top-right of sheet header (next to drag handle)
- Calls `onCloseDetail()` immediately (clears URL county param)
- Styled to match existing antique/parchment theme

### Header area (drag handle zone)
```
┌─────────────────────────────┐
│        ━━━━━━━━━━          X│  ← drag handle + close
│─────────────────────────────│  ← gold divider
│  [content scrolls below]    │
```

### Decorative elements preserved
- Corner ornament SVGs
- Gold gradient dividers
- Parchment background (`--parchment-light`)
- Backdrop blur

### Files modified
- `src/components/Detail/BottomSheet.tsx` — rewrite to use vaul `Drawer`
- `src/components/Map/MapView.tsx` — update BottomSheet usage if props change
- `package.json` — add `vaul`, potentially remove `@use-gesture/react`

## Fix 2: Mobile Touch Click Reliability

### Root causes
1. **Stale hover state**: `hoveredCountyId` is set during `pointermove` raycasting. On touch, there's no persistent hover — `pointermove` fires during drag but the ID may be null or stale at `pointerup` time.
2. **3px threshold too tight**: Finger jitter during a deliberate tap easily exceeds 3px, setting `pointerMoved = true` and killing the click.
3. **Pointer capture on touch**: `setPointerCapture` forces all events to the canvas, which can cause incorrect coordinate reporting and conflicts with the bottom sheet gesture area.

### Changes in `useThreeScene.ts`

#### A. Raycast on pointerup (critical fix)
In `handlePointerUp`, perform a fresh raycast using `e.clientX`/`e.clientY` coordinates instead of relying on `hoveredCountyId` from `pointermove`. Use the raycast result (`tappedCountyId`) for county selection.

```
pointerup:
  1. Convert e.clientX/Y to NDC
  2. raycaster.setFromCamera(pointer, camera)
  3. intersect countyFillGroup.children
  4. tappedCountyId = first hit's countyId or null
  5. if (!pointerMoved && tappedCountyId) → select
```

#### B. Touch-aware movement threshold
In `handlePointerMove`, check `e.pointerType`:
- `'touch'` → 10px threshold before `pointerMoved = true`
- `'mouse'` → keep existing 3px threshold

#### C. Skip pointer capture for touch
In `handlePointerDown`:
- Only call `canvas.setPointerCapture(e.pointerId)` when `e.pointerType !== 'touch'`
- Touch events don't need capture (finger stays on element naturally)
- Prevents coordinate issues and conflicts with bottom sheet gestures

### What stays the same
- Desktop mouse behavior (3px threshold, pointer capture, hover-based raycasting)
- Panning logic
- Pinch zoom (separate touch handlers)
- Keyboard navigation
- Fly-to animation on select
- All material/color state management

### Files modified
- `src/hooks/useThreeScene.ts` — `handlePointerDown`, `handlePointerMove`, `handlePointerUp`

## Verification

1. **Bottom sheet**:
   - Select a county on mobile → sheet opens at 50%, showing video + buttons + county header
   - Drag up → expands to full screen (minus 40px)
   - Drag down on handle from full → snaps to 50%
   - Drag down from 50% → dismisses entirely
   - Tap X button → dismisses and deselects county
   - No county selected → no sheet visible at all
   - Content scrolls when at full snap point
   - Desktop sidebar unaffected

2. **Touch clicks**:
   - Tap a county on mobile → reliably selects it and opens bottom sheet
   - Small finger jitter during tap does NOT trigger a pan
   - Deliberate panning still works normally (drag > 10px)
   - Pinch zoom unaffected
   - Desktop mouse clicks still work with 3px threshold
   - Pointer capture still works for desktop mouse

3. **Cross-cutting**:
   - Select county via tap → sheet opens → drag sheet → map doesn't pan underneath
   - Close sheet → tap another county → works first try
   - Rotate device → layout adjusts correctly
   - Keyboard Escape still closes detail
