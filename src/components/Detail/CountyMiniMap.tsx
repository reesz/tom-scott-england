import { useMemo } from 'react'
import { geoPath, geoMercator } from 'd3-geo'
import type { CountyFeature } from '#/hooks/useGeoData'
import type { County } from '#/types/county'

interface CountyMiniMapProps {
  feature: CountyFeature
  county: County
  hoveredLandmarkId?: string | null
}

export function CountyMiniMap({ feature, county, hoveredLandmarkId }: CountyMiniMapProps) {
  const size = 200

  const { pathD, townPos, landmarkPositions } = useMemo(() => {
    const projection = geoMercator().fitSize([size, size], feature)
    const pathGen = geoPath().projection(projection)
    const pathD = pathGen(feature) ?? ''

    const townPos = county.countyTown
      ? projection([county.countyTown.coords.lng, county.countyTown.coords.lat])
      : null

    const landmarkPositions = county.landmarks.map((lm) => ({
      name: lm.name,
      pos: projection([lm.coords.lng, lm.coords.lat]),
    }))

    return { pathD, townPos, landmarkPositions }
  }, [feature, county])

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="w-full rounded-md border border-[var(--gold-line)] bg-[var(--parchment)]"
      style={{ padding: '8px' }}
    >
      <path
        d={pathD}
        fill="rgba(79, 140, 100, 0.15)"
        stroke="rgba(90, 74, 58, 0.6)"
        strokeWidth={1}
        strokeLinejoin="round"
      />

      {townPos && (
        <g>
          <circle cx={townPos[0]} cy={townPos[1]} r={4} fill="var(--gold)" stroke="white" strokeWidth={1.5} />
          <text
            x={townPos[0]}
            y={(townPos[1] ?? 0) - 8}
            textAnchor="middle"
            style={{ fontSize: '8px', fill: 'var(--ink)', fontWeight: 600 }}
          >
            {county.countyTown?.name}
          </text>
        </g>
      )}

      {landmarkPositions.map(
        (lm) =>
          lm.pos && (
            <g key={lm.name}>
              <circle
                data-landmark-id={lm.name}
                cx={lm.pos[0]}
                cy={lm.pos[1]}
                r={hoveredLandmarkId === lm.name ? 4 : 2.5}
                fill={hoveredLandmarkId === lm.name ? 'var(--gold)' : 'var(--green-released)'}
                opacity={hoveredLandmarkId === lm.name ? 1 : 0.4}
                stroke={hoveredLandmarkId === lm.name ? 'var(--gold)' : 'none'}
                strokeWidth={hoveredLandmarkId === lm.name ? 1 : 0}
                style={{ transition: 'all 0.15s ease' }}
              />
              <title>{lm.name}</title>
            </g>
          )
      )}
    </svg>
  )
}
