#!/bin/sh
# Rebuild backend/sheets-bundle.cjs — a CJS bundle of the ESM-only schema-sheets.
#
# Why: the Bare/Pear CJS backend cannot dynamic-import() schema-sheets ("Cannot
# find referrer"), so backend/sheets-catalog.js require()s a prebuilt CJS bundle.
# Rerun this after bumping the schema-sheets dependency.
#
#   sh scripts/build-sheets-bundle.sh
set -e
cd "$(dirname "$0")/.."
npx --yes esbuild backend/sheets-import.mjs \
  --bundle --format=cjs --platform=node \
  --outfile=backend/sheets-bundle.cjs \
  --external:sodium-native --external:rocksdb-native --external:hypercore-storage
echo "built backend/sheets-bundle.cjs ($(wc -c < backend/sheets-bundle.cjs) bytes)"
