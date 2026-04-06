import { useState, useMemo } from 'react'
import { geoCentroid } from 'd3-geo'
import { useCountyData } from '#/hooks/useCountyData'
import { useGeoData } from '#/hooks/useGeoData'
import { fitProjectionToFeatures } from '#/lib/projection'
import { WebGLBackground } from './WebGLBackground'
import { CountySVG } from './CountySVG'
import { CountyLabels } from './CountyLabels'
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
  const { geoData, loading: geoLoading } = useGeoData()
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const selectedCounty = useMemo(
    () => counties.find((c) => c.id === selectedId),
    [counties, selectedId]
  )

  const selectedFeature = useMemo(
    () => geoData?.features.find((f) => f.properties.id === selectedId) as CountyFeature | undefined,
    [geoData, selectedId]
  )

  const width = 800
  const height = 900

  const { projection, pathGenerator } = useMemo(() => {
    if (!geoData) return { projection: null, pathGenerator: null }
    return fitProjectionToFeatures(width, height, geoData)
  }, [geoData])

  const flyToTarget = useMemo(() => {
    if (!selectedFeature || !projection) return null
    const centroid = geoCentroid(selectedFeature)
    const projected = projection(centroid)
    if (!projected) return null
    return { x: projected[0], y: projected[1] }
  }, [selectedFeature, projection])

  if (countiesLoading || geoLoading) {
    return <div className="flex h-dvh items-center justify-center"><p>Loading...</p></div>
  }

  if (!geoData || !projection || !pathGenerator) {
    return <div className="flex h-dvh items-center justify-center"><p>No geo data</p></div>
  }

  return (
    <>
      <Header />
      <MapContainer flyToTarget={flyToTarget}>
        <WebGLBackground />
        <CountySVG
          geoData={geoData}
          pathGenerator={pathGenerator}
          counties={counties}
          selectedId={selectedId}
          onSelect={onSelectCounty}
          onHover={setHoveredId}
          width={width}
          height={height}
        />
        <CountyLabels geoData={geoData} projection={projection} width={width} height={height} />
      </MapContainer>
      <MapLegend />

      <DetailPanel isOpen={!!selectedCounty} onClose={onCloseDetail}>
        {selectedCounty && selectedFeature && (
          <CountyDetail county={selectedCounty} feature={selectedFeature} />
        )}
      </DetailPanel>

      <BottomSheet isOpen={!!selectedCounty} onClose={onCloseDetail}>
        {selectedCounty && selectedFeature && (
          <CountyDetail county={selectedCounty} feature={selectedFeature} />
        )}
      </BottomSheet>
    </>
  )
}
