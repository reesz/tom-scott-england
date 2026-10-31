import { useEffect, useState } from 'react'
import type { JourneyData, JourneyStop } from '#/types/journey'
import { dataUrl } from '#/lib/dataUrl'

export function useJourneyData() {
  const [stops, setStops] = useState<JourneyStop[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(dataUrl('journey.json'))
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load journey data: ${res.status}`)
        return res.json() as Promise<JourneyData>
      })
      .then((data) => {
        setStops(data.stops)
        setLoading(false)
      })
      // The journey is optional; the map still works without it
      .catch(() => setLoading(false))
  }, [])

  return { stops, loading }
}
