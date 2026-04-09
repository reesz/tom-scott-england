import type { GeoPath, GeoPermissibleObjects } from 'd3-geo'
import type { County } from '#/types/county'
import type { CountyFeatureCollection, IslandFeatureCollection } from '#/hooks/useGeoData'
import { CountyPath } from './CountyPath'
import { BackgroundLandmasses } from './BackgroundLandmasses'

interface CountySVGProps {
  geoData: CountyFeatureCollection
  islandsData: IslandFeatureCollection | null
  pathGenerator: GeoPath<unknown, GeoPermissibleObjects>
  counties: County[]
  selectedId: string | null
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
  width: number
  height: number
}

export function CountySVG({
  geoData,
  islandsData,
  pathGenerator,
  counties,
  selectedId,
  onSelect,
  onHover,
  width,
  height,
}: CountySVGProps) {
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="absolute inset-0 h-full w-full"
      style={{ zIndex: 1 }}
      preserveAspectRatio="xMidYMid meet"
    >
      {islandsData && (
        <BackgroundLandmasses islandsData={islandsData} pathGenerator={pathGenerator} />
      )}

      {geoData.features.map((feature) => {
        const d = pathGenerator(feature)
        if (!d) return null
        const county = counties.find((c) => c.id === feature.properties.id)
        return (
          <CountyPath
            key={feature.properties.id}
            d={d}
            county={county}
            featureId={feature.properties.id}
            featureName={feature.properties.name}
            onSelect={onSelect}
            onHover={onHover}
            isSelected={selectedId === feature.properties.id}
          />
        )
      })}
    </svg>
  )
}
