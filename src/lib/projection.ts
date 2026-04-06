import { geoMercator, geoPath } from 'd3-geo'
import type { GeoPermissibleObjects } from 'd3-geo'

export function createEnglandProjection(width: number, height: number) {
  const projection = geoMercator()
    .center([-1.5, 52.5])
    .scale(width * 4.5)
    .translate([width / 2, height / 2])
  return projection
}

export function createPathGenerator(width: number, height: number) {
  const projection = createEnglandProjection(width, height)
  return geoPath().projection(projection)
}

export function fitProjectionToFeatures(
  width: number,
  height: number,
  geojson: GeoPermissibleObjects
) {
  const projection = geoMercator().fitSize([width, height], geojson)
  const pathGenerator = geoPath().projection(projection)
  return { projection, pathGenerator }
}
