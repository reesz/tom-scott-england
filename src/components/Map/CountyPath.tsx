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
  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
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

  // Transparent fills — terrain shows through
  let fill = 'transparent'
  if (isHovered) fill = 'rgba(255, 255, 255, 0.15)'
  if (isSelected) fill = 'rgba(255, 255, 255, 0.2)'

  // Stroke styling — released gets gold accent
  let strokeColor = 'rgba(60, 50, 40, 0.4)'
  let strokeWidth = 0.8
  if (isReleased) strokeColor = 'rgba(180, 150, 60, 0.6)'
  if (isHovered || isSelected) {
    strokeColor = isReleased ? 'rgba(200, 170, 60, 0.9)' : 'rgba(60, 50, 40, 0.8)'
    strokeWidth = 1.4
  }

  const transition = prefersReducedMotion
    ? 'none'
    : 'fill 0.15s ease-in, stroke 0.15s ease-in, stroke-width 0.15s ease-in'

  return (
    <path
      d={d}
      fill={fill}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
      className="cursor-pointer"
      style={{ transition }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`${featureName}${isReleased ? ' — video available' : isUpcoming ? ' — coming soon' : ''}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleClick()
      }}
    />
  )
}
