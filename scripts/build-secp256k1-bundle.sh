#!/bin/sh
# Rebuild backend/secp256k1-bundle.cjs — a CJS bundle of ESM-only @noble/secp256k1
# (BIP-340 Schnorr) so the Bare/Pear CJS backend can require() it (Bare can't
# dynamic-import() ESM). Mirrors build-sheets-bundle.sh. Rerun after bumping
# @noble/secp256k1 or @noble/hashes.
#
#   sh scripts/build-secp256k1-bundle.sh
set -e
cd "$(dirname "$0")/.."
npx --yes esbuild backend/secp256k1-entry.mjs \
  --bundle --format=cjs --platform=node \
  --outfile=backend/secp256k1-bundle.cjs
echo "built backend/secp256k1-bundle.cjs ($(wc -c < backend/secp256k1-bundle.cjs) bytes)"
