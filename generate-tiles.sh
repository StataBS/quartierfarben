#!/bin/bash
set -e

echo "=== Starting ETL process ==="
echo "Timestamp: $(date -u +'%Y-%m-%dT%H:%M:%SZ')"

# Run the ETL as a marimo *script* (skips edit-only SVG/snapshot cells via mo.stop)
echo "Running etl.py..."
uv run etl.py

# Check if landuse.geojson was created
if [ ! -f "landuse.geojson" ]; then
    echo "ERROR: landuse.geojson was not created!"
    exit 1
fi

echo "landuse.geojson created successfully ($(du -h landuse.geojson | cut -f1))"

# Generate tiles
echo "=== Generating vector tiles with tippecanoe ==="
mkdir -p /output
rm -rf /output/*

tippecanoe \
    --output-to-directory /output \
    --layer landuse-data \
    --force --no-tile-compression \
    --minimum-zoom=12 --maximum-zoom=17 \
    --full-detail=17 --low-detail=12 \
    --no-tiny-polygon-reduction \
    --detect-shared-borders \
    --extend-zooms-if-still-dropping \
    --no-feature-limit --no-tile-size-limit \
    ./landuse.geojson

# Write timestamp file
echo "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" > /output/.generated

echo "=== Tile generation complete ==="
echo "Tiles written to /output"
ls -la /output | head -20
