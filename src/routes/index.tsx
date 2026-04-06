import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback, useState } from 'react'
import { MapView } from '#/components/Map/MapView'
import { MobileListView } from '#/components/Layout/MobileListView'
import { useCountyData } from '#/hooks/useCountyData'

export const Route = createFileRoute('/')({ component: MapPage })

function MapPage() {
  const navigate = useNavigate()
  const { counties } = useCountyData()
  const [listOpen, setListOpen] = useState(false)

  const handleSelect = useCallback((id: string) => {
    navigate({ to: '/county/$id', params: { id } })
  }, [navigate])

  return (
    <>
      <MapView selectedId={null} onSelectCounty={handleSelect} onCloseDetail={() => {}} />

      <button
        onClick={() => setListOpen(true)}
        className="fixed bottom-4 left-4 z-10 flex h-11 items-center gap-2 rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-4 shadow-md backdrop-blur-lg md:hidden"
        aria-label="Show county list"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="2" y1="4" x2="14" y2="4" />
          <line x1="2" y1="8" x2="14" y2="8" />
          <line x1="2" y1="12" x2="10" y2="12" />
        </svg>
        <span className="text-sm font-semibold text-[var(--sea-ink)]">Counties</span>
      </button>

      <MobileListView
        counties={counties}
        isOpen={listOpen}
        onClose={() => setListOpen(false)}
        onSelectCounty={handleSelect}
      />
    </>
  )
}
