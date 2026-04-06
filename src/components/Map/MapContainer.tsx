import type { ReactNode } from 'react'
import { useMapTransform } from '#/hooks/useMapTransform'
import { MapControls } from './MapControls'

interface MapContainerProps {
  children: ReactNode
}

export function MapContainer({ children }: MapContainerProps) {
  const { transformStyle, containerRef, zoomIn, zoomOut, resetView } = useMapTransform()

  return (
    <div ref={containerRef} className="relative h-dvh w-full overflow-hidden touch-none">
      <div
        className="h-full w-full origin-center"
        style={{ transform: transformStyle, willChange: 'transform' }}
      >
        {children}
      </div>
      <MapControls onZoomIn={zoomIn} onZoomOut={zoomOut} onReset={resetView} />
    </div>
  )
}
