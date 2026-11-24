#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
source_file="Seslen/Resources/SeslenLogo.webp"
icon="Seslen/Assets.xcassets/AppIcon.appiconset/AppIcon.png"
test -s "$source_file"
mkdir -p "$(dirname "$icon")"
sips -s format png "$source_file" --out "$icon" >/dev/null
sips -z 1024 1024 "$icon" >/dev/null
test -s "$icon"
echo "Seslen iPhone app icon generated."
