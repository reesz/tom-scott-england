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
