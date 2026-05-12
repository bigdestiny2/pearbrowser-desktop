#!/usr/bin/env bash
# Full Pear v2.5+ release pipeline for PearBrowser desktop.
#
#   ┌─ pear stage <production-link>          (build the new staged length)
#   ├─ pear info <production-link>           (record old released length)
#   ├─ pear provision <staged-verlink>       (block-sync staged → provision target)
#   │              <provision-target>
#   │              <prev-released-verlink>
#   ├─ pear multisig request                 (create signing request)
#   ├─ pear multisig sign                    (sign with our key)
#   ├─ pear multisig verify                  (sanity check)
#   └─ pear multisig commit                  (promote to production — live!)
#
# Replaces the old single-step `pear release <link>` that was deprecated
# in v2.4.0. The multi-step flow lets you do quorum-cosigning when you
# have co-signers; for solo publishers (us right now) it's still one
# linear pipeline, just more explicit about what each step does.
#
# Usage:  ./scripts/release-prod.sh
# Requires: pear.json with multisig config + links, .pear-sign-password file.

set -euo pipefail
cd "$(dirname "$0")/.."

# --- read config from pear.json ---
PROD_LINK=$(node -p "require('./pear.json').links.production")
TARGET_LINK=$(node -p "require('./pear.json').links.provisionTarget")
QUORUM=$(node -p "require('./pear.json').multisig.quorum")
NAMESPACE=$(node -p "require('./pear.json').multisig.namespace")

if [[ -z "$PROD_LINK" || -z "$TARGET_LINK" ]]; then
  echo "✗ Missing production or provisionTarget link in pear.json" >&2
  exit 1
fi

if [[ ! -f .pear-sign-password ]]; then
  echo "✗ Missing .pear-sign-password. Run \`pear multisig keys get\` first." >&2
  exit 1
fi
PASS=$(cat .pear-sign-password)

echo "▸ production link: $PROD_LINK"
echo "▸ target link:     $TARGET_LINK"
echo "▸ namespace:       $NAMESPACE  (quorum $QUORUM)"
echo

# --- record old released length ---
PREV_LEN=$(pear info "$PROD_LINK" 2>/dev/null | grep -E "^\s*release\s" | awk '{print $2}')
echo "▸ previous released length: $PREV_LEN"
echo

# --- 1. stage ---
echo "============================================================"
echo "  1/5  pear stage"
echo "============================================================"
STAGE_OUT=$(pear stage "$PROD_LINK" . 2>&1)
echo "$STAGE_OUT" | tail -10
NEW_LEN=$(echo "$STAGE_OUT" | grep -E "^Latest:" | awk '{print $2}')
if [[ -z "$NEW_LEN" ]]; then
  echo "✗ Couldn't parse new length from stage output" >&2
  exit 1
fi
echo
echo "▸ new staged length: $NEW_LEN"
echo

# --- 2. provision (block-sync staged source into provision target) ---
echo "============================================================"
echo "  2/5  pear provision"
echo "============================================================"
SOURCE_VERLINK="pear://0.${NEW_LEN}.${PROD_LINK#pear://}"
PREV_VERLINK="pear://0.${PREV_LEN}.${PROD_LINK#pear://}"
pear provision "$SOURCE_VERLINK" "$TARGET_LINK" "$PREV_VERLINK" 2>&1 | tail -10
echo

# --- 3. multisig request ---
echo "============================================================"
echo "  3/5  pear multisig request"
echo "============================================================"
pear multisig request 2>&1 | tail -10
echo

# --- 4. multisig sign (needs password — interactive) ---
echo "============================================================"
echo "  4/5  pear multisig sign  (interactive — needs your password)"
echo "============================================================"
echo "→ When prompted, paste the password from .pear-sign-password"
echo "  (run \`cat .pear-sign-password\` in another terminal)"
pear multisig sign 2>&1
echo

# --- 5. verify + commit ---
echo "============================================================"
echo "  5/5  pear multisig verify + commit"
echo "============================================================"
pear multisig verify 2>&1 | tail -10
echo
read -p "→ Verify above looks right. Commit to production? [y/N] " yn
if [[ "$yn" != "y" && "$yn" != "Y" ]]; then
  echo "✗ Aborted — not committing. The signed request stays valid; you can re-run commit later."
  exit 1
fi
pear multisig commit 2>&1 | tail -10

echo
echo "✅ Released $PROD_LINK length $PREV_LEN → $NEW_LEN"
echo
echo "Next: re-pin the bundle on HiveRelay so the new length is replicated:"
echo "  node scripts/pin-self-on-hiverelay.js"
