import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback, useState } from 'react'
import { MapView } from '#/components/Map/MapView'
import { MobileListView } from '#/components/Layout/MobileListView'
import { useCountyData } from '#/hooks/useCountyData'

interface SearchParams {
  county?: string
}

export const Route = createFileRoute('/')({
  component: MapPage,
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    county: typeof search.county === 'string' ? search.county : undefined,
  }),
})

function MapPage() {
  const navigate = useNavigate()
  const { counties } = useCountyData()
  const { county: selectedId } = Route.useSearch()
  const [listOpen, setListOpen] = useState(false)

  const handleSelect = useCallback(
    (id: string) => {
      if (id === selectedId) {
        navigate({ to: '/', search: {} })
      } else {
        navigate({ to: '/', search: { county: id } })
      }
    },
    [selectedId, navigate],
  )

  const handleClose = useCallback(() => {
    navigate({ to: '/', search: {} })
  }, [navigate])

  return (
    <>
      <MapView
        selectedId={selectedId ?? null}
        onSelectCounty={handleSelect}
        onCloseDetail={handleClose}
      />

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

      <MobileListView
        counties={counties}
        isOpen={listOpen}
        onClose={() => setListOpen(false)}
        onSelectCounty={handleSelect}
      />
    </>
  )
}
