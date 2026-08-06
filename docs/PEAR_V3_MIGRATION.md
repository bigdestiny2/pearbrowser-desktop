# PearBrowser v3 migration boundary

PearBrowser is moving from a v2 project launcher to a native desktop browser
that presents verified applications and installs as distinct user actions.

## What users do

- Install PearBrowser from a native package and verify the published checksum.
- Use `hyper://` drives as browsable content or sites.
- Treat old top-level `pear://` catalogue links as legacy migration identifiers.
  They do not execute in PearBrowser v3 and are never supplied to
  `PearRuntime.run()`.
- Install a Pear v3 build only from an explicit catalogue
  `nativeDelivery` block whose kind is `pear-v3` and whose `installLink` is a
  canonical root `pear://<52-character-key>` link. Installation is a separate,
  host-confirmed action through `pear-install`; it is never tab navigation.
- A legacy-only app displays **Legacy app — migration required**. A verified
  publisher/AppRelease attestation remains catalogue trust evidence; it does
  not turn a legacy runtime link into a v3 build.

An available native catalogue entry uses this shape (with the real published
key and only the OS/architecture targets actually present in the build):

```json
{
  "nativeDelivery": {
    "status": "available",
    "kind": "pear-v3",
    "installLink": "pear://<52-character-key>",
    "productName": "Example App",
    "targets": ["darwin-arm64", "linux-x64", "win32-x64"]
  }
}
```

## Runtime boundary

PearBrowser v3 is a conventional Electron application. The Electron main
process owns windows, OS lifecycle, and the narrow preload bridge; it starts
only the bundled `workers/main.js` through
`PearRuntime.run(require.resolve(...))`. That worker owns the Bare backend and
the authenticated localhost RPC service.

The renderer receives a freshly generated, per-launch session token through
the context-isolated preload bridge. It cannot invoke the runtime or obtain
Node integration. The preload exposes narrow native-app list/install/launch
operations; Electron main validates the renderer, shows the OS-level install
confirmation, and accepts no caller-controlled destination, binary filter, or
DHT bootstrap configuration. A remote catalogue link remains discovery
metadata, never a `PearRuntime.run()` input.

The native launcher pins `pear-install@1.2.2`. It accepts one GUI artifact for
the current OS (`.app`, `.AppImage`, or `.msix`), rejects packages exposing
command-line binary targets, requires the package's `upgrade` identity to match
the requested link and optional catalogue product name, and rejects unexpected
install destinations or an incompatible declared platform target. The installed
application then starts and configures its own embedded `pear-runtime`; the
browser does not provide an ambient `Pear` global or runtime configuration.

The `package.json#upgrade` field is a v3 OTA deployment identity, not a
browser-launch affordance. It must move to the project’s production multisig
link before a public v3 release. The existing value is retained only to keep
the source buildable while the signing quorum establishes that channel.

## Data continuity

Do not delete an old installation as part of migration. Preserve its user data
until an app-specific migration adapter has completed discover, preserve,
migrate, validate, and rollback evidence. HiveRelay durability is availability
evidence, not a substitute for package signature or local data validation.

## Current release state and remaining gates

PearBrowser `v0.8.0` was published on 2026-07-29 with package-proof native
assets and SHA-256 sidecars for macOS, Windows, and Linux. The source includes
the pinned `pear-runtime@1.3.1` host and local-worker boundary. This GitHub
release does not claim macOS Developer ID notarization, Windows public-trust
signing, or completion of the separate Pear production upgrade line.

Before the retained `package.json#upgrade` identity can stop being a migration
record and become the public Pear v3 production channel, it still needs:

- independently verified platform signing and native runner evidence;
- stage → provision → multisig evidence for the production upgrade link (the
  signing quorum is human-controlled);
- storage discovery, migration, validation, and rollback evidence for an
  existing v2 profile; and
- installer/update/recovery UX evidence that treats HiveRelay as availability,
  never package attestation.
