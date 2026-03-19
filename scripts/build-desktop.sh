#!/usr/bin/env bash
# build-desktop.sh — Assemble game files into desktop/build/ for NW.js packaging
#
# Usage:
#   ./scripts/build-desktop.sh          # assemble files
#   ./scripts/build-desktop.sh --run    # assemble + launch with nwjs (must be installed)
#
# Prerequisites:
#   brew install nwjs    (macOS)
#   — or download from https://nwjs.io and put `nw` on PATH

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD="$ROOT/desktop/build"

echo "==> Cleaning build dir..."
rm -rf "$BUILD"
mkdir -p "$BUILD"

echo "==> Copying game files..."
# NW.js manifest
cp "$ROOT/desktop/package.json" "$BUILD/"

# Game HTML + JS
cp "$ROOT/index.html" "$BUILD/"
cp -r "$ROOT/src" "$BUILD/"
cp -r "$ROOT/data" "$BUILD/"
cp -r "$ROOT/vendor" "$BUILD/"
cp -r "$ROOT/assets" "$BUILD/"

# Strip CDN fallback — desktop always uses local Phaser
# (the local vendor/phaser.min.js is already copied)

echo "==> Build assembled at: $BUILD"
echo "    Files: $(find "$BUILD" -type f | wc -l | tr -d ' ')"
echo "    Size:  $(du -sh "$BUILD" | cut -f1)"

if [[ "${1:-}" == "--run" ]]; then
  echo "==> Launching with NW.js..."
  if command -v nw &>/dev/null; then
    nw "$BUILD"
  elif [ -d "/Applications/nwjs.app" ]; then
    open -a nwjs "$BUILD"
  else
    echo "ERROR: nw not found. Install via: brew install nwjs"
    echo "       Or download from https://nwjs.io"
    exit 1
  fi
fi
