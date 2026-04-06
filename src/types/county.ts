export interface Coordinates {
  lat: number
  lng: number
}

export interface Landmark {
  name: string
  coords: Coordinates
}

export interface CountyTown {
  name: string
  coords: Coordinates
}

export type CountyStatus = 'released' | 'upcoming'

export interface County {
  id: string
  name: string
  population: number | null
  areaSqKm: number | null
  countyTown: CountyTown | null
  description: string | null
  coatOfArms: string | null
  landmarks: Landmark[]
  youtubeId: string | null
  nebulaUrl: string | null
  status: CountyStatus
  releaseDate: string | null
}

export interface CountiesData {
  counties: County[]
}
