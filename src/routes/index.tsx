import { createFileRoute } from '@tanstack/react-router'
import { useCountyData } from '#/hooks/useCountyData'
import { useGeoData } from '#/hooks/useGeoData'
import { fitProjectionToFeatures } from '#/lib/projection'

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
    <div className="flex h-dvh items-center justify-center bg-[#f4e8c1]">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full max-h-dvh w-auto">
        {geoData.features.map((feature) => {
          const d = pathGenerator(feature)
          if (!d) return null
          const county = counties.find((c) => c.id === feature.properties.id)
          const isReleased = county?.status === 'released'
          return (
            <path
              key={feature.properties.id}
              d={d}
              fill={isReleased ? 'rgba(79, 140, 100, 0.3)' : 'rgba(150, 150, 150, 0.2)'}
              stroke="#5a4a3a"
              strokeWidth={0.5}
            />
          )
        })}
      </svg>
    </div>
  )
}
