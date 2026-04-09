#!/usr/bin/env python3
"""
Clip land-mask.png to only include UK and Ireland landmasses.

Loads the existing land mask (generated from elevation > 0) and zeros out
any pixels that don't fall within the British Isles GeoJSON polygons
(england-counties.geo.json + british-isles.geo.json).

Usage:
  pip install numpy Pillow
  python scripts/clip-land-mask.py
"""

import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

# ---------------------------------------------------------------------------
# Configuration — must match generate-dem-assets.py
# ---------------------------------------------------------------------------

LAT_MIN = 49.0
LAT_MAX = 61.0
LON_MIN = -11.0
LON_MAX = 2.0
OUTPUT_SIZE = 2048

DATA_DIR = Path(__file__).resolve().parent.parent / "public" / "data"
MASK_PATH = DATA_DIR / "land-mask.png"
BACKUP_PATH = DATA_DIR / "land-mask-original.png"

# ---------------------------------------------------------------------------
# Coordinate conversion: lon/lat → pixel in the 2048x2048 image
# ---------------------------------------------------------------------------

def merc_y(lat_deg: float) -> float:
    """Latitude to Mercator Y."""
    return math.log(math.tan(math.pi / 4 + math.radians(lat_deg) / 2))

MERC_TOP = merc_y(LAT_MAX)
MERC_BOT = merc_y(LAT_MIN)

def lon_to_px(lon: float) -> float:
    return (lon - LON_MIN) / (LON_MAX - LON_MIN) * OUTPUT_SIZE

def lat_to_py(lat: float) -> float:
    return (MERC_TOP - merc_y(lat)) / (MERC_TOP - MERC_BOT) * OUTPUT_SIZE

def geo_coords_to_pixels(coords: list) -> list[tuple[float, float]]:
    """Convert a ring of [lon, lat] coordinates to pixel coordinates."""
    return [(lon_to_px(lon), lat_to_py(lat)) for lon, lat in coords]

# ---------------------------------------------------------------------------
# GeoJSON geometry iteration (no shapely dependency)
# ---------------------------------------------------------------------------

def iter_polygons(geojson: dict):
    """Yield (exterior_coords, [interior_coords, ...]) for each polygon."""
    for feature in geojson["features"]:
        geom = feature["geometry"]
        if geom["type"] == "Polygon":
            yield geom["coordinates"][0], geom["coordinates"][1:]
        elif geom["type"] == "MultiPolygon":
            for polygon_coords in geom["coordinates"]:
                yield polygon_coords[0], polygon_coords[1:]

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    counties_path = DATA_DIR / "england-counties.geo.json"
    isles_path = DATA_DIR / "british-isles.geo.json"

    print("Loading GeoJSON data...")
    with open(counties_path) as f:
        counties_geojson = json.load(f)
    with open(isles_path) as f:
        isles_geojson = json.load(f)

    # Create a rasterized mask from the GeoJSON polygons
    # White (255) = inside a UK/Ireland polygon, black (0) = outside
    geo_mask = Image.new("L", (OUTPUT_SIZE, OUTPUT_SIZE), 0)
    draw = ImageDraw.Draw(geo_mask)

    poly_count = 0
    for geojson in [counties_geojson, isles_geojson]:
        for exterior, interiors in iter_polygons(geojson):
            exterior_px = geo_coords_to_pixels(exterior)
            if len(exterior_px) >= 3:
                draw.polygon(exterior_px, fill=255)
            for interior in interiors:
                interior_px = geo_coords_to_pixels(interior)
                if len(interior_px) >= 3:
                    draw.polygon(interior_px, fill=0)
            poly_count += 1

    print(f"Rasterized {poly_count} polygons into clip mask")

    # Dilate the geo mask to account for coastline detail in the elevation
    # data that extends beyond the simplified GeoJSON boundaries.
    # PIL MaxFilter with size=11 applied twice ≈ ~11px dilation radius.
    geo_mask = geo_mask.filter(ImageFilter.MaxFilter(size=11))
    geo_mask = geo_mask.filter(ImageFilter.MaxFilter(size=11))

    # Load existing land mask
    print(f"Loading existing land mask: {MASK_PATH}")
    if not MASK_PATH.exists():
        print(f"ERROR: {MASK_PATH} not found. Run generate-dem-assets.py first.")
        return

    # Backup original
    original = Image.open(MASK_PATH).convert("L")
    original.save(BACKUP_PATH, optimize=True)
    print(f"Backed up original to: {BACKUP_PATH}")

    # AND the two masks: keep land pixels only where GeoJSON says UK/Ireland
    land_arr = np.array(original).astype(np.float32)
    geo_arr = np.array(geo_mask).astype(np.float32) / 255.0
    clipped = (land_arr * geo_arr).astype(np.uint8)

    # Re-apply slight Gaussian blur for smooth coastline (matching original)
    result = Image.fromarray(clipped, mode="L")
    result = result.filter(ImageFilter.GaussianBlur(radius=1.5))

    result.save(MASK_PATH, optimize=True)
    print(f"Saved clipped land mask: {MASK_PATH}")
    print("Done! France and other non-UK/Ireland land removed.")


if __name__ == "__main__":
    main()
