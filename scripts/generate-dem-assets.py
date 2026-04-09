#!/usr/bin/env python3
"""
Generate DEM heightmap and land mask PNGs for the British Isles.

Downloads Terrarium-encoded elevation tiles from AWS, stitches them,
and produces:
  - public/data/dem-heightmap.png  (2048x2048 grayscale)
  - public/data/land-mask.png      (2048x2048 binary with slight blur)

Usage:
  pip install numpy Pillow requests
  python scripts/generate-dem-assets.py
"""

import math
import os
import sys
from io import BytesIO
from pathlib import Path

import numpy as np
import requests
from PIL import Image, ImageFilter

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# British Isles bounding box (lat/lon)
LAT_MIN = 49.0   # south
LAT_MAX = 61.0   # north
LON_MIN = -11.0  # west
LON_MAX = 2.0    # east

ZOOM = 7  # ~1 km/px — good enough for 2048 output
OUTPUT_SIZE = 2048
MAX_ELEVATION = 1345.0  # Ben Nevis in metres

TILE_URL = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"
# Fallback URLs to try if AWS is unavailable
FALLBACK_URLS = [
    "https://tile.nextzen.org/tilezen/terrain/v2/terrarium/{z}/{x}/{y}.png",
]

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "public" / "data"

# ---------------------------------------------------------------------------
# Tile math helpers (Web Mercator)
# ---------------------------------------------------------------------------

def lat_lon_to_tile(lat: float, lon: float, zoom: int) -> tuple[int, int]:
    """Convert lat/lon to tile x, y at given zoom."""
    n = 2 ** zoom
    x = int((lon + 180.0) / 360.0 * n)
    lat_rad = math.radians(lat)
    y = int((1.0 - math.log(math.tan(lat_rad) + 1.0 / math.cos(lat_rad)) / math.pi) / 2.0 * n)
    x = max(0, min(n - 1, x))
    y = max(0, min(n - 1, y))
    return x, y


def tile_bounds(x: int, y: int, zoom: int) -> tuple[float, float, float, float]:
    """Return (lat_min, lat_max, lon_min, lon_max) for a tile."""
    n = 2 ** zoom
    lon_min = x / n * 360.0 - 180.0
    lon_max = (x + 1) / n * 360.0 - 180.0
    lat_max = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * y / n))))
    lat_min = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * (y + 1) / n))))
    return lat_min, lat_max, lon_min, lon_max


# ---------------------------------------------------------------------------
# Tile fetching
# ---------------------------------------------------------------------------

def fetch_tile(z: int, x: int, y: int, session: requests.Session) -> Image.Image | None:
    """Download a single Terrarium tile, trying fallbacks if needed."""
    urls = [TILE_URL] + FALLBACK_URLS
    for url_template in urls:
        url = url_template.format(z=z, x=x, y=y)
        try:
            resp = session.get(url, timeout=15)
            if resp.status_code == 200:
                return Image.open(BytesIO(resp.content)).convert("RGB")
        except Exception:
            continue
    return None


