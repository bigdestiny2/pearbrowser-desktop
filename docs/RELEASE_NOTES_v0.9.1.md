# PearBrowser Desktop v0.9.1 release candidate

Corrective and platform-update candidate for v0.9.0. Two user-facing defects
survived the earlier nonvisual release gates and were caught by post-release
visual QA of the shipped package; both have regression tests. This draft also
updates the Pear contract, browser origins, and local AI packaging.

`v0.9.1` is not a published release yet. The latest published release remains
`v0.9.0`; do not announce or link `v0.9.1` downloads until the public-trust
workflow and post-publication download checks pass.

## Pear v3 and packaging

- Aligns the reviewed platform gate with stable Pear 3.4.0 while retaining the
  separately versioned embedded runtime cohort:
  `pear-runtime@1.3.1`, `pear-install@1.3.0`, and
  `pear-runtime-updater@3.4.0`, with the compatible Autobase,
  Hypercore/Corestore, and Hyperdrive pins in the lockfile.
- Adds `autobee@2.12.1` only as a development compatibility test. Existing
  catalogues remain on their Autobase/Hyperbee implementation and no user data
  is migrated to upstream Autobee.
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
  package". The scan now retries within a 60-second overall startup limit,
  allowing up to 10 seconds for each port attempt. WebSocket diagnostic logs
  omit the session-token URL.
- **Settings relay capability checks.** Every https gateway check failed with
  `transport.get is not a function` — `bare-https@2` exports `request()`
  only. Relay GETs now use `request()+end()`, verified live against the US
  gateway's signed `/.well-known/hiverelay.json`.

## Known infrastructure note (not a code defect)

Earlier diagnostics found no DNS records for `relay-sg.p2phiverelay.xyz` and
`relay-eu.p2phiverelay.xyz`, so their capability rows then reported resolution
failures. Hybrid fetch falls back to pure P2P by design; any remaining gateway
DNS repair is a fleet operation outside this release.

## Browser origin correction

The draft gives each Hyperdrive an exact `d-<full-key-z32>.localhost` host and port. Every proxy listener requires its exact Host and request-target origin; the main listener also rejects drive pages, bound drive listeners reject Clearnet routes, and API tokens are bound to the drive origin. The main-listener Host check closes a Clearnet route that could otherwise serve content under a drive's cookie hostname on a different port. Local Electron diagnostics passed cookie, localStorage, IndexedDB, and token isolation with two synthetic drives. The PR package matrix exercises those diagnostics on its native runners, checks each packaged first window and renderer reload, and uploads checksummed review artifacts; this is not real-app packaged capture or a public release gate pass.

An earlier iframe-based diagnostic real-app rehearsal found that default and `SameSite=Lax` cookies did not persist in that frame context. A `SameSite=None; Secure` proof cookie remained isolated between two keyed app hosts. The first-party candidate described below addresses the frame context; its signed packaged real-app requalification is still required before distribution.

## First-party Hyper tabs (current candidate)

Desktop Hyperdrive pages and installed apps now open as top-level Electron
WebContentsViews inside the browser window. The shell keeps its file origin;
page views use a dedicated persistent session with sandboxing, context
isolation, no Node integration or host preload, and only the exact proxy-bound
drive URL. Ordinary host-only and `SameSite=Lax` cookies can work in this
first-party context. Each drive keeps its exact keyed hostname, so cookies,
localStorage, and IndexedDB remain isolated between drives. Hyper links and
new-window requests are routed through the shell's navigation policy; unsafe
or cross-drive navigation is denied. Clearnet tabs retain their existing path.

**Existing page data:** Published v0.9.0 stored P2P page cookies and browser
storage under shared `127.0.0.1` port origins. The keyed hosts and dedicated
native-view session will not automatically carry those cookies, localStorage,
or IndexedDB entries forward. The old profile bytes are preserved; no
cross-drive storage copy is attempted because the old shared host did not
identify a safe per-drive owner for each entry. An app may ask users to sign
in again or recreate local client state. For important app data, use that
app's own export, backup, sync, or account recovery process before upgrading;
retain the old v0.9.0 profile/package until the app's recovery is confirmed.

Local Electron synthetic-drive checks exercise ordinary Lax and HttpOnly
cookies, storage and token isolation, blocked popup/navigation escape, and
production HyperProxy bridge injection. These are candidate diagnostics.
The exact signed package still requires trusted capture with real Peerit and
Pearfeed journeys and public-trust review before v0.9.1 distribution.

## Local AI packaging

The candidate updates `@qvac/llm-llamacpp` to 0.54.0 and `@qvac/fabric` to
0.17.0. Both macOS architectures' PR packages passed a native addon link check
that rejects external absolute dylib dependencies, including the Intel
Homebrew OpenSSL dependency found in the older addon. A local arm64 CPU smoke
generated seven tokens from a public model; a separate real Chromium loopback
page streamed eight text events through `window.pear.ai` with authenticated
NDJSON. These are candidate diagnostics, not a published P2P app journey.

## Verification

- At exact source head `2503724299a1596ef812fd851b18e9f2e76ee902`, the
  full suite passed **977 tests, 6 skipped, 0 failed**, including the UI-bundle
  and relay-transport guards. [Desktop CI](https://github.com/bigdestiny2/pearbrowser-desktop/actions/runs/36437255547)
  passed. The [four-platform PR package proof](https://github.com/bigdestiny2/pearbrowser-desktop/actions/runs/36437255572)
  passed Apple Silicon macOS, Intel macOS, Windows x64, Linux x64, and the
  exact-source review-bundle verifier. Its packages are ad-hoc/unsigned
  review artifacts, not public-trust installers.
- With the separate diagnostic runner tests included, the local suite passed **980 tests, 6 skipped, 0 failed**. The hosted package proof above remains tied to its recorded source SHA.
- The package gate compares the reviewed Electron/worker/backend/UI bytes,
  verifies the ASAR/unpacked runtime placement and mode-specific Electron fuses,
  validates the protected-key Ed25519/SHA-256 inventory of every physical
  runtime file, requires the embedded Pear sidecar, and rejects legacy launcher
  content.
- Shell renders and connects under the embedded host
  (`[rpc] connected on :9876`); runtime smoke passes against the running app.
- Live capability round-trip against `relay-us.p2phiverelay.xyz` returns the
  signed capability document.
- The v0.9.0 wallet, QVAC, WDK, and release-story receipts remain historical
  evidence. The QVAC candidate diagnostics above do not requalify their
  production or human-journey claims for v0.9.1 distribution.

## Release gate

`npm run check:release-evidence` reports **53 PASS / 18 DEFER / 1 FAIL**. The
failure is trusted, frame-bound cookie-isolation capture from two real P2P apps
in the exact signed public-trust package, with independent review. The public
release preflight also blocks on missing macOS Developer ID/notarization and
Windows PFX credentials, absent v0.9.1 assets and provenance, and clean-install
evidence. Keep v0.9.1 unpublished and the mobile release on hold.
