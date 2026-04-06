import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useMapTransform, MapScaleContext } from '#/hooks/useMapTransform'
import { MapControls } from './MapControls'

interface MapContainerProps {
  children: ReactNode
  flyToTarget?: { x: number; y: number } | null
}

export function MapContainer({ children, flyToTarget }: MapContainerProps) {
  const { transform, transformStyle, containerRef, zoomIn, zoomOut, resetView, flyTo } = useMapTransform()

  useEffect(() => {
    if (flyToTarget) {
      flyTo(flyToTarget.x, flyToTarget.y)
    }
  }, [flyToTarget, flyTo])

  return (
    <MapScaleContext.Provider value={transform.scale}>
      <div ref={containerRef} className="relative h-dvh w-full overflow-hidden touch-none">
        <div
          className="h-full w-full origin-center"
          style={{ transform: transformStyle, willChange: 'transform' }}
        >
          {children}
        </div>
        <MapControls onZoomIn={zoomIn} onZoomOut={zoomOut} onReset={resetView} />
      </div>
    </MapScaleContext.Provider>
  )
}
