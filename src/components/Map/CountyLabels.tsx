import { geoCentroid } from 'd3-geo'
import type { GeoProjection } from 'd3-geo'
import type { CountyFeatureCollection } from '#/hooks/useGeoData'
import { useMapScale } from '#/hooks/useMapTransform'

interface CountyLabelsProps {
  geoData: CountyFeatureCollection
  projection: GeoProjection
  width: number
  height: number
  scale?: number
}

export function CountyLabels({ geoData, projection, width, height }: CountyLabelsProps) {
  const scale = useMapScale()
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  if (isMobile && scale < 1.5) return null

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ zIndex: 2 }}
      preserveAspectRatio="xMidYMid meet"
    >
      {geoData.features.map((feature) => {
        const centroid = geoCentroid(feature)
        const [x, y] = projection(centroid) ?? [0, 0]
        return (
          <text
            key={feature.properties.id}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="select-none"
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: '5px',
              fill: 'rgba(60, 50, 40, 0.85)',
              letterSpacing: '0.05em',
              paintOrder: 'stroke',
              stroke: 'rgba(255, 255, 255, 0.6)',
              strokeWidth: '1.5px',
              strokeLinejoin: 'round',
            }}
          >
            {feature.properties.name}
          </text>
        )
      })}
    </svg>
  )
}
