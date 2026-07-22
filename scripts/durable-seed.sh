#!/bin/bash
# Retired: this used to keep a Pear v2 executable project key alive with
# `pear seed`. V3 ships verified native packages and must not revive that
# remote-execution path. Pin non-executable content/evidence explicitly with
# `node scripts/pin-self-on-hiverelay.js <64-hex-hyperdrive-key>`.

echo "durable-seed.sh is retired: legacy Pear v2 executable seeding is not a v3 release workflow." >&2
exit 2
