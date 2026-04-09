import { useState, useMemo } from 'react'
import { geoCentroid } from 'd3-geo'
import { useCountyData } from '#/hooks/useCountyData'
import { useGeoData } from '#/hooks/useGeoData'
import { fitProjectionToFeatures } from '#/lib/projection'
import { ThreeBackground } from './ThreeBackground'
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
  const { geoData, islandsData, loading: geoLoading } = useGeoData()
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

  // Compute geographic bounds of the FULL VIEWPORT for Three.js alignment.
  // The SVG viewBox is 800x900 with preserveAspectRatio="xMidYMid meet",
  // so it's centered and possibly letter-boxed within the viewport.
  // We need the Three.js canvas (which fills the full viewport) to show
  // geographic coordinates that match what the SVG projection renders.
  const geoBounds = useMemo(() => {
    if (!projection) return null
    // Determine how the SVG viewBox maps to the actual viewport.
    // With "meet", the scale is min(vpW/svgW, vpH/svgH).
    const vpW = typeof window !== 'undefined' ? window.innerWidth : width
    const vpH = typeof window !== 'undefined' ? window.innerHeight : height
    const scale = Math.min(vpW / width, vpH / height)
    const renderedW = width * scale
    const renderedH = height * scale
    // Offset from viewport edge to SVG content start
    const offsetX = (vpW - renderedW) / 2
    const offsetY = (vpH - renderedH) / 2
    // Map viewport corners to SVG viewBox coordinates
    const svgX0 = (0 - offsetX) / scale        // left edge of viewport in SVG coords
    const svgY0 = (0 - offsetY) / scale        // top edge
    const svgX1 = (vpW - offsetX) / scale      // right edge
    const svgY1 = (vpH - offsetY) / scale      // bottom edge
    // Invert to geographic coordinates
    const topLeft = projection.invert?.([svgX0, svgY0])
    const bottomRight = projection.invert?.([svgX1, svgY1])
    if (!topLeft || !bottomRight) return null
    return {
      lonMin: topLeft[0],
      lonMax: bottomRight[0],
      latMin: bottomRight[1],
      latMax: topLeft[1],
    }
  }, [projection])

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
        <ThreeBackground geoBounds={geoBounds} />
        <CountySVG
          geoData={geoData}
          islandsData={islandsData}
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
