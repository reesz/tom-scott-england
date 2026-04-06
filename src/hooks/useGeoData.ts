import { useEffect, useState } from 'react'
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson'

export interface CountyFeatureProperties {
  id: string
  name: string
}

export type CountyFeature = GeoJSON.Feature<Polygon | MultiPolygon, CountyFeatureProperties>
export type CountyFeatureCollection = FeatureCollection<Polygon | MultiPolygon, CountyFeatureProperties>

export function useGeoData() {
  const [geoData, setGeoData] = useState<CountyFeatureCollection | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/data/england-counties.geo.json')
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load GeoJSON: ${res.status}`)
        return res.json() as Promise<CountyFeatureCollection>
      })
      .then((data) => {
        setGeoData(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  return { geoData, loading, error }
}
