# Cartographer's Atlas UI Chrome Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle all UI chrome from nautical/frosted-glass to aged-parchment "There Be Dragons" cartographic aesthetic, reorder sidebar content, and add landmark hover interactions.

**Architecture:** Token-first approach — replace CSS custom properties in `styles.css` first, then update each component's classes and markup. The sidebar content reorder and landmark hover interaction are the only structural changes; everything else is pure visual restyling.

**Tech Stack:** React 19, Tailwind CSS v4, CSS custom properties, inline SVG, d3-geo (existing)

---

### Task 1: Replace Design Tokens in styles.css

**Files:**
- Modify: `src/styles.css:9-63` (`:root` block)
- Modify: `src/styles.css:65-118` (`.dark` block)
- Modify: `src/styles.css:166-174` (body styles)
- Modify: `src/styles.css:176-185` (link styles)
- Modify: `src/styles.css:216-256` (utility classes)
- Modify: `src/styles.css:258-285` (nav-link)

- [ ] **Step 1: Replace `:root` custom properties (lines 9–63)**

Replace the entire `:root` block with the new parchment token palette. Keep the shadcn/Radix tokens unchanged (lines 30–63).

```css
:root {
  /* Parchment palette */
  --parchment: #f5e6c8;
  --parchment-light: #faf3e0;
  --parchment-dark: #e8d4a5;
  --ink: #3d2e1a;
  --ink-soft: #8b7355;
  --ink-faint: rgba(139, 115, 85, 0.5);
  --gold: #8b6914;
  --gold-line: rgba(180, 140, 60, 0.3);
  --gold-line-subtle: rgba(180, 140, 60, 0.15);
  --leather: #5a4232;
  --leather-dark: #2a1a0a;
  --red-action: #9b2010;
  --red-action-bg: rgba(180, 50, 30, 0.14);
  --red-action-border: rgba(180, 50, 30, 0.35);
  --green-released: #2f6a4a;
  --green-released-bg: rgba(79, 140, 100, 0.15);
  --nebula-teal: #4fb8b2;
  --surface: rgba(244, 228, 193, 0.94);
  --surface-strong: rgba(248, 235, 205, 0.97);
  --line: rgba(139, 115, 85, 0.25);
  --line-dotted: rgba(139, 115, 85, 0.22);
  --shadow-soft: rgba(90, 74, 58, 0.15);
  --shadow-strong: rgba(0, 0, 0, 0.35);
  --wax-red: #c41e3a;

  /* Legacy aliases for components still using old names */
  --sea-ink: var(--ink);
  --sea-ink-soft: var(--ink-soft);
  --lagoon: var(--nebula-teal);
  --lagoon-deep: var(--gold);
  --palm: var(--green-released);
  --sand: var(--parchment);
  --foam: var(--parchment-light);
  --kicker: var(--gold);
  --bg-base: var(--parchment);
  --header-bg: var(--surface);
  --chip-bg: var(--surface);
  --chip-line: var(--line);
  --link-bg-hover: var(--parchment-dark);
  --inset-glint: rgba(255, 245, 220, 0.6);
  --hero-a: rgba(180, 140, 60, 0.2);
  --hero-b: rgba(139, 115, 85, 0.12);

  --background: oklch(1 0 0);
  --foreground: oklch(0.141 0.005 285.823);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.141 0.005 285.823);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.141 0.005 285.823);
  --primary: oklch(0.21 0.006 285.885);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.967 0.001 286.375);
  --secondary-foreground: oklch(0.21 0.006 285.885);
  --muted: oklch(0.967 0.001 286.375);
  --muted-foreground: oklch(0.552 0.016 285.938);
  --accent: oklch(0.967 0.001 286.375);
  --accent-foreground: oklch(0.21 0.006 285.885);
  --destructive: oklch(0.577 0.245 27.325);
  --destructive-foreground: oklch(0.577 0.245 27.325);
  --border: oklch(0.92 0.004 286.32);
  --input: oklch(0.92 0.004 286.32);
  --ring: oklch(0.871 0.006 286.286);
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
  --radius: 0.625rem;
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.141 0.005 285.823);
  --sidebar-primary: oklch(0.21 0.006 285.885);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.967 0.001 286.375);
  --sidebar-accent-foreground: oklch(0.21 0.006 285.885);
  --sidebar-border: oklch(0.92 0.004 286.32);
  --sidebar-ring: oklch(0.871 0.006 286.286);
}
```

- [ ] **Step 2: Replace `.dark` block (lines 65–118)**

