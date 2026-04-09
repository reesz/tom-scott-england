import type { RefObject } from 'react'
import { MapControls } from './MapControls'

interface MapContainerProps {
  canvasRef: RefObject<HTMLCanvasElement | null>
  zoomIn: () => void
  zoomOut: () => void
  resetView: () => void
}

export function MapContainer({ canvasRef, zoomIn, zoomOut, resetView }: MapContainerProps) {
  return (
    <div className="fixed inset-0">
      <canvas
        ref={canvasRef}
        className="h-full w-full touch-none bg-[var(--parchment)]"
      />
      <MapControls onZoomIn={zoomIn} onZoomOut={zoomOut} onReset={resetView} />
    </div>
  )
}
