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
# Usage:
#   ./scripts/release-prod.sh           # full release: stage → release → pin → verify
#   ./scripts/release-prod.sh --no-pin  # skip pin + verify (for dry-run / hotfix tests)
#
# After publishing, the script automatically pins the new length on
# HiveRelay AND verifies (via verify-pin.js) that a fresh peer can
# actually fetch blob content from the network. If verification fails
# the script exits non-zero — that means the release is published but
# *not yet propagated*, and end users running `pear run pear://...`
# will hang on first launch. Re-run pin and wait, or investigate.

set -euo pipefail
cd "$(dirname "$0")/.."

SKIP_PIN=0
for arg in "$@"; do
  if [[ "$arg" == "--no-pin" ]]; then SKIP_PIN=1; fi
done

PROD_LINK=$(node -p "require('./pear.json').links.production")

if [[ -z "$PROD_LINK" ]]; then
  echo "✗ Missing production link in pear.json" >&2
  exit 1
fi

strip_ansi() {
  sed -E $'s/\x1B\\[[0-9;?]*[[:alpha:]]//g'
}

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
STAGE_CLEAN=$(printf '%s\n' "$STAGE_OUT" | strip_ansi)
printf '%s\n' "$STAGE_CLEAN" | tail -8
NEW_LEN=$(printf '%s\n' "$STAGE_CLEAN" | awk '/Latest:/ {print $2; exit}')
if [[ -z "$NEW_LEN" ]]; then
  echo "✗ Could not parse staged length from pear stage output" >&2
  exit 1
fi
echo
echo "▸ new staged length: $NEW_LEN"
echo

# ── 2. release ────────────────────────────────────────────
echo "============================================================"
echo "  2/2  pear release  (deprecated path, still works)"
echo "============================================================"
RELEASE_OUT=$(pear release "$PROD_LINK" . 2>&1)
RELEASE_CLEAN=$(printf '%s\n' "$RELEASE_OUT" | strip_ansi)
printf '%s\n' "$RELEASE_CLEAN" | tail -5
RELEASE_LEN=$(printf '%s\n' "$RELEASE_CLEAN" | awk '/Latest length:/ {print $3; exit}')
if [[ -n "$RELEASE_LEN" ]]; then
  NEW_LEN="$RELEASE_LEN"
fi
echo

echo "✅ Released $PROD_LINK"
echo "   length $PREV_LEN → $NEW_LEN"
echo

if [[ "$SKIP_PIN" == "1" ]]; then
  echo "▸ --no-pin given, skipping pin + verification"
  echo "  manually: node scripts/pin-self-on-hiverelay.js"
  echo "           node scripts/verify-pin.js --expect $NEW_LEN"
  exit 0
fi

# ── 3. pin on HiveRelay backbone ──────────────────────────
echo "============================================================"
echo "  3/4  pin on HiveRelay  (refresh 365-day TTL)"
echo "============================================================"
node scripts/pin-self-on-hiverelay.js
echo

# ── 4. verify the pin actually serves the new length ──────
echo "============================================================"
echo "  4/4  verify content is reachable from the network"
echo "============================================================"
echo "  (relays may still be downloading ${NEW_LEN}'s blobs —"
echo "   waiting up to 10 min, retrying every 90s)"
echo

ATTEMPT=0
MAX_ATTEMPTS=7   # 7 * 90s ≈ 10 min
until node scripts/verify-pin.js --expect "$NEW_LEN"; do
  ATTEMPT=$((ATTEMPT + 1))
  if [[ $ATTEMPT -ge $MAX_ATTEMPTS ]]; then
    echo
    echo "✗ Release succeeded but blobs not yet reachable from a fresh peer."
    echo "  The drive IS published — re-run \`node scripts/verify-pin.js --expect $NEW_LEN\`"
    echo "  in 10–20 min. If it keeps failing, relays may need a higher maxStorage"
    echo "  cap (see scripts/pin-self-on-hiverelay.js SEED_OPTS)."
    exit 2
  fi
  echo "  ↻ retry $ATTEMPT/$MAX_ATTEMPTS in 90s..."
  sleep 90
done

echo
echo "🎉 Release complete and verified end-to-end."
echo "   Anyone running 'pear run $PROD_LINK' will get length $NEW_LEN."
