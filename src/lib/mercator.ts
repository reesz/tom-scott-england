const DEG2RAD = Math.PI / 180

/** Convert latitude to Mercator Y */
export function latToMercY(lat: number): number {
  const rad = lat * DEG2RAD
  return Math.log(Math.tan(Math.PI / 4 + rad / 2))
}

/** Convert Mercator Y back to latitude */
export function mercYToLat(y: number): number {
  return (2 * Math.atan(Math.exp(y)) - Math.PI / 2) / DEG2RAD
}

/** Convert [lon, lat] to world-space [x, y] */
export function geoToWorld(lon: number, lat: number): [number, number] {
  return [lon * DEG2RAD, latToMercY(lat)]
}

/** Convert world-space [x, y] back to [lon, lat] */
export function worldToGeo(x: number, y: number): [number, number] {
  return [x / DEG2RAD, mercYToLat(y)]
}

// DEM bounding box (must match generate-dem-assets.py)
export const DEM_LON_MIN = -11
export const DEM_LON_MAX = 2
export const DEM_LAT_MIN = 49
export const DEM_LAT_MAX = 61

// DEM bounds in world space
export const DEM_WORLD_MIN = geoToWorld(DEM_LON_MIN, DEM_LAT_MIN)
export const DEM_WORLD_MAX = geoToWorld(DEM_LON_MAX, DEM_LAT_MAX)

/** Convert world-space bounds to DEM texture UV [uMin, vMin, uMax, vMax] */
export function worldBoundsToDemUV(
  left: number, bottom: number, right: number, top: number,
): [number, number, number, number] {
  const [demLeft, demBottom] = DEM_WORLD_MIN
  const [demRight, demTop] = DEM_WORLD_MAX
  const demW = demRight - demLeft
  const demH = demTop - demBottom

  const uMin = (left - demLeft) / demW
  const uMax = (right - demLeft) / demW
  const vMin = (bottom - demBottom) / demH
  const vMax = (top - demBottom) / demH

  return [uMin, vMin, uMax, vMax]
}