```css
.dark {
  --parchment: #1a1209;
  --parchment-light: #221a0f;
  --parchment-dark: #120c06;
  --ink: #d4c4a0;
  --ink-soft: rgba(180, 155, 115, 0.7);
  --ink-faint: rgba(180, 155, 115, 0.35);
  --gold: #c4a040;
  --gold-line: rgba(180, 140, 60, 0.25);
  --gold-line-subtle: rgba(180, 140, 60, 0.12);
  --leather: #3a2a18;
  --leather-dark: #1a0f05;
  --red-action: #d4644a;
  --red-action-bg: rgba(200, 70, 50, 0.15);
  --red-action-border: rgba(200, 70, 50, 0.3);
  --green-released: #6ec89a;
  --green-released-bg: rgba(110, 200, 154, 0.12);
  --nebula-teal: #60d7cf;
  --surface: rgba(26, 18, 9, 0.94);
  --surface-strong: rgba(34, 26, 15, 0.97);
  --line: rgba(180, 140, 60, 0.18);
  --line-dotted: rgba(180, 140, 60, 0.15);
  --shadow-soft: rgba(0, 0, 0, 0.25);
  --shadow-strong: rgba(0, 0, 0, 0.5);
  --wax-red: #d42040;

  /* Legacy aliases */
  --sea-ink: var(--ink);
  --sea-ink-soft: var(--ink-soft);
  --lagoon: var(--nebula-teal);
  --lagoon-deep: var(--gold);
  --palm: var(--green-released);
  --sand: var(--parchment);
  --foam: var(--parchment-light);
  --kicker: var(--gold);
  --bg-base: var(--parchment);
  --header-bg: var(--surface);
  --chip-bg: var(--surface);
  --chip-line: var(--line);
  --link-bg-hover: var(--parchment-dark);
  --inset-glint: rgba(180, 140, 60, 0.1);
  --hero-a: rgba(196, 160, 64, 0.15);
  --hero-b: rgba(180, 140, 60, 0.08);

  --background: oklch(0.141 0.005 285.823);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.141 0.005 285.823);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.141 0.005 285.823);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.985 0 0);
  --primary-foreground: oklch(0.21 0.006 285.885);
  --secondary: oklch(0.274 0.006 286.033);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.274 0.006 286.033);
  --muted-foreground: oklch(0.705 0.015 286.067);
  --accent: oklch(0.274 0.006 286.033);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.396 0.141 25.723);
  --destructive-foreground: oklch(0.637 0.237 25.331);
  --border: oklch(0.274 0.006 286.033);
  --input: oklch(0.274 0.006 286.033);
  --ring: oklch(0.442 0.017 285.786);
  --chart-1: oklch(0.488 0.243 264.376);
  --chart-2: oklch(0.696 0.17 162.48);
  --chart-3: oklch(0.769 0.188 70.08);
  --chart-4: oklch(0.627 0.265 303.9);
  --chart-5: oklch(0.645 0.246 16.439);
  --sidebar: oklch(0.21 0.006 285.885);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.274 0.006 286.033);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(0.274 0.006 286.033);
  --sidebar-ring: oklch(0.442 0.017 285.786);
}
```

- [ ] **Step 3: Update body styles (lines 166–174)**

```css
body {
  margin: 0;
  color: var(--ink);
  font-family: var(--font-sans);
  background-color: #f4e8c1;
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

- [ ] **Step 4: Update link styles (lines 176–185)**

```css
a {
  color: var(--gold);
  text-decoration-color: rgba(139, 105, 20, 0.4);
  text-decoration-thickness: 1px;
  text-underline-offset: 2px;
}

a:hover {
  color: #6a4e0e;
}
```

- [ ] **Step 5: Update utility classes**

Replace `.island-shell` (lines 220–228) — keep old name as alias:

```css
.atlas-panel,
.island-shell {
  border: 1px solid var(--gold-line);
  background: linear-gradient(165deg, var(--surface-strong), var(--surface));
  box-shadow:
    0 1px 0 var(--inset-glint) inset,
    0 22px 44px var(--shadow-soft),
    0 6px 18px var(--shadow-soft);
  backdrop-filter: blur(4px);
}
```

Replace `.island-kicker` (lines 250–256) — keep old name as alias:

```css
.atlas-kicker,
.island-kicker {
  letter-spacing: 0.16em;
  text-transform: uppercase;
  font-weight: 700;
  font-size: 0.69rem;
  color: var(--gold);
}
```

Update `.nav-link` (lines 258–285) — change gradient and colors:

```css
.nav-link {
  position: relative;
  text-decoration: none;
  color: var(--ink-soft);
  font-family: 'Fraunces', Georgia, serif;
}

.nav-link::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: -8px;
  width: 100%;
  height: 2px;
  transform: scaleX(0);
  transform-origin: left;
  background: linear-gradient(90deg, var(--gold), rgba(180, 140, 60, 0.5));
  transition: transform 170ms ease;
}

.nav-link:hover,
.nav-link.is-active {
  color: var(--ink);
}

.nav-link:hover::after,
.nav-link.is-active::after {
  transform: scaleX(1);
}
```

Also update `.feature-card` (lines 230–241):

```css
.feature-card {
  background: linear-gradient(165deg, color-mix(in oklab, var(--surface-strong) 93%, white 7%), var(--surface));
  box-shadow:
    0 1px 0 var(--inset-glint) inset,
    0 18px 34px var(--shadow-soft),
    0 4px 14px var(--shadow-soft);
}

