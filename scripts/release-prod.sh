#!/usr/bin/env bash
# PearBrowser v3 native-release preflight.
#
# This command intentionally has no publication authority. The legacy Pear
# staged-drive/appling publisher is not a desktop release path. The approved
# workflow packages the reviewed Electron source with electron-builder and
# keeps package-proof outputs in GitHub Actions only.

set -euo pipefail
cd "$(dirname "$0")/.."

if [[ "${1:-}" == "--help" ]]; then
  cat <<'EOF'
Usage: ./scripts/release-prod.sh

Runs local native-release preflight only. It never stages, publishes, seeds,
creates a tag, or modifies a GitHub Release. Use the manual, create-only,
draft-first v3 native workflow after this command reports success.
EOF
  exit 0
fi

echo "PearBrowser v3 native-release preflight"
echo "This command has no publication authority."

npm run check:pear-v3
npm run check:pear-cli
npm run check:release-evidence
npm run check:native-signing
npm run check:linux-appimage-metadata

cat <<'EOF'

Preflight complete. Before promotion, an approved operator must provide:
  1. Developer ID signing/notarization credentials for macOS;
  2. the complete PFX/Authenticode credential pair for the Windows NSIS lane;
  3. an exact immutable 40-character source commit SHA;
  4. signed/notarized macOS .app.zip + .dmg, signed Windows NSIS .exe, and
     Linux AppImage artifacts with matching SHA-256 sidecars; and
  5. clean-install, upgrade, rollback, and data-continuity evidence.

Pear runtime OTA remains disabled until the production Pear v3 identity,
signer roster, and multisig ceremony are independently verified.

No release was staged or published.
EOF
