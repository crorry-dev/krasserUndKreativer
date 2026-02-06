#!/bin/bash
# Generate PWA icons from SVG

cd "$(dirname "$0")"

# Check for ImageMagick
if command -v convert &> /dev/null; then
    echo "Generating icons with ImageMagick..."
    convert -background none icon.svg -resize 192x192 icon-192.png
    convert -background none icon.svg -resize 512x512 icon-512.png
    convert -background none icon.svg -resize 180x180 apple-touch-icon.png
    convert -background none icon.svg -resize 32x32 favicon-32.png
    convert -background none icon.svg -resize 16x16 favicon-16.png
    echo "✓ Icons generated!"
elif command -v rsvg-convert &> /dev/null; then
    echo "Generating icons with librsvg..."
    rsvg-convert -w 192 -h 192 icon.svg -o icon-192.png
    rsvg-convert -w 512 -h 512 icon.svg -o icon-512.png
    rsvg-convert -w 180 -h 180 icon.svg -o apple-touch-icon.png
    echo "✓ Icons generated!"
else
    echo "⚠ Neither ImageMagick nor librsvg found"
    echo "Install with: brew install imagemagick"
    echo "Or: brew install librsvg"
    echo ""
    echo "Using SVG fallback - copy icon.svg for all sizes"
    exit 1
fi