.feature-card:hover {
  transform: translateY(-2px);
  border-color: color-mix(in oklab, var(--gold) 35%, var(--line));
}
```

- [ ] **Step 6: Verify the app builds**

Run: `npm run dev` (or the project's dev command) and check the browser — all existing components should now pick up warm parchment tones via the legacy aliases.

- [ ] **Step 7: Commit**

```bash
git add src/styles.css
git commit -m "feat: replace nautical tokens with parchment/ink/gold palette"
```

---

### Task 2: Restyle Header as Floating Cartouche

**Files:**
- Modify: `src/components/Layout/Header.tsx` (full rewrite, 40 lines)

- [ ] **Step 1: Rewrite Header.tsx**

Replace the entire file content:

```tsx
import { useState, useCallback } from 'react'
import { MenuOverlay } from './MenuOverlay'

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const toggleMenu = useCallback(() => setMenuOpen((prev) => !prev), [])
  const closeMenu = useCallback(() => setMenuOpen(false), [])

  return (
    <>
      <div className="pointer-events-auto fixed left-3.5 top-3.5 z-30 flex items-center gap-2.5 rounded-[10px] border-2 border-[var(--line)] bg-[var(--surface)] px-3 py-2 shadow-[0_3px_10px_var(--shadow-soft)] backdrop-blur-lg">
        {/* Ornamental corner accents */}
        <div className="pointer-events-none absolute -left-[1px] -top-[1px] h-2 w-2 border-l-2 border-t-2 border-[var(--gold-line)] rounded-tl-[3px]" />
        <div className="pointer-events-none absolute -right-[1px] -top-[1px] h-2 w-2 border-r-2 border-t-2 border-[var(--gold-line)] rounded-tr-[3px]" />
        <div className="pointer-events-none absolute -bottom-[1px] -left-[1px] h-2 w-2 border-b-2 border-l-2 border-[var(--gold-line)] rounded-bl-[3px]" />
        <div className="pointer-events-none absolute -bottom-[1px] -right-[1px] h-2 w-2 border-b-2 border-r-2 border-[var(--gold-line)] rounded-br-[3px]" />

        <button
          onClick={toggleMenu}
          className="flex h-7 w-7 items-center justify-center rounded-md transition hover:bg-[var(--parchment-dark)]"
          aria-label="Open menu"
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="17" y2="6" />
            <line x1="3" y1="10" x2="17" y2="10" />
            <line x1="3" y1="14" x2="17" y2="14" />
          </svg>
        </button>

        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
          <path d="M12 8l2 4-2 4-2-4z" fill="rgba(180,140,60,0.4)" />
        </svg>

        <div>
          <div className="display-title text-[15px] font-bold leading-tight text-[var(--ink)]">
            Every County
          </div>
          <div className="text-[8px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-soft)]">
            A Cartographic Journey
          </div>
        </div>
      </div>

      <MenuOverlay isOpen={menuOpen} onClose={closeMenu} />
    </>
  )
}
```

- [ ] **Step 2: Verify in browser**

Check the floating cartouche appears at top-left with compass, hamburger, title, and gold corner accents. Click hamburger to ensure menu still opens (it will still slide from the right — we fix that in Task 3).

- [ ] **Step 3: Commit**

```bash
git add src/components/Layout/Header.tsx
git commit -m "feat: replace header bar with floating cartouche"
```

---

### Task 3: Restyle Menu Overlay (Left-Slide + Parchment)

**Files:**
- Modify: `src/components/Layout/MenuOverlay.tsx` (full rewrite, 80 lines)

- [ ] **Step 1: Rewrite MenuOverlay.tsx**

Replace the entire file:

```tsx
import { useEffect, useCallback } from 'react'
import { Link } from '@tanstack/react-router'

interface MenuOverlayProps {
  isOpen: boolean
  onClose: () => void
}

