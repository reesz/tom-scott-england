import { useState, useEffect, useCallback } from 'react'
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

  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains('dark')
  )

  const toggleTheme = useCallback(() => {
    const html = document.documentElement
    const next = !isDark
    html.classList.remove('light', 'dark')
    html.classList.add(next ? 'dark' : 'light')
    html.style.colorScheme = next ? 'dark' : 'light'
    localStorage.setItem('theme', next ? 'dark' : 'light')
    setIsDark(next)
  }, [isDark])

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
          <Link
            to="/imprint"
            onClick={onClose}
            className="display-title rounded-lg border-l-[3px] border-transparent px-4 py-3 text-base text-[var(--ink-soft)] no-underline transition hover:border-[var(--gold-line)] hover:bg-[var(--parchment-dark)]"
          >
            Imprint
            <span className="block text-[11px] font-normal italic text-[var(--ink-soft)]">
              Legal information
            </span>
          </Link>
          <Link
            to="/privacy"
            onClick={onClose}
            className="display-title rounded-lg border-l-[3px] border-transparent px-4 py-3 text-base text-[var(--ink-soft)] no-underline transition hover:border-[var(--gold-line)] hover:bg-[var(--parchment-dark)]"
          >
            Privacy
            <span className="block text-[11px] font-normal italic text-[var(--ink-soft)]">
              Data protection
            </span>
          </Link>
          <Link
            to="/sources"
            onClick={onClose}
            className="display-title rounded-lg border-l-[3px] border-transparent px-4 py-3 text-base text-[var(--ink-soft)] no-underline transition hover:border-[var(--gold-line)] hover:bg-[var(--parchment-dark)]"
          >
            Sources
            <span className="block text-[11px] font-normal italic text-[var(--ink-soft)]">
              Data attribution
            </span>
          </Link>
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

        <div className="absolute bottom-6 px-6">
          <p className="text-xs italic text-[var(--ink-soft)]">A project tracking Tom Scott's England series.</p>
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-soft)]">Check out Tom Scott</p>
          <div className="mt-2 flex gap-4">
            <a href="https://www.youtube.com/@TomScottGo" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="text-[var(--ink-soft)] transition hover:text-[var(--ink)]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </a>
            <a href="https://nebula.tv/tomscott" target="_blank" rel="noopener noreferrer" aria-label="Nebula" className="text-[var(--ink-soft)] transition hover:text-[var(--ink)]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L1 21h22L12 2zm0 4.5L19.1 19H4.9L12 6.5z"/>
              </svg>
            </a>
            <a href="https://www.tomscott.com" target="_blank" rel="noopener noreferrer" aria-label="Website" className="text-[var(--ink-soft)] transition hover:text-[var(--ink)]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
            </a>
          </div>
        </div>
      </nav>
    </>
  )
}
