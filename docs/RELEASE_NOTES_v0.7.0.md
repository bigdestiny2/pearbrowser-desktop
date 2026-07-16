# PearBrowser Desktop v0.7.0

PearBrowser `v0.7.0` makes browser protection and extensions peer-to-peer.
Content Shield can now subscribe to checksum-verified filter-list Hyperdrives,
hot-swap updates, and keep blocking offline. Pear Plugins install from ordinary
drives with explicit capabilities, hash-authorized content injection, a kill
switch, and a fail-closed re-consent step whenever an update asks for more
power.

The release also adds a P2P plugin catalogue with one-click Install/Open
actions. Pear Dark Reader, peerit Enhancer, the default shield list, and the
catalogue itself are already published, pinned on HiveRelay, and fresh-peer
verified.

Highlights:

- P2P filter lists with SHA-256 verification, 30-minute refresh, and offline
  restore.
- Pear Plugins for scoped styles, scripts, and network filters.
- Capability-escalation protection: updates cannot silently gain permissions.
- Snapshot-bound install consent and safe CSS embedding across list/plugin
  boundaries; community catalogues cannot forge the curated trust mark.
- One-click P2P catalogue discovery, including anonGPT as an app entry.
- Per-drive shield allowlists and strict mode through the browser-owned proxy.

PearBrowser remains local-first: blocked requests never leave the browser,
plugin/list metadata is independently verifiable, and no account or central
extension store is required.

Native macOS, Windows, and Linux packages are package-proof previews with
matching SHA-256 sidecars. macOS is not notarized and Windows is unsigned, so
operating-system trust prompts remain expected until public-trust credentials
are configured. The stable Pear address continues to hot-sync the current app:

`pear://tco5k7h38uoxatedp1wongdbhjxow1x7jiwm3t1i9cujbebhsbty`
