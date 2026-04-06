import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback } from 'react'
import { useState } from 'react'
import { useCountyData } from '#/hooks/useCountyData'
import { useGeoData } from '#/hooks/useGeoData'
import { fitProjectionToFeatures } from '#/lib/projection'
import { WebGLBackground } from '#/components/Map/WebGLBackground'
import { CountySVG } from '#/components/Map/CountySVG'
import { CountyLabels } from '#/components/Map/CountyLabels'
import { MapContainer } from '#/components/Map/MapContainer'
import { Header } from '#/components/Layout/Header'
import { DetailPanel } from '#/components/Detail/DetailPanel'
import { BottomSheet } from '#/components/Detail/BottomSheet'
import { CountyDetail } from '#/components/Detail/CountyDetail'

export const Route = createFileRoute('/county/$id')({ component: CountyPage })

function CountyPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { counties, loading: countiesLoading } = useCountyData()
  const { geoData, loading: geoLoading } = useGeoData()
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const handleSelect = useCallback((newId: string) => {
    if (newId === id) {
      navigate({ to: '/' })
    } else {
      navigate({ to: '/county/$id', params: { id: newId } })
    }
  }, [id, navigate])

  const handleClose = useCallback(() => {
    navigate({ to: '/' })
  }, [navigate])

  if (countiesLoading || geoLoading) {
    return <div className="flex h-dvh items-center justify-center"><p>Loading...</p></div>
  }

  if (!geoData) {
    return <div className="flex h-dvh items-center justify-center"><p>No geo data</p></div>
  }

  const width = 800
  const height = 900
  const { projection, pathGenerator } = fitProjectionToFeatures(width, height, geoData)

  const county = counties.find((c) => c.id === id)
  const feature = geoData.features.find((f) => f.properties.id === id)

  return (
    <>
      <Header />
      <MapContainer>
        <WebGLBackground />
        <CountySVG
          geoData={geoData}
          pathGenerator={pathGenerator}
          counties={counties}
          selectedId={id}
          onSelect={handleSelect}
          onHover={setHoveredId}
          width={width}
          height={height}
        />
        <CountyLabels geoData={geoData} projection={projection} width={width} height={height} />
      </MapContainer>

      <DetailPanel isOpen={!!county} onClose={handleClose}>
        {county && feature && <CountyDetail county={county} feature={feature} />}
      </DetailPanel>

      <BottomSheet isOpen={!!county} onClose={handleClose}>
        {county && feature && <CountyDetail county={county} feature={feature} />}
      </BottomSheet>
    </>
  )
}
