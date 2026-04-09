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

        <div className="border-t border-[var(--line)] px-4 py-3">
          <button
            onClick={toggleTheme}
            className="display-title flex w-full items-center gap-3 rounded-lg px-4 py-3 text-base text-[var(--ink-soft)] transition hover:bg-[var(--parchment-dark)]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {isDark ? (
                <><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></>
              ) : (
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
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
