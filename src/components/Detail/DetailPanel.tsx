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
      className={`fixed right-0 top-0 z-20 hidden h-full w-[380px] transition-transform duration-300 ease-out md:flex lg:w-[440px] ${
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
