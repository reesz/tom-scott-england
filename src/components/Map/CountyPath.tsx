import { useState, useCallback } from 'react'
import type { County } from '#/types/county'

interface CountyPathProps {
  d: string
  county: County | undefined
  featureId: string
  featureName: string
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
  isSelected: boolean
}

export function CountyPath({
  d,
  county,
  featureId,
  featureName,
  onSelect,
  onHover,
  isSelected,
}: CountyPathProps) {
  const [isHovered, setIsHovered] = useState(false)
  const isReleased = county?.status === 'released'
  const isUpcoming = county?.status === 'upcoming'

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true)
    onHover(featureId)
  }, [featureId, onHover])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
    onHover(null)
  }, [onHover])

  const handleClick = useCallback(() => {
    onSelect(featureId)
  }, [featureId, onSelect])

  // Fill colors
  let fill = 'rgba(150, 150, 140, 0.12)' // default unknown
  if (isReleased) fill = 'rgba(79, 140, 100, 0.22)'
  if (isUpcoming) fill = 'url(#hatch)' // hatching pattern for uncharted territory
  if (isHovered) fill = isReleased ? 'rgba(79, 184, 120, 0.35)' : 'rgba(180, 180, 170, 0.25)'
  if (isSelected) fill = isReleased ? 'rgba(79, 184, 120, 0.45)' : 'rgba(180, 180, 170, 0.35)'

  // Stroke
  const strokeColor = isHovered || isSelected ? 'rgba(90, 74, 58, 0.9)' : 'rgba(90, 74, 58, 0.5)'
  const strokeWidth = isHovered || isSelected ? 1.2 : 0.5

  // Hand-drawn dash animation on hover
  const pathLength = 5000
  const dashProps = isHovered
    ? {
        strokeDasharray: pathLength,
        strokeDashoffset: 0,
        style: {
          transition: 'stroke-dashoffset 0.8s ease-in-out, fill 0.2s ease, stroke 0.2s ease',
        },
      }
    : {
        style: {
          transition: 'fill 0.2s ease, stroke 0.2s ease, stroke-width 0.2s ease',
        },
      }

  return (
    <path
      d={d}
      fill={fill}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
      className="cursor-pointer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`${featureName}${isReleased ? ' — video available' : isUpcoming ? ' — coming soon' : ''}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick() }}
      {...dashProps}
    />
  )
}
