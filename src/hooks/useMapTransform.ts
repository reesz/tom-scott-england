import { useState, useCallback, useRef, createContext, useContext } from 'react'
import { useGesture } from '@use-gesture/react'

export const MapScaleContext = createContext<number>(1)
export const useMapScale = () => useContext(MapScaleContext)

export interface MapTransform {
  x: number
  y: number
  scale: number
}

const MIN_SCALE = 1
const MAX_SCALE = 8

// Clamp pan so the scaled content never reveals empty space outside the viewport.
// With origin-center, the content is centered and scaled around the viewport center.
// At scale S, the content extends (S-1)/2 * viewport beyond each edge.
// Max pan in each direction = that overflow.
function clampPan(x: number, y: number, scale: number): { x: number; y: number } {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 0
  const vh = typeof window !== 'undefined' ? window.innerHeight : 0
  const maxX = (vw * (scale - 1)) / 2
  const maxY = (vh * (scale - 1)) / 2
  return {
    x: Math.max(-maxX, Math.min(maxX, x)),
    y: Math.max(-maxY, Math.min(maxY, y)),
  }
}

export function useMapTransform() {
  const [transform, setTransform] = useState<MapTransform>({ x: 0, y: 0, scale: 1 })
  const containerRef = useRef<HTMLDivElement>(null)

  const bind = useGesture(
    {
      onDrag: ({ delta: [dx, dy] }) => {
        setTransform((prev) => {
          const { x, y } = clampPan(prev.x + dx, prev.y + dy, prev.scale)
          return { ...prev, x, y }
        })
      },
      onPinch: ({ offset: [scale] }) => {
        setTransform((prev) => {
          const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale))
          const { x, y } = clampPan(prev.x, prev.y, newScale)
          return { x, y, scale: newScale }
        })
      },
      onWheel: ({ delta: [, dy], event }) => {
        event.preventDefault()
        setTransform((prev) => {
          const factor = dy > 0 ? 0.95 : 1.05
          const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale * factor))
          const { x, y } = clampPan(prev.x, prev.y, newScale)
          return { x, y, scale: newScale }
        })
      },
    },
    {
      target: containerRef,
      drag: { filterTaps: true },
      pinch: { scaleBounds: { min: MIN_SCALE, max: MAX_SCALE } },
      wheel: { eventOptions: { passive: false } },
    }
  )

  const zoomIn = useCallback(() => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.min(MAX_SCALE, prev.scale * 1.3),
    }))
  }, [])

  const zoomOut = useCallback(() => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.max(MIN_SCALE, prev.scale / 1.3),
    }))
  }, [])

  const resetView = useCallback(() => {
    setTransform({ x: 0, y: 0, scale: 1 })
  }, [])

  const flyTo = useCallback((targetX: number, targetY: number, targetScale?: number) => {
    setTransform((prev) => {
      const newScale = targetScale ?? Math.max(2, prev.scale)
      const rawX = -targetX + window.innerWidth / 2
      const rawY = -targetY + window.innerHeight / 2
      const { x, y } = clampPan(rawX, rawY, newScale)
      return { x, y, scale: newScale }
    })
  }, [])

  const transformStyle = `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`

  return {
    transform,
    transformStyle,
    containerRef,
    bind,
    zoomIn,
    zoomOut,
    resetView,
    flyTo,
  }
}
