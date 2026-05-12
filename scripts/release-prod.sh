#!/usr/bin/env bash
# Release PearBrowser desktop to the production pear:// channel.
#
# Uses the deprecated `pear release` for now — still works in Pear
# runtime v2.x. The new replacement is multi-publisher multisig
# (`pear provision` + `pear multisig {request,sign,verify,commit}`),
# which is overkill for a solo publisher. Switch to the multisig flow
# if/when:
#   1. `pear release` is actually removed (not just deprecated), OR
#   2. We add co-signers (genuine quorum security)
# Until then, simpler is better.
#
# Usage:  ./scripts/release-prod.sh

set -euo pipefail
cd "$(dirname "$0")/.."

PROD_LINK=$(node -p "require('./pear.json').links.production")

if [[ -z "$PROD_LINK" ]]; then
  echo "✗ Missing production link in pear.json" >&2
  exit 1
fi

echo "▸ production link: $PROD_LINK"
echo

PREV_LEN=$(pear info "$PROD_LINK" 2>/dev/null | grep -E "^\s*release\s" | awk '{print $2}')
echo "▸ previous released length: $PREV_LEN"
echo

# ── 1. stage ──────────────────────────────────────────────
echo "============================================================"
echo "  1/2  pear stage"
echo "============================================================"
STAGE_OUT=$(pear stage "$PROD_LINK" . 2>&1)
echo "$STAGE_OUT" | tail -8
NEW_LEN=$(echo "$STAGE_OUT" | grep -E "^Latest:" | awk '{print $2}')
echo
echo "▸ new staged length: $NEW_LEN"
echo

# ── 2. release ────────────────────────────────────────────
echo "============================================================"
echo "  2/2  pear release  (deprecated path, still works)"
echo "============================================================"
pear release "$PROD_LINK" . 2>&1 | tail -5
echo

echo "✅ Released $PROD_LINK"
echo "   length $PREV_LEN → $NEW_LEN"
echo
echo "Next: re-pin the bundle on HiveRelay so the new length is replicated:"
echo "  node scripts/pin-self-on-hiverelay.js"