export function MenuOverlay({ isOpen, onClose }: MenuOverlayProps) {
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  const toggleTheme = useCallback(() => {
    const html = document.documentElement
    const isDark = html.classList.contains('dark')
    html.classList.toggle('dark', !isDark)
    localStorage.setItem('theme', isDark ? 'light' : 'dark')
  }, [])

  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <nav
        className={`fixed left-0 top-0 z-50 h-full w-full max-w-xs border-r border-[var(--line)] bg-[var(--surface-strong)] shadow-2xl backdrop-blur-lg transition-transform duration-300 ease-out md:max-w-sm ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Main menu"
      >
        <div className="flex items-center justify-between border-b border-[var(--line)] px-6 py-4">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--gold)]">
            Navigation
          </span>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--line)] transition hover:bg-[var(--parchment-dark)]"
            aria-label="Close menu"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round">
              <line x1="5" y1="5" x2="15" y2="15" />
              <line x1="15" y1="5" x2="5" y2="15" />
            </svg>
          </button>
        </div>

        {/* Gold divider */}
        <div className="mx-6 h-px bg-[linear-gradient(90deg,transparent,var(--gold-line),transparent)]" />

        <div className="flex flex-col gap-1 px-4 py-4">
          <Link
            to="/"
            onClick={onClose}
            className="display-title rounded-lg border-l-[3px] border-[var(--gold)] bg-[rgba(180,140,60,0.06)] px-4 py-3 text-base font-bold text-[var(--ink)] no-underline transition"
          >
            Map
            <span className="block text-[11px] font-normal italic text-[var(--ink-soft)]">
              Explore the counties
            </span>
          </Link>
          <a
            href="/imprint"
            onClick={onClose}
            className="display-title rounded-lg border-l-[3px] border-transparent px-4 py-3 text-base text-[var(--ink-soft)] no-underline transition hover:border-[var(--gold-line)] hover:bg-[var(--parchment-dark)]"
          >
            Imprint
            <span className="block text-[11px] font-normal italic text-[var(--ink-soft)]">
              Legal information
            </span>
          </a>
          <a
            href="/privacy"
            onClick={onClose}
            className="display-title rounded-lg border-l-[3px] border-transparent px-4 py-3 text-base text-[var(--ink-soft)] no-underline transition hover:border-[var(--gold-line)] hover:bg-[var(--parchment-dark)]"
          >
            Privacy
            <span className="block text-[11px] font-normal italic text-[var(--ink-soft)]">
              Data protection
            </span>
          </a>
        </div>

        {/* Theme toggle */}
        <div className="border-t border-[var(--line)] px-4 py-3">
          <button
            onClick={toggleTheme}
            className="display-title flex w-full items-center gap-3 rounded-lg px-4 py-3 text-base text-[var(--ink-soft)] transition hover:bg-[var(--parchment-dark)]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {isDark ? (
                <>{/* Sun */}<circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></>
              ) : (
                <>{/* Moon */}<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></>
              )}
            </svg>
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>

        <div className="absolute bottom-6 px-6 text-xs italic text-[var(--ink-soft)]">
          <p>A community project tracking Tom Scott's Every County series.</p>
        </div>
      </nav>
    </>
  )
}
```

- [ ] **Step 2: Verify in browser**

Open menu via cartouche hamburger — should slide from left with parchment styling, gold "Navigation" header, left-border active state on Map, theme toggle at bottom.

- [ ] **Step 3: Commit**

```bash
git add src/components/Layout/MenuOverlay.tsx
git commit -m "feat: restyle menu as left-sliding parchment drawer with theme toggle"
```

---

### Task 4: Restyle Detail Panel as Bound Atlas Page

**Files:**
- Modify: `src/components/Detail/DetailPanel.tsx` (full rewrite, 34 lines)

- [ ] **Step 1: Rewrite DetailPanel.tsx**

Replace the entire file:

```tsx
import type { ReactNode } from 'react'

interface DetailPanelProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
}

const CornerOrnament = ({ className }: { className: string }) => (
  <svg
    className={`pointer-events-none absolute opacity-45 ${className}`}
    width="22"
    height="22"
    viewBox="0 0 20 20"
    fill="none"
    stroke="var(--gold)"
    strokeWidth="1.2"
  >
    <path d="M2 2Q11 2 11 11Q2 11 2 2Z" />
    <path d="M4.5 4.5Q9 4.5 9 9Q4.5 9 4.5 4.5Z" />
  </svg>
)

export function DetailPanel({ isOpen, onClose, children }: DetailPanelProps) {
  return (
    <aside
      className={`fixed right-0 top-0 z-20 hidden h-full w-[320px] transition-transform duration-300 ease-out md:flex lg:w-[400px] ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
      style={{ boxShadow: `-6px 0 24px var(--shadow-strong)` }}
    >
      {/* Leather spine */}
      <div
        className="relative w-3.5 flex-shrink-0 rounded-l"
        style={{
          background: 'linear-gradient(90deg, var(--leather-dark), var(--leather) 30%, var(--leather) 70%, var(--leather-dark))',
        }}
      >
        {/* Gold stitching */}
        <div
          className="absolute left-1/2 top-6 bottom-6 w-px -translate-x-1/2"
          style={{
            background: 'repeating-linear-gradient(180deg, rgba(180,140,60,0.5) 0px, rgba(180,140,60,0.5) 5px, transparent 5px, transparent 10px)',
          }}
        />
      </div>

      {/* Page */}
      <div className="relative flex flex-1 flex-col overflow-hidden bg-[var(--parchment-light)]">
        {/* Double gold rule inset */}
        <div className="pointer-events-none absolute inset-3 border-2 border-[var(--gold-line)]" />
        <div className="pointer-events-none absolute inset-4 border border-[var(--gold-line-subtle)]" />

        {/* Corner ornaments */}
        <CornerOrnament className="left-2 top-2" />
        <CornerOrnament className="right-2 top-2 -scale-x-100" />
        <CornerOrnament className="bottom-2 left-2 -scale-y-100" />
        <CornerOrnament className="bottom-2 right-2 -scale-100" />

        {/* Close button */}
        <div className="relative z-10 flex items-center justify-end px-5 pt-7">
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--line)] transition hover:bg-[var(--parchment-dark)]"
            aria-label="Close detail panel"
          >
            <svg width="14" height="14" viewBox="0 0 18 18" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="4" x2="14" y2="14" />
              <line x1="14" y1="4" x2="4" y2="14" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="relative z-10 flex-1 overflow-y-auto px-6 pb-8">
          {children}
        </div>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Verify in browser**

