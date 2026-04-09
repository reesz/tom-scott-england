import { useState, useMemo, useRef } from 'react'
import { useCountyData } from '#/hooks/useCountyData'
import { useGeoData } from '#/hooks/useGeoData'
import { useThreeScene } from '#/hooks/useThreeScene'
import { MapContainer } from './MapContainer'
import { MapLegend } from './MapLegend'
import { DetailPanel } from '#/components/Detail/DetailPanel'
import { BottomSheet } from '#/components/Detail/BottomSheet'
import { CountyDetail } from '#/components/Detail/CountyDetail'
import type { CountyFeature } from '#/hooks/useGeoData'

interface MapViewProps {
  selectedId: string | null
  onSelectCounty: (id: string) => void
  onCloseDetail: () => void
}

export function MapView({ selectedId, onSelectCounty, onCloseDetail }: MapViewProps) {
  const { counties, loading: countiesLoading } = useCountyData()
  const { geoData, islandsData, loading: geoLoading } = useGeoData()
  const [, setHoveredId] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const selectedCounty = useMemo(
    () => counties.find((c) => c.id === selectedId),
    [counties, selectedId],
  )

  const selectedFeature = useMemo(
    () =>
      geoData?.features.find((f) => f.properties.id === selectedId) as CountyFeature | undefined,
    [geoData, selectedId],
  )

  const panelOpen = !!selectedCounty

  const { zoomIn, zoomOut, resetView } = useThreeScene({
    canvasRef,
    geoData,
    islandsData,
    counties,
    selectedId,
    panelOpen,
    onSelectCounty,
    onHoverCounty: setHoveredId,
  })

  if (countiesLoading || geoLoading || !geoData) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[var(--parchment)]">
        <div className="flex flex-col items-center gap-6">
          {/* Animated compass rose */}
          <svg
            width="96"
            height="96"
            viewBox="0 0 96 96"
            fill="none"
            className="animate-[spin_8s_linear_infinite]"
          >
            {/* Outer ring */}
            <circle cx="48" cy="48" r="44" stroke="var(--gold-line)" strokeWidth="1" />
            <circle cx="48" cy="48" r="40" stroke="var(--gold)" strokeWidth="1.5" strokeDasharray="4 6" />

            {/* Cardinal points - elongated diamonds */}
            <path d="M48 4 L52 48 L48 92 L44 48Z" fill="var(--gold)" fillOpacity="0.15" stroke="var(--gold)" strokeWidth="1" />
            <path d="M4 48 L48 44 L92 48 L48 52Z" fill="var(--gold)" fillOpacity="0.15" stroke="var(--gold)" strokeWidth="1" />

            {/* Intercardinal points - smaller */}
            <path d="M16.9 16.9 L50 46 L79.1 79.1 L46 50Z" fill="var(--gold)" fillOpacity="0.08" stroke="var(--gold-line)" strokeWidth="0.75" />
            <path d="M79.1 16.9 L50 46 L16.9 79.1 L46 50Z" fill="var(--gold)" fillOpacity="0.08" stroke="var(--gold-line)" strokeWidth="0.75" />

            {/* Center ornament */}
            <circle cx="48" cy="48" r="4" fill="var(--gold)" fillOpacity="0.3" stroke="var(--gold)" strokeWidth="1.5" />
            <circle cx="48" cy="48" r="1.5" fill="var(--gold)" />

            {/* N marker */}
            <text x="48" y="15" textAnchor="middle" fill="var(--gold)" fontSize="8" fontWeight="700" fontFamily="var(--font-display)">N</text>
          </svg>

          <div className="flex flex-col items-center gap-1.5">
            <p className="display-title text-sm font-bold tracking-wide text-[var(--ink)]">
              Charting the Counties
            </p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--ink-soft)]">
              Preparing your atlas
            </p>
          </div>

          {/* Decorative line */}
          <div className="h-px w-32 bg-[linear-gradient(90deg,transparent,var(--gold-line),transparent)]" />
        </div>
      </div>
    )
  }

  return (
    <>
      <MapContainer canvasRef={canvasRef} zoomIn={zoomIn} zoomOut={zoomOut} resetView={resetView} />
      <MapLegend />

      <DetailPanel isOpen={panelOpen} onClose={onCloseDetail}>
        {selectedCounty && selectedFeature && (
          <CountyDetail county={selectedCounty} feature={selectedFeature} />
        )}
      </DetailPanel>

      <BottomSheet isOpen={panelOpen} onClose={onCloseDetail}>
        {selectedCounty && selectedFeature && (
          <CountyDetail county={selectedCounty} feature={selectedFeature} />
        )}
      </BottomSheet>
    </>
  )
}
