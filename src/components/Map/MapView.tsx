import { useState, useMemo, useRef } from 'react'
import { useCountyData } from '#/hooks/useCountyData'
import { useGeoData } from '#/hooks/useGeoData'
import { useThreeScene } from '#/hooks/useThreeScene'
import { MapContainer } from './MapContainer'
import { MapLegend } from './MapLegend'
import { Header } from '#/components/Layout/Header'
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

  if (countiesLoading || geoLoading) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  if (!geoData) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <p>No geo data</p>
      </div>
    )
  }

  return (
    <>
      <Header />
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
