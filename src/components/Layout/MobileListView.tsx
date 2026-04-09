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
