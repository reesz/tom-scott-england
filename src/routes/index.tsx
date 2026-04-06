import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import { useCountyData } from '#/hooks/useCountyData'
import { useGeoData } from '#/hooks/useGeoData'
import { fitProjectionToFeatures } from '#/lib/projection'
import { WebGLBackground } from '#/components/Map/WebGLBackground'
import { CountySVG } from '#/components/Map/CountySVG'
import { CountyLabels } from '#/components/Map/CountyLabels'
import { MapContainer } from '#/components/Map/MapContainer'

export const Route = createFileRoute('/')({ component: MapPage })

function MapPage() {
  const { counties, loading: countiesLoading } = useCountyData()
  const { geoData, loading: geoLoading } = useGeoData()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const handleSelect = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id))
  }, [])

  const handleHover = useCallback((id: string | null) => {
    setHoveredId(id)
  }, [])

  if (countiesLoading || geoLoading) {
    return <div className="flex h-dvh items-center justify-center"><p>Loading...</p></div>
  }

  if (!geoData) {
    return <div className="flex h-dvh items-center justify-center"><p>No geo data</p></div>
  }

  const width = 800
  const height = 900
  const { projection, pathGenerator } = fitProjectionToFeatures(width, height, geoData)

  return (
    <MapContainer>
      <WebGLBackground />
      <CountySVG
        geoData={geoData}
        pathGenerator={pathGenerator}
        counties={counties}
        selectedId={selectedId}
        onSelect={handleSelect}
        onHover={handleHover}
        width={width}
        height={height}
      />
      <CountyLabels
        geoData={geoData}
        projection={projection}
        width={width}
        height={height}
      />
    </MapContainer>
  )
}
