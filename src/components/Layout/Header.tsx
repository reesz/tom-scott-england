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
