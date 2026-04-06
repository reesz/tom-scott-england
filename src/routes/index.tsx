import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: MapPage })

function MapPage() {
  return (
    <div className="flex h-dvh items-center justify-center">
      <p className="text-lg text-muted-foreground">Map loading...</p>
    </div>
  )
}
