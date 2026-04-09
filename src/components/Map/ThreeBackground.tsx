import { useRef } from 'react'
import { useThreeScene } from '#/hooks/useThreeScene'

export interface GeoBounds {
  lonMin: number
  lonMax: number
  latMin: number
  latMax: number
}

interface ThreeBackgroundProps {
  geoBounds: GeoBounds | null
}

export function ThreeBackground({ geoBounds }: ThreeBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useThreeScene(canvasRef, geoBounds)

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ zIndex: 0 }}
    />
  )
}
