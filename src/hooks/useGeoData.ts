import { useEffect, useState } from 'react'
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson'

export interface CountyFeatureProperties {
  id: string
  name: string
}

export type CountyFeature = GeoJSON.Feature<Polygon | MultiPolygon, CountyFeatureProperties>
export type CountyFeatureCollection = FeatureCollection<Polygon | MultiPolygon, CountyFeatureProperties>

export interface IslandFeatureProperties {
  id: string
  name: string
}

export type IslandFeatureCollection = FeatureCollection<Polygon | MultiPolygon, IslandFeatureProperties>

export function useGeoData() {
  const [geoData, setGeoData] = useState<CountyFeatureCollection | null>(null)
  const [islandsData, setIslandsData] = useState<IslandFeatureCollection | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch(`${import.meta.env.BASE_URL}data/england-counties.geo.json`).then((res) => {
        if (!res.ok) throw new Error(`Failed to load counties GeoJSON: ${res.status}`)
        return res.json() as Promise<CountyFeatureCollection>
      }),
      fetch(`${import.meta.env.BASE_URL}data/british-isles.geo.json`).then((res) => {
        if (!res.ok) throw new Error(`Failed to load British Isles GeoJSON: ${res.status}`)
        return res.json() as Promise<IslandFeatureCollection>
      }),
    ])
      .then(([counties, islands]) => {
        setGeoData(counties)
        setIslandsData(islands)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  return { geoData, islandsData, loading, error }
}
