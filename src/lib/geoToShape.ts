import { Shape, Path } from 'three'
import type { Polygon, MultiPolygon, Position } from 'geojson'
import { geoToWorld } from './mercator'

/** Convert a ring of [lon, lat] positions to world-space [x, y] pairs */
function ringToWorldCoords(ring: Position[]): [number, number][] {
  return ring.map(([lon, lat]) => geoToWorld(lon, lat))
}

/** Create a Three.js Shape from a single polygon ring, with optional holes */
function polygonToShape(
  outerRing: Position[],
  holes: Position[][],
): Shape {
  const outer = ringToWorldCoords(outerRing)
  const shape = new Shape()

  shape.moveTo(outer[0][0], outer[0][1])
  for (let i = 1; i < outer.length; i++) {
    shape.lineTo(outer[i][0], outer[i][1])
  }
  shape.closePath()

  for (const holeRing of holes) {
    const holeCoords = ringToWorldCoords(holeRing)
    const holePath = new Path()
    holePath.moveTo(holeCoords[0][0], holeCoords[0][1])
    for (let i = 1; i < holeCoords.length; i++) {
      holePath.lineTo(holeCoords[i][0], holeCoords[i][1])
    }
    holePath.closePath()
    shape.holes.push(holePath)
  }

  return shape
}

/** Convert a GeoJSON Polygon or MultiPolygon geometry to Three.js Shape(s) */
export function geoToShapes(geometry: Polygon | MultiPolygon): Shape[] {
  if (geometry.type === 'Polygon') {
    const [outer, ...holes] = geometry.coordinates
    return [polygonToShape(outer, holes)]
  }

  // MultiPolygon: one Shape per polygon
  return geometry.coordinates.map((polygon) => {
    const [outer, ...holes] = polygon
    return polygonToShape(outer, holes)
  })
}