Click a county on the map — the detail panel should slide in from right with leather spine, gold double-rule border, and corner ornaments.

- [ ] **Step 3: Commit**

```bash
git add src/components/Detail/DetailPanel.tsx
git commit -m "feat: restyle detail panel as bound atlas page with leather spine"
```

---

### Task 5: Restyle Bottom Sheet (Mobile)

**Files:**
- Modify: `src/components/Detail/BottomSheet.tsx` (lines 54, 61-62)

- [ ] **Step 1: Update BottomSheet styling**

Change the container class on line 54 — replace `bg-[var(--surface-strong)]` with `bg-[var(--parchment-light)]` and update the drag handle (line 62) from `bg-[var(--line)]` to `bg-[var(--gold-line)]`:

In the container `className` (line 54), change:
```
bg-[var(--surface-strong)]
```
to:
```
bg-[var(--parchment-light)]
```

In the drag handle div (line 62), change:
```
bg-[var(--line)]
```
to:
```
bg-[var(--gold-line)]
```

Add gold rule line and corner ornaments after the drag handle div. After line 63 (`</div>` closing the drag handle flex container), add:

```tsx
      {/* Gold rule */}
      <div className="mx-4 h-px bg-[linear-gradient(90deg,transparent,var(--gold-line),transparent)]" />
      {/* Corner ornaments */}
      <svg className="pointer-events-none absolute left-2 top-2 opacity-45" width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="var(--gold)" strokeWidth="1.2">
        <path d="M2 2Q11 2 11 11Q2 11 2 2Z" /><path d="M4.5 4.5Q9 4.5 9 9Q4.5 9 4.5 4.5Z" />
      </svg>
      <svg className="pointer-events-none absolute right-2 top-2 -scale-x-100 opacity-45" width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="var(--gold)" strokeWidth="1.2">
        <path d="M2 2Q11 2 11 11Q2 11 2 2Z" /><path d="M4.5 4.5Q9 4.5 9 9Q4.5 9 4.5 4.5Z" />
      </svg>
```

- [ ] **Step 2: Verify on mobile viewport**

Use browser devtools responsive mode — open a county, drag the bottom sheet. Should show parchment background with gold drag handle, gold rule line, and top corner ornaments.

- [ ] **Step 3: Commit**

```bash
git add src/components/Detail/BottomSheet.tsx
git commit -m "feat: restyle bottom sheet with parchment and gold accents"
```

---

### Task 6: Reorder Sidebar Content + Restyle CountyDetail

**Files:**
- Modify: `src/components/Detail/CountyDetail.tsx` (full rewrite, 87 lines)

- [ ] **Step 1: Rewrite CountyDetail.tsx with new content order and hover state**

Replace the entire file:

