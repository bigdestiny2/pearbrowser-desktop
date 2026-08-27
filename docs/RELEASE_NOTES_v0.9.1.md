# PearBrowser Desktop v0.9.1 release candidate

Corrective release candidate for v0.9.0. Two user-facing defects survived the nonvisual
release gates and were caught by post-release visual QA of the shipped
package; both are fixed here, each with a regression test.

`v0.9.1` is not a published release yet. The latest published release remains
`v0.9.0`; do not announce or link `v0.9.1` downloads until the public-trust
workflow and post-publication download checks pass.

## Pear v3 and packaging

- Aligns the reviewed embedded cohort with stable Pear 3.3.0:
  `pear-runtime@1.3.1`, `pear-install@1.2.2`, and
  `pear-runtime-updater@3.4.0`, with the compatible Autobase,
  Hypercore/Corestore, and Hyperdrive pins in the lockfile.
- Packages the actual reviewed Electron application with the pinned
  electron-builder configuration. The supported public artifacts are
  signed/notarized macOS `.app.zip` plus `.dmg` for Apple Silicon and Intel, a
  PFX/Authenticode-signed Windows NSIS `.exe`, and a Linux AppImage, each with
  a SHA-256 sidecar and provenance manifest.
- Keeps package-proof outputs as ad-hoc/unsigned GitHub Actions artifacts only.
  Package-proof cannot create a tag, draft, release, or public download.
- Keeps the public-trust workflow manual, stable-tag-only, create-only,
  exact-40-character-source-SHA-pinned, and draft-first. Publication requires
  an explicit public-trust request and protected-environment approval.
- Requires external Developer ID/notary credentials for macOS and the complete
  PFX certificate/password pair for Windows. Azure Trusted Signing is deferred
  for this release because electron-builder 26's current route installs a
  mutable TrustedSigning PowerShell module during the build.
- Keeps Pear runtime OTA download/apply disabled. The retained upgrade identity
  remains migration-only until the production Pear v3 identity, signer roster,
  provision, and multisig ceremony are independently verified.

## Fixed

- **Blank window under the embedded Electron host.** index.html loaded the
  React shell through bare module specifiers, which cannot resolve over
  `file://`. The shell is now a committed esbuild bundle
  (`ui/dist/main.bundle.js`, rebuilt via `npm run build:ui`) that renders
  identically under every host, and a guard test pins index.html to it.
- **Boot race in the renderer.** The 9876–9880 backend port scan ran a single
  pass while the Bare worker was still binding its WS server, so healthy
  installs could show "Boot failed — reinstall the verified signed native
  package". The scan now retries under a 25-second deadline.
- **Settings relay capability checks.** Every https gateway check failed with
  `transport.get is not a function` — `bare-https@2` exports `request()`
  only. Relay GETs now use `request()+end()`, verified live against the US
  gateway's signed `/.well-known/hiverelay.json`.

## Known infrastructure note (not a code defect)

`relay-sg.p2phiverelay.xyz` and `relay-eu.p2phiverelay.xyz` currently have no
DNS records, so their capability rows report a resolution failure even after
this fix. Hybrid fetch falls back to pure P2P by design; restoring those
gateway records is a fleet/DNS operation outside this release.

## Verification

- Full suite passes, including the UI-bundle and relay-transport guards.
- The package gate compares the reviewed Electron/worker/backend/UI bytes,
  verifies the ASAR/unpacked runtime placement and hardened Electron fuses,
  validates the protected-key Ed25519/SHA-256 inventory of every physical
  runtime file, requires the embedded Pear sidecar, and rejects legacy launcher
  content.
- Shell renders and connects under the embedded host
  (`[rpc] connected on :9876`); runtime smoke passes against the running app.
- Live capability round-trip against `relay-us.p2phiverelay.xyz` returns the
  signed capability document.
- All v0.9.0 verification (wallet ceremony/isolate/EVM smokes, QVAC native
  smoke, WDK cohort/network gates, release story smoke with 10 evidence rows)
  applies unchanged to this code line.
