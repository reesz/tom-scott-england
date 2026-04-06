import { createFileRoute } from '@tanstack/react-router'
import { useCountyData } from '#/hooks/useCountyData'

export const Route = createFileRoute('/')({ component: MapPage })

function MapPage() {
  const { counties, loading, error } = useCountyData()

  if (loading) return <div className="flex h-dvh items-center justify-center"><p>Loading...</p></div>
  if (error) return <div className="flex h-dvh items-center justify-center"><p>Error: {error}</p></div>

  return (
    <div className="flex h-dvh items-center justify-center">
      <p className="text-lg text-muted-foreground">
        Loaded {counties.length} counties: {counties.map(c => c.name).join(', ')}
      </p>
    </div>
  )
}