def decode_terrarium(img: np.ndarray) -> np.ndarray:
    """Decode Terrarium encoding to elevation in metres.

    elevation = (R * 256 + G + B / 256) - 32768
    """
    r = img[:, :, 0].astype(np.float64)
    g = img[:, :, 1].astype(np.float64)
    b = img[:, :, 2].astype(np.float64)
    return r * 256.0 + g + b / 256.0 - 32768.0


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Determine tile range
    x_min, y_max = lat_lon_to_tile(LAT_MIN, LON_MIN, ZOOM)  # SW corner → max y
    x_max, y_min = lat_lon_to_tile(LAT_MAX, LON_MAX, ZOOM)  # NE corner → min y

    # Ensure correct ordering
    if x_min > x_max:
        x_min, x_max = x_max, x_min
    if y_min > y_max:
        y_min, y_max = y_max, y_min

    num_tiles_x = x_max - x_min + 1
    num_tiles_y = y_max - y_min + 1
    total_tiles = num_tiles_x * num_tiles_y

    print(f"Bounding box: lat [{LAT_MIN}, {LAT_MAX}], lon [{LON_MIN}, {LON_MAX}]")
    print(f"Zoom {ZOOM}: tiles x=[{x_min}..{x_max}], y=[{y_min}..{y_max}]")
    print(f"Fetching {total_tiles} tiles ({num_tiles_x}x{num_tiles_y})...")

    # Fetch and stitch tiles
    tile_size = 256
    stitched_w = num_tiles_x * tile_size
    stitched_h = num_tiles_y * tile_size
    stitched = np.zeros((stitched_h, stitched_w, 3), dtype=np.uint8)

    session = requests.Session()
    fetched = 0
    failed = 0

    for ty in range(y_min, y_max + 1):
        for tx in range(x_min, x_max + 1):
            img = fetch_tile(ZOOM, tx, ty, session)
            if img is None:
                failed += 1
                print(f"  FAILED tile z={ZOOM} x={tx} y={ty}")
                continue
            arr = np.array(img)
            py = (ty - y_min) * tile_size
            px = (tx - x_min) * tile_size
            stitched[py:py + tile_size, px:px + tile_size] = arr
            fetched += 1
            if fetched % 10 == 0 or fetched == total_tiles:
                print(f"  Fetched {fetched}/{total_tiles} tiles...")

    if failed > 0:
        print(f"WARNING: {failed} tiles failed to download")
    if fetched == 0:
        print("ERROR: No tiles were downloaded. Check your internet connection.")
        sys.exit(1)

    # Decode elevation
    print("Decoding Terrarium elevation data...")
    elevation = decode_terrarium(stitched)

    # Clamp negatives to 0
    elevation = np.clip(elevation, 0, None)

    # Crop stitched image to exact bounding box
    # The stitched grid covers the full tile extents; we need to crop to our
    # exact lat/lon bounds within that grid.
    sw_lat, sw_lat_max, sw_lon, sw_lon_max = tile_bounds(x_min, y_max, ZOOM)
    ne_lat, ne_lat_max, ne_lon, ne_lon_max = tile_bounds(x_max, y_min, ZOOM)

    # Full extent of stitched image in lat/lon
    full_lon_min = sw_lon
    full_lon_max = ne_lon_max  # right edge of rightmost tile
    full_lat_min = sw_lat       # bottom edge of bottom tile
    full_lat_max = ne_lat_max   # top edge of top tile

    # Pixel coordinates for crop (linear interpolation in Mercator space)
    def lon_to_px(lon):
        return (lon - full_lon_min) / (full_lon_max - full_lon_min) * stitched_w

    def lat_to_py(lat):
        # Convert to Mercator y for linear mapping
        def merc(l):
            return math.log(math.tan(math.pi / 4 + math.radians(l) / 2))
        merc_top = merc(full_lat_max)
        merc_bot = merc(full_lat_min)
        merc_lat = merc(lat)
        return (merc_top - merc_lat) / (merc_top - merc_bot) * stitched_h

    crop_left = int(round(lon_to_px(LON_MIN)))
    crop_right = int(round(lon_to_px(LON_MAX)))
    crop_top = int(round(lat_to_py(LAT_MAX)))
    crop_bottom = int(round(lat_to_py(LAT_MIN)))

    crop_left = max(0, crop_left)
    crop_right = min(stitched_w, crop_right)
    crop_top = max(0, crop_top)
    crop_bottom = min(stitched_h, crop_bottom)

    print(f"Cropping to pixel rect: left={crop_left}, top={crop_top}, right={crop_right}, bottom={crop_bottom}")
    elevation_cropped = elevation[crop_top:crop_bottom, crop_left:crop_right]

    # Normalize to 0-255
    print(f"Elevation range (clamped): {elevation_cropped.min():.1f}m – {elevation_cropped.max():.1f}m")
    dem_normalized = np.clip(elevation_cropped / MAX_ELEVATION * 255.0, 0, 255).astype(np.uint8)

    # Resize to output size
    dem_img = Image.fromarray(dem_normalized, mode="L")
    dem_img = dem_img.resize((OUTPUT_SIZE, OUTPUT_SIZE), Image.LANCZOS)

    dem_path = OUTPUT_DIR / "dem-heightmap.png"
    dem_img.save(dem_path, optimize=True)
    print(f"Saved DEM heightmap: {dem_path}")

    # Generate land mask
    print("Generating land mask...")
    # Land = elevation > 0 (after clamping, anything positive is land)
    land_mask = (elevation_cropped > 0).astype(np.uint8) * 255
    mask_img = Image.fromarray(land_mask, mode="L")
    mask_img = mask_img.resize((OUTPUT_SIZE, OUTPUT_SIZE), Image.LANCZOS)
    # Apply slight Gaussian blur for smooth coastline transitions
    mask_img = mask_img.filter(ImageFilter.GaussianBlur(radius=1.5))

    mask_path = OUTPUT_DIR / "land-mask.png"
    mask_img.save(mask_path, optimize=True)
    print(f"Saved land mask: {mask_path}")

    print("Done!")


if __name__ == "__main__":
    main()
