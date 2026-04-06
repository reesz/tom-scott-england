import type { ReactNode } from 'react'

interface DetailPanelProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
}

export function DetailPanel({ isOpen, onClose, children }: DetailPanelProps) {
  return (
    <aside
      className={`fixed right-0 top-0 z-20 hidden h-full w-[320px] border-l border-[var(--line)] bg-[var(--surface-strong)] shadow-2xl backdrop-blur-lg transition-transform duration-300 ease-out md:block lg:w-[400px] ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="flex items-center justify-end px-4 pt-16">
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-lg transition hover:bg-[var(--link-bg-hover)]"
          aria-label="Close detail panel"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="4" x2="14" y2="14" />
            <line x1="14" y1="4" x2="4" y2="14" />
          </svg>
        </button>
      </div>
      <div className="h-[calc(100%-5rem)] overflow-y-auto px-6 pb-8">
        {children}
      </div>
    </aside>
  )
}
