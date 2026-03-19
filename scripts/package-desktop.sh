#!/usr/bin/env bash
# package-desktop.sh — Package game into distributable .exe / .app / .zip
#
# Usage:
#   ./scripts/package-desktop.sh [win64|osx64|linux64|all]
#
# Prerequisites:
#   npm install -g nw-builder
#
# For Steam distribution, you'll upload the output folder to Steamworks.

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD="$ROOT/desktop/build"
OUT="$ROOT/desktop/dist"
TARGET="${1:-all}"
NWJS_VERSION="0.85.0"

do_build() {
  local plat="$1"
  local os arch
  case "$plat" in
    win64)   os="win";   arch="x64" ;;
    osx64)   os="osx";   arch="x64" ;;
    linux64) os="linux";  arch="x64" ;;
  esac
  echo "  -> $os ($arch)..."
  nwbuild "$BUILD" \
    --mode build \
    --version "$NWJS_VERSION" \
    --platform "$os" \
    --arch "$arch" \
    --outDir "$OUT/$plat" \
    --glob false
}

# Step 1: Assemble build
echo "==> Assembling game files..."
bash "$ROOT/scripts/build-desktop.sh"

# Step 2: Package
echo "==> Packaging for: $TARGET"
mkdir -p "$OUT"

if ! command -v nwbuild &>/dev/null; then
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

case "$TARGET" in
  win64|osx64|linux64)
    do_build "$TARGET"
    ;;
  all)
    for t in win64 osx64 linux64; do
      do_build "$t"
    done
    ;;
  *)
    echo "Unknown target: $TARGET"
    echo "Use: win64, osx64, linux64, or all"
    exit 1
    ;;
esac

echo "==> Packages written to: $OUT"
ls -la "$OUT"
