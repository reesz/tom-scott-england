import type { Coordinates } from './county'

export type TravelMode = 'car' | 'train'

export interface JourneyStop {
  episode: number
  /** County name as Tom uses it (historic counties) */
  historicCounty: string
  /** Ceremonial county id in counties.json the stop is filed under */
  countyId: string
  title: string | null
  place: string | null
  coords: Coordinates
  /** How Tom travelled to this stop from the previous one */
  travel: TravelMode
  upcoming?: boolean
}

export interface JourneyData {
  source: string
  stops: JourneyStop[]
}
