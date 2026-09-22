#!/bin/sh
set -eu
BUILD_DIR="${TMPDIR:-/tmp}/blaha-three-build"
mkdir -p "$BUILD_DIR"
npm install --prefix "$BUILD_DIR" --no-audit --no-fund three@0.180.0 esbuild@0.25.10
NODE_PATH="$BUILD_DIR/node_modules" "$BUILD_DIR/node_modules/.bin/esbuild" assets/js/garage3d/main.js --bundle --minify --outfile=assets/js/garage3d.bundle.js