```tsx
import { useState } from 'react'
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
  const [hoveredLandmarkId, setHoveredLandmarkId] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Video embed at top */}
      <VideoSection
        youtubeId={county.youtubeId}
        nebulaUrl={county.nebulaUrl}
        status={county.status}
        releaseDate={county.releaseDate}
      />

      {/* 2. County name + description */}
      <div>
        <span className="atlas-kicker mb-1 block">County Details</span>
        <div className="mb-2 h-px bg-[linear-gradient(90deg,transparent,var(--gold-line),transparent)]" />
        <div className="flex items-start gap-3">
          {county.coatOfArms && (
            <img
              src={county.coatOfArms}
              alt={`${county.name} coat of arms`}
              className="h-12 w-12 object-contain"
            />
          )}
          <div>
            <h2 className="display-title text-[22px] font-bold text-[var(--ink)]">
              {county.name}
            </h2>
            <CountdownBadge status={county.status} releaseDate={county.releaseDate} />
          </div>
        </div>
        {county.description && (
          <p className="mt-3 text-[13px] italic leading-relaxed text-[var(--ink-soft)]">
            {county.description}
          </p>
        )}
      </div>

      {/* 3. Mini map with highlightable landmarks */}
      <CountyMiniMap
        feature={feature}
        county={county}
        hoveredLandmarkId={hoveredLandmarkId}
      />

      {/* 4. Stats */}
      {(county.population || county.areaSqKm || county.countyTown) && (
        <div className="flex justify-center gap-0">
          {county.population && (
            <>
              <div className="px-4 text-center">
                <p className="display-title text-lg font-bold text-[var(--ink)]">
                  {county.population.toLocaleString('en-GB')}
                </p>
                <p className="text-[8px] uppercase tracking-wider text-[var(--ink-soft)]">
                  Population
                </p>
              </div>
              <div className="w-px bg-[linear-gradient(180deg,transparent,var(--gold-line),transparent)]" />
            </>
          )}
          {county.areaSqKm && (
            <>
              <div className="px-4 text-center">
                <p className="display-title text-lg font-bold text-[var(--ink)]">
                  {county.areaSqKm}
                </p>
                <p className="text-[8px] uppercase tracking-wider text-[var(--ink-soft)]">
                  km²
                </p>
              </div>
              <div className="w-px bg-[linear-gradient(180deg,transparent,var(--gold-line),transparent)]" />
            </>
          )}
          {county.countyTown && (
            <div className="px-4 text-center">
              <p className="display-title text-lg font-bold text-[var(--ink)]">
                {county.countyTown.name}
              </p>
              <p className="text-[8px] uppercase tracking-wider text-[var(--ink-soft)]">
                County Town
              </p>
            </div>
          )}
        </div>
      )}

      {/* 5. Landmarks list with hover interaction */}
      {county.landmarks.length > 0 && (
        <div>
          <span className="atlas-kicker mb-2 block">Landmarks</span>
          <ul className="flex flex-col">
            {county.landmarks.map((lm) => (
              <li
                key={lm.name}
                className="relative cursor-default rounded-md border-b border-dotted border-[var(--line-dotted)] px-2 py-2 text-[12px] text-[var(--ink)] transition last:border-0 hover:bg-[var(--parchment-dark)]"
                onMouseEnter={() => setHoveredLandmarkId(lm.name)}
                onMouseLeave={() => setHoveredLandmarkId(null)}
              >
                {lm.name}
                {/* Popover */}
                {hoveredLandmarkId === lm.name && lm.description && (
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-48 -translate-x-1/2 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-2.5 text-[11px] shadow-[0_2px_8px_var(--shadow-soft)] transition-all">
                    <p className="font-bold text-[var(--ink)]">{lm.name}</p>
                    <p className="text-[var(--ink-soft)]">{lm.description}</p>
                    {/* Triangle */}
                    <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-[var(--line)]" />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Click a county with landmarks — content should appear in order: video → county info → mini map → stats → landmarks. Hover a landmark — should show popover (if description exists) and background highlight.

- [ ] **Step 3: Commit**

```bash
git add src/components/Detail/CountyDetail.tsx
git commit -m "feat: reorder sidebar content and add landmark hover interaction"
```

---

### Task 7: Update CountyMiniMap for Landmark Highlighting

**Files:**
- Modify: `src/components/Detail/CountyMiniMap.tsx` (update props + landmark rendering)

- [ ] **Step 1: Rewrite CountyMiniMap.tsx**

Replace the entire file:

```tsx
import { useMemo } from 'react'
import { geoPath, geoMercator } from 'd3-geo'
import type { CountyFeature } from '#/hooks/useGeoData'
import type { County } from '#/types/county'

interface CountyMiniMapProps {
  feature: CountyFeature
  county: County
  hoveredLandmarkId?: string | null
}

