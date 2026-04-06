import { useEffect } from 'react'
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
          <a
            href="/imprint"
            onClick={onClose}
            className="rounded-xl px-4 py-3 text-base font-semibold text-[var(--sea-ink-soft)] no-underline transition hover:bg-[var(--link-bg-hover)]"
          >
            Imprint
          </a>
          <a
            href="/privacy"
            onClick={onClose}
            className="rounded-xl px-4 py-3 text-base font-semibold text-[var(--sea-ink-soft)] no-underline transition hover:bg-[var(--link-bg-hover)]"
          >
            Data Privacy
          </a>
        </div>

        <div className="absolute bottom-6 px-6 text-xs text-[var(--sea-ink-soft)]">
          <p>A community project tracking Tom Scott's Every County series.</p>
        </div>
      </nav>
    </>
  )
}
