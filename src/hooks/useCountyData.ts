import { useEffect, useState } from 'react'
import type { CountiesData, County } from '#/types/county'

export function useCountyData() {
  const [counties, setCounties] = useState<County[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/counties.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load county data: ${res.status}`)
        return res.json() as Promise<CountiesData>
      })
      .then((data) => {
        setCounties(data.counties)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  return { counties, loading, error }
}
