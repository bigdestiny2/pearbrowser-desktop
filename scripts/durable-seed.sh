#!/bin/bash
# Durable HiveRelay seeder for the PearBrowser production release.
#
# Why this exists: the desktop production key (pear://tco5k7…) carries ~705 MB
# of append-only staging history (16k+ versions). HiveRelay relays accept the
# pin but won't each replicate a complete copy of that heavy-history drive, so
# a fresh `pear run pear://tco5k7…` can't be served by relays alone. Until the
# release is re-cut on a lean key (which would break existing users' auto-update)
# the publisher must seed it — this script is that always-on seeder.
#
# Run by launchd (~/Library/LaunchAgents/com.pearbrowser.seed.plist) with
# RunAtLoad + KeepAlive, so it starts on login and auto-restarts if it dies.
#
# To seed additional keys, run one launchd agent per key (copy the plist with a
# new Label + this script's link) — `pear seed` takes one link per process, and
# per-key agents give each its own KeepAlive supervision.

export PATH="/opt/homebrew/bin:$HOME/Library/Application Support/pear/bin:/usr/local/bin:/usr/bin:/bin"

# Production browser release. `exec` so launchd supervises the pear process
# directly (its KeepAlive restarts THIS pid if it exits).
exec pear seed --no-tty pear://tco5k7h38uoxatedp1wongdbhjxow1x7jiwm3t1i9cujbebhsbty
