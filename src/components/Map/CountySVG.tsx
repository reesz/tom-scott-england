import type { GeoPath, GeoPermissibleObjects } from 'd3-geo'
import type { County } from '#/types/county'
import type { CountyFeatureCollection } from '#/hooks/useGeoData'
import { CountyPath } from './CountyPath'

interface CountySVGProps {
  geoData: CountyFeatureCollection
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
      <defs>
        <pattern id="hatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(90, 74, 58, 0.15)" strokeWidth="1" />
        </pattern>
      </defs>

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
