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
# --platform=node leaves node core builtins as bare require("events"/"url"/"fs"),
# which the Pear/Bare runtime cannot resolve (it ships bare-* instead) — that was
# the "[dev-catalogue] MODULE_NOT_FOUND: Cannot find module 'events'" boot error.
# Alias the few core builtins the bundle touches onto their Bare equivalents so
# the output loads under Bare. (bare-events is a drop-in EventEmitter; the url/fs
# site is bare-addon-resolve's pathToFileURL/existsSync.)
npx --yes esbuild backend/sheets-import.mjs \
  --bundle --format=cjs --platform=node \
  --outfile=backend/sheets-bundle.cjs \
  --external:sodium-native --external:rocksdb-native --external:hypercore-storage \
  --external:quickbit-native --external:simdle-native \
  --alias:events=bare-events --alias:url=bare-url --alias:fs=bare-fs
echo "built backend/sheets-bundle.cjs ($(wc -c < backend/sheets-bundle.cjs) bytes)"
