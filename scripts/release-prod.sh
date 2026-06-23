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
# HiveRelay, then confirms the release is actually reachable. Caveat:
# verify-pin.js (a fresh-peer round-trip) CANNOT pass when run on the
# publisher machine — this box's durable seeder announces the drive from
# behind a NAT (`firewalled true`), and Hyperswarm can't holepunch a peer
# to itself; the relays only DIAL the seeder for this heavy-history key,
# they don't announce it as servers. So on the publisher box the script
# confirms reachability via the durable seeder's own log instead (restarts
# the seeder at the new length, checks it announced + has live remote
# peers). verify-pin still runs first and short-circuits to success when
# invoked from a remote host / CI (where it genuinely can pass).

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

SEED_LABEL="com.pearbrowser.seed"
SEED_LOG="$HOME/Library/Logs/pearbrowser-seed.log"

# Confirm reachability via the local durable seeder's log. Returns 0 if the
# seeder re-announced this drive at the new length AND has ≥1 live remote
# peer — the only confirmation that actually works on the publisher box,
# where verify-pin can't holepunch to the firewalled local seeder.
confirm_via_seed_log() {
  launchctl print "gui/$(id -u)/$SEED_LABEL" >/dev/null 2>&1 || return 1
  echo "  ▸ this box runs the durable seeder — confirming via its log"
  # rotate the log so we read a FRESH announce, then restart the seeder so
  # it re-opens the drive at $NEW_LEN and re-announces on the swarm
  [[ -f "$SEED_LOG" ]] && mv "$SEED_LOG" "$SEED_LOG.prev" 2>/dev/null
  launchctl kickstart -k "gui/$(id -u)/$SEED_LABEL" >/dev/null 2>&1 || return 1
  local i peers
  for i in $(seq 1 12); do           # up to ~60s for boot + announce + peers
    sleep 5
    [[ -f "$SEED_LOG" ]] || continue
    grep -q '\^_\^ announced' "$SEED_LOG" 2>/dev/null || continue
    peers=$(grep -Eo '[0-9]+ peers' "$SEED_LOG" 2>/dev/null | awk '{print $1}' | sort -n | tail -1)
    if [[ -n "$peers" && "$peers" -ge 1 ]]; then
      echo "  ✓ seeder announced + $peers live remote peer(s) pulling from it"
      return 0
    fi
  done
  echo "  ✗ seeder did not announce / no peers within 60s"
  return 1
}

# (a) Try the real fresh-peer round-trip once. Passes from a remote host /
#     CI (and short-circuits the whole step). On the publisher box it sees
#     "no peers" — expected, not a real outage — so we fall through to (b).
echo "  ▸ fresh-peer verify (verify-pin.js --expect $NEW_LEN)..."
if node scripts/verify-pin.js --expect "$NEW_LEN"; then
  echo
  echo "🎉 Release complete and verified end-to-end (fresh remote peer)."
  echo "   Anyone running 'pear run $PROD_LINK' will get length $NEW_LEN."
  exit 0
fi

# (b) Co-located false negative — confirm via the durable seeder instead.
echo
echo "  ▸ no peers from here (expected on the publisher box: the seeder is"
echo "    firewalled, so a same-NAT verify can't holepunch to it)"
if confirm_via_seed_log; then
  echo
  echo "🎉 Release complete — served live by the durable seeder."
  echo "   verify-pin can only PASS from a different machine/network; run"
  echo "   'node scripts/verify-pin.js --expect $NEW_LEN' elsewhere to"
  echo "   double-check externally."
  echo "   Anyone running 'pear run $PROD_LINK' will get length $NEW_LEN."
  exit 0
fi

# (c) Not the publisher box (no local seeder) — genuine propagation wait.
#     Relays may still be downloading the new blobs; retry patiently.
echo "  ▸ no local seeder to confirm against — retrying fresh-peer verify"
echo "    (up to 10 min, every 90s)"
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
