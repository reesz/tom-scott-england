import { createFileRoute } from '@tanstack/react-router'
import { useCountyData } from '#/hooks/useCountyData'
import { useGeoData } from '#/hooks/useGeoData'
import { fitProjectionToFeatures } from '#/lib/projection'
import { WebGLBackground } from '#/components/Map/WebGLBackground'

export const Route = createFileRoute('/')({ component: MapPage })

function MapPage() {
  const { counties, loading: countiesLoading } = useCountyData()
  const { geoData, loading: geoLoading } = useGeoData()

  if (countiesLoading || geoLoading) {
    return <div className="flex h-dvh items-center justify-center"><p>Loading...</p></div>
  }

  if (!geoData) {
    return <div className="flex h-dvh items-center justify-center"><p>No geo data</p></div>
  }

  const width = 800
  const height = 900
  const { pathGenerator } = fitProjectionToFeatures(width, height, geoData)

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <WebGLBackground />
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="absolute inset-0 h-full w-full"
        style={{ zIndex: 1 }}
        preserveAspectRatio="xMidYMid meet"
      >
        {geoData.features.map((feature) => {
          const d = pathGenerator(feature)
          if (!d) return null
          const county = counties.find((c) => c.id === feature.properties.id)
          const isReleased = county?.status === 'released'
          return (
            <path
              key={feature.properties.id}
              d={d}
              fill={isReleased ? 'rgba(79, 140, 100, 0.25)' : 'rgba(150, 150, 140, 0.15)'}
              stroke="rgba(90, 74, 58, 0.6)"
              strokeWidth={0.5}
            />
          )
        })}
      </svg>
    </div>
  )
}
