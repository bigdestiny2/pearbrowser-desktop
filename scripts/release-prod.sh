#!/usr/bin/env bash
# PearBrowser v3 native-release preflight.
#
# This command intentionally has no publication authority. The v2 staged-drive
# publisher was removed: a remote Pear link is neither a desktop installer nor
# a valid update target for the embedded runtime. A release operator must build
# a native package, create and sign its AppRelease v2 record, publish through
# the approved release workflow, then attach independent availability evidence.

set -euo pipefail
cd "$(dirname "$0")/.."

if [[ "${1:-}" == "--help" ]]; then
  cat <<'EOF'
Usage: ./scripts/release-prod.sh

Runs local native-release preflight only. It never stages, publishes, seeds,
or modifies a remote release. Use the human-gated v3 release workflow after
this command reports success.
EOF
  exit 0
fi

echo "PearBrowser v3 native-release preflight"
echo "This command has no publication authority."

npm run check:release-evidence
npm run check:native-signing
npm run check:linux-appimage-metadata

cat <<'EOF'

Preflight complete. Before promotion, an approved operator must provide:
  1. a signed native package for the target platform;
  2. a verified AppRelease v2 record and compatible local worker entrypoint;
  3. independent HiveRelay availability evidence; and
  4. clean-install, upgrade, rollback, and data-continuity evidence.

No release was staged or published.
EOF
