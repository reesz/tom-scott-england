import { useState, useCallback, useRef, createContext, useContext } from 'react'
import { useGesture } from '@use-gesture/react'

export const MapScaleContext = createContext<number>(1)
export const useMapScale = () => useContext(MapScaleContext)

export interface MapTransform {
  x: number
  y: number
  scale: number
}

const MIN_SCALE = 0.8
const MAX_SCALE = 8

export function useMapTransform() {
  const [transform, setTransform] = useState<MapTransform>({ x: 0, y: 0, scale: 1 })
  const containerRef = useRef<HTMLDivElement>(null)

  const bind = useGesture(
    {
      onDrag: ({ delta: [dx, dy] }) => {
        setTransform((prev) => ({
          ...prev,
          x: prev.x + dx,
          y: prev.y + dy,
        }))
      },
      onPinch: ({ offset: [scale] }) => {
        setTransform((prev) => ({
          ...prev,
          scale: Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale)),
        }))
      },
      onWheel: ({ delta: [, dy], event }) => {
        event.preventDefault()
        setTransform((prev) => {
          const factor = dy > 0 ? 0.95 : 1.05
          const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale * factor))
          return { ...prev, scale: newScale }
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
    setTransform((prev) => ({
      x: -targetX + window.innerWidth / 2,
      y: -targetY + window.innerHeight / 2,
      scale: targetScale ?? Math.max(2, prev.scale),
    }))
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