export function CountyMiniMap({ feature, county, hoveredLandmarkId }: CountyMiniMapProps) {
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
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto w-full max-w-[200px] rounded-md border border-[var(--gold-line)] bg-[var(--parchment)]"
      style={{ padding: '8px' }}
    >
      <path
        d={pathD}
        fill="rgba(79, 140, 100, 0.15)"
        stroke="rgba(90, 74, 58, 0.6)"
        strokeWidth={1}
        strokeLinejoin="round"
      />

      {townPos && (
        <g>
          <circle cx={townPos[0]} cy={townPos[1]} r={4} fill="var(--gold)" stroke="white" strokeWidth={1.5} />
          <text
            x={townPos[0]}
            y={(townPos[1] ?? 0) - 8}
            textAnchor="middle"
            style={{ fontSize: '8px', fill: 'var(--ink)', fontWeight: 600 }}
          >
            {county.countyTown?.name}
          </text>
        </g>
      )}

      {landmarkPositions.map(
        (lm) =>
          lm.pos && (
            <g key={lm.name}>
              <circle
                cx={lm.pos[0]}
                cy={lm.pos[1]}
                r={hoveredLandmarkId === lm.name ? 4 : 2.5}
                fill={hoveredLandmarkId === lm.name ? 'var(--gold)' : 'var(--green-released)'}
                opacity={hoveredLandmarkId === lm.name ? 1 : 0.4}
                stroke={hoveredLandmarkId === lm.name ? 'var(--ink)' : 'none'}
                strokeWidth={hoveredLandmarkId === lm.name ? 1 : 0}
                style={{ transition: 'all 0.15s ease' }}
              />
              <title>{lm.name}</title>
            </g>
          )
      )}
    </svg>
  )
}
```

- [ ] **Step 2: Verify in browser**

Open a county with landmarks. Hover landmarks in the list below — the corresponding dot on the mini map should grow, turn gold, and get a dark stroke. Moving away should revert.

- [ ] **Step 3: Commit**

```bash
git add src/components/Detail/CountyMiniMap.tsx
git commit -m "feat: add landmark dot highlighting on hover in mini map"
```

---

### Task 8: Restyle VideoSection with Parchment Tokens

**Files:**
- Modify: `src/components/Detail/VideoSection.tsx` (full rewrite)

- [ ] **Step 1: Rewrite VideoSection.tsx**

Replace the entire file:

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
      <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-6 text-center">
        <p className="display-title text-sm text-[var(--ink-soft)]">Video coming soon</p>
      </div>
    )
  }

  return (
    <div>
      {/* Video embed */}
      {activeTab === 'youtube' && youtubeId && (
        <div className="aspect-video overflow-hidden rounded-lg border border-[var(--line)]">
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
        <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-6 text-center">
          <p className="mb-3 text-sm text-[var(--ink-soft)]">Watch on Nebula</p>
          <a
            href={nebulaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="display-title inline-flex items-center gap-2 rounded-full bg-[rgba(79,184,178,0.12)] px-5 py-2.5 text-sm font-semibold text-[var(--nebula-teal)] no-underline transition hover:bg-[rgba(79,184,178,0.2)]"
          >
            Open on Nebula
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 2h7v7M12 2L2 12" />
            </svg>
          </a>
        </div>
      )}

      {/* Platform buttons */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => setActiveTab('youtube')}
          className={`display-title rounded-md px-3 py-2.5 text-[12px] font-semibold transition ${
            activeTab === 'youtube'
              ? 'border border-[var(--red-action-border)] bg-[var(--red-action-bg)] text-[var(--red-action)]'
              : 'border border-[var(--line)] text-[var(--ink-soft)] hover:bg-[var(--parchment-dark)]'
          }`}
        >
          ▶ YouTube
        </button>
        <button
          onClick={() => setActiveTab('nebula')}
          className={`display-title rounded-md px-3 py-2.5 text-[12px] font-semibold transition ${
            activeTab === 'nebula'
              ? 'border border-[rgba(79,184,178,0.3)] bg-[rgba(79,184,178,0.1)] text-[var(--nebula-teal)]'
              : 'border border-[var(--line)] text-[var(--ink-soft)] hover:bg-[var(--parchment-dark)]'
          }`}
        >
          ▶ Nebula
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Open a released county — video should be at the top, with YouTube/Nebula toggle buttons below. Active tab shows vivid color (red for YouTube, teal for Nebula).

- [ ] **Step 3: Commit**

```bash
git add src/components/Detail/VideoSection.tsx
git commit -m "feat: restyle video section with parchment tokens and button layout"
```

---

### Task 9: Restyle CountdownBadge

**Files:**
- Modify: `src/components/Detail/CountdownBadge.tsx` (update classes)

- [ ] **Step 1: Update CountdownBadge.tsx**

Replace the entire file:

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
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--green-released-bg)] px-3 py-1 text-xs font-semibold text-[var(--green-released)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--green-released)]" />
        Released {formatReleaseDate(releaseDate)}
      </span>
    )
  }

  const days = daysUntil(releaseDate)
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--parchment-dark)] px-3 py-1 text-xs font-semibold text-[var(--ink-soft)]">
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--ink-soft)]" />
      Coming {formatReleaseDate(releaseDate)}
      {days > 0 && ` — ${days} day${days === 1 ? '' : 's'} to go`}
    </span>
  )
}
```

- [ ] **Step 2: Verify in browser**

Check both a released county (green badge) and an upcoming county (parchment-dark badge).

- [ ] **Step 3: Commit**

```bash
git add src/components/Detail/CountdownBadge.tsx
git commit -m "feat: restyle countdown badges with parchment tokens"
```

---

### Task 10: Restyle Map Controls

**Files:**
- Modify: `src/components/Map/MapControls.tsx` (update button class)

- [ ] **Step 1: Update MapControls.tsx**

Replace the entire file:

