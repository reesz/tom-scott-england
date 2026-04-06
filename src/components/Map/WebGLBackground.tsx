import { useRef } from 'react'
import { useWebGLCanvas } from '#/hooks/useWebGLCanvas'

export function WebGLBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useWebGLCanvas(canvasRef)

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ zIndex: 0 }}
    />
  )
}
