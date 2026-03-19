#!/usr/bin/env bash
# package-desktop.sh — Package game into distributable .exe / .app / .zip
#
# Usage:
#   ./scripts/package-desktop.sh [win64|osx64|linux64|all]
#
# Prerequisites:
#   npm install -g nwjs-builder-phoenix
#   — or: npm install --save-dev nwjs-builder-phoenix
#
# For Steam distribution, you'll upload the output folder to Steamworks.

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD="$ROOT/desktop/build"
OUT="$ROOT/desktop/dist"
PLATFORM="${1:-all}"
NWJS_VERSION="0.85.0"

# Step 1: Assemble build
echo "==> Assembling game files..."
bash "$ROOT/scripts/build-desktop.sh"

# Step 2: Package with nwjs-builder-phoenix
echo "==> Packaging for: $PLATFORM"
mkdir -p "$OUT"

if command -v nwbuild &>/dev/null; then
  case "$PLATFORM" in
    win64)
      nwbuild "$BUILD" --platforms win64 --version "$NWJS_VERSION" --output-dir "$OUT"
      ;;
    osx64)
      nwbuild "$BUILD" --platforms osx64 --version "$NWJS_VERSION" --output-dir "$OUT"
      ;;
    linux64)
      nwbuild "$BUILD" --platforms linux64 --version "$NWJS_VERSION" --output-dir "$OUT"
      ;;
    all)
      nwbuild "$BUILD" --platforms win64,osx64,linux64 --version "$NWJS_VERSION" --output-dir "$OUT"
      ;;
    *)
      echo "Unknown platform: $PLATFORM"
      echo "Use: win64, osx64, linux64, or all"
      exit 1
      ;;
  esac
  echo "==> Packages written to: $OUT"
  ls -la "$OUT"
else
  echo ""
  echo "nwbuild not found. Install it:"
  echo "  npm install -g nw-builder"
  echo ""
  echo "Or manually package:"
  echo "  1. Download NW.js from https://nwjs.io/downloads/"
  echo "  2. Copy contents of $BUILD into the NW.js folder"
  echo "  3. For Windows: rename nw.exe to 'Aces Loaded.exe'"
  echo "  4. For macOS: put files in nwjs.app/Contents/Resources/app.nw/"
  echo "  5. Upload the folder to Steamworks"
  exit 1
fi