```tsx
interface MapControlsProps {
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
}

export function MapControls({ onZoomIn, onZoomOut, onReset }: MapControlsProps) {
  const buttonClass =
    'flex h-11 w-11 items-center justify-center rounded-[10px] border-[1.5px] border-[var(--line)] bg-[var(--surface)] shadow-[0_2px_8px_var(--shadow-soft)] backdrop-blur transition hover:bg-[var(--parchment-dark)] active:scale-95'

  return (
    <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2 md:bottom-auto md:right-4 md:top-20">
      <button onClick={onZoomIn} className={buttonClass} aria-label="Zoom in">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="var(--ink)" strokeWidth="2">
          <line x1="10" y1="4" x2="10" y2="16" />
          <line x1="4" y1="10" x2="16" y2="10" />
        </svg>
      </button>
      <button onClick={onZoomOut} className={buttonClass} aria-label="Zoom out">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="var(--ink)" strokeWidth="2">
          <line x1="4" y1="10" x2="16" y2="10" />
        </svg>
      </button>
      <button onClick={onReset} className={buttonClass} aria-label="Reset view">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="var(--ink)" strokeWidth="1.5">
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

- [ ] **Step 2: Verify in browser**

Zoom buttons should have parchment background, ink-colored icons, gold-tinted border.

- [ ] **Step 3: Commit**

```bash
git add src/components/Map/MapControls.tsx
git commit -m "feat: restyle map controls with parchment treatment"
```

---

### Task 11: Restyle Map Legend

**Files:**
- Modify: `src/components/Map/MapLegend.tsx` (update classes)

- [ ] **Step 1: Rewrite MapLegend.tsx**

Replace the entire file:

```tsx
export function MapLegend() {
  return (
    <div className="absolute bottom-4 left-4 z-10 hidden rounded-[10px] border-[1.5px] border-[var(--line)] bg-[var(--surface)] px-4 py-3 shadow-[0_2px_8px_var(--shadow-soft)] backdrop-blur-lg md:block">
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-[var(--green-released-bg)]" style={{ border: '1px solid var(--green-released)' }} />
          <span className="display-title text-[var(--ink-soft)]">Released</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="h-3 w-3 rounded-sm bg-[var(--parchment-dark)]"
            style={{
              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, var(--ink-faint) 2px, var(--ink-faint) 3px)',
            }}
          />
          <span className="display-title text-[var(--ink-soft)]">Coming Soon</span>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Map/MapLegend.tsx
git commit -m "feat: restyle map legend with parchment tokens"
```

---

### Task 12: Restyle Mobile Counties FAB + MobileListView

**Files:**
- Modify: `src/routes/index.tsx` (lines 40–58, FAB button)
- Modify: `src/components/Layout/MobileListView.tsx` (class updates)

- [ ] **Step 1: Update FAB button in index.tsx**

Replace the FAB button (lines 40–58) with:

```tsx
      <button
        onClick={() => setListOpen(true)}
        className="fixed bottom-4 left-4 z-10 flex h-11 items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 shadow-[0_2px_8px_var(--shadow-soft)] backdrop-blur-lg md:hidden"
        aria-label="Show county list"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="var(--ink)"
          strokeWidth="2"
        >
          <line x1="2" y1="4" x2="14" y2="4" />
          <line x1="2" y1="8" x2="14" y2="8" />
          <line x1="2" y1="12" x2="10" y2="12" />
        </svg>
        <span className="display-title text-sm font-semibold text-[var(--ink)]">Counties</span>
      </button>
```

- [ ] **Step 2: Update MobileListView.tsx**

Replace the entire file:

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
          <h2 className="display-title text-base font-bold text-[var(--ink)]">All Counties</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--line)] hover:bg-[var(--parchment-dark)]"
            aria-label="Close list"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="3" x2="13" y2="13" />
              <line x1="13" y1="3" x2="3" y2="13" />
            </svg>
          </button>
        </div>

        {released.length > 0 && (
          <div className="px-4 py-3">
            <p className="atlas-kicker mb-2">Released</p>
            {released.map((c) => (
              <button
                key={c.id}
                onClick={() => handleSelect(c.id)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition hover:bg-[var(--parchment-dark)]"
              >
                <span className="display-title text-sm font-semibold text-[var(--ink)]">{c.name}</span>
                <CountdownBadge status={c.status} releaseDate={c.releaseDate} />
              </button>
            ))}
          </div>
        )}

        {upcoming.length > 0 && (
          <div className="border-t border-[var(--line)] px-4 py-3">
            <p className="atlas-kicker mb-2">Coming Soon</p>
            {upcoming.map((c) => (
              <button
                key={c.id}
                onClick={() => handleSelect(c.id)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition hover:bg-[var(--parchment-dark)]"
              >
                <span className="display-title text-sm text-[var(--ink-soft)]">{c.name}</span>
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

- [ ] **Step 3: Verify on mobile viewport**

Counties FAB should have parchment styling with Fraunces font. Open the list — should show gold kicker labels, parchment hover states, ink-colored text.

- [ ] **Step 4: Commit**

```bash
git add src/routes/index.tsx src/components/Layout/MobileListView.tsx
git commit -m "feat: restyle mobile FAB and county list with parchment treatment"
```

---

### Task 13: Final Visual QA + Cleanup

**Files:**
- Possibly modify: any file from above if visual inconsistencies found

- [ ] **Step 1: Run the dev server and check all pages**

Run: `npm run dev`

Check these flows in both light and dark mode:
1. Map loads — cartouche visible top-left with hamburger, compass, title
2. Click hamburger — menu slides from LEFT, parchment styled, theme toggle at bottom
3. Click a released county — detail panel slides in with leather spine, gold borders, content in new order (video → buttons → county info → mini map → stats → landmarks)
4. Hover landmarks — dot highlights on mini map, popover shows if description exists
5. Toggle theme from menu — dark mode uses aged vellum tones
6. Mobile viewport: bottom sheet has gold accents, FAB is parchment-styled, county list has gold kickers
7. Zoom controls have parchment styling
8. Map legend has parchment styling

- [ ] **Step 2: Fix any visual issues found**

Address inconsistencies — misaligned borders, wrong colors, etc.

- [ ] **Step 3: Final commit if any fixes were needed**

```bash
git add -u
git commit -m "fix: visual QA polish for parchment UI chrome"
```
