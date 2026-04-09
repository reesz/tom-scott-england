import type { GeoPath, GeoPermissibleObjects } from 'd3-geo'
import type { IslandFeatureCollection } from '#/hooks/useGeoData'

interface BackgroundLandmassesProps {
  islandsData: IslandFeatureCollection
  pathGenerator: GeoPath<unknown, GeoPermissibleObjects>
}

export function BackgroundLandmasses({ islandsData, pathGenerator }: BackgroundLandmassesProps) {
  return (
    <g>
      {islandsData.features.map((feature) => {
        const d = pathGenerator(feature)
        if (!d) return null
        return (
          <path
            key={feature.properties.id}
            d={d}
            fill="rgba(180, 170, 155, 0.3)"
            stroke="rgba(90, 74, 58, 0.1)"
            strokeWidth={0.5}
            className="pointer-events-none"
          />
        )
      })}
    </g>
  )
}
