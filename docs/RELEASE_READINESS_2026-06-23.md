# PearBrowser Release Readiness - 2026-06-23

Scope: desktop PearBrowser, mobile/native PearBrowser, the live PearBrowser Network catalogue, and the high-risk systems called out for review: catalogue, app launch, search, naming, Nostr bridge, site publishing, sync, and release operations.

Manual smoke checklist: `docs/MANUAL_RELEASE_SMOKE_2026-06-23.md`.
Operator evidence log: `docs/RELEASE_SMOKE_EVIDENCE_LOG_2026-06-23.md`.

## Current Verdict

The release is in strong shape for a community launch. The core protocol tests are broad and green after the final catalogue cleanup:

- Desktop: `npm test` passed `455/455` after the dual-architecture macOS native packaging update, native release public-trust workflow mode, native release asset resolver/checker, native download verifier, public-trust macOS DMG gate, release story smoke tooling, evidence updates, and vendored HiveRelay source-install guard.
- Mobile/native: `npm test` passed `139/139` in the Mobile Release Preflight workflow.
- Mobile evidence was refreshed in `bigdestiny2/PearBrowser@9101200d8bb54ff31b21d6d90154cb2321756a6c`: Mobile Release Preflight run `https://github.com/bigdestiny2/PearBrowser/actions/runs/28316870344` uploaded the `mobile-release-preflight` artifact, and the downloaded report verified as `14 pass / 0 warn / 4 expected blockers / 0 unexpected blockers or warnings`.
- Publisher catalogue: `npm run validate` passes with no warnings.
- Desktop and mobile `git diff --check` are clean.
- Desktop dependency audit: `npm audit --audit-level=high` found 0 vulnerabilities after the vendored HiveRelay lockfile update.
- Mobile dependency audit: safe `npm audit fix` removed high/critical advisories, `npm audit --audit-level=high` now passes, and the full mobile suite still passes. Full `npm audit` still reports 15 moderate inherited Expo/React Native toolchain advisories with only breaking framework fixes offered.
- Mobile release preflight is now machine-checkable in CI with `npm run release:preflight`: the workflow runs `npm ci`, `npm test`, the high-severity audit, native worklet bundles, iOS BareKit/addons mirroring, Android BareKit AAR mirroring, and a soft JSON report check. The remaining failures are the expected external production gates: real Android signing env/keystore, Apple development team signing, TestFlight/App Store Connect validation, and Play/Firebase validation.
- Desktop source-install reproducibility is now standalone: `npm install` runs `scripts/check-hiverelay-layout.mjs`, which verifies the vendored HiveRelay `0.20.0` package tarballs under `vendor/hiverelay`. The sibling `../../00-core/hiverelay` checkout is now optional development context, not an install prerequisite. A minimal fixture containing only `package.json`, `package-lock.json`, the guard script, and `vendor/hiverelay/*.tgz` passed `npm ci` without the sibling checkout.
- Desktop GitHub Actions CI is now present: `.github/workflows/desktop-ci.yml` checks out PearBrowser desktop and `bigdestiny2/PearBrowser@de85d420c942d433905324c3e098acc34458a23a`, verifies the vendored HiveRelay packages, runs `npm ci`, runs the desktop test suite, and runs the high-severity dependency audit.
- Desktop native packaging is now wired through `.github/workflows/desktop-native-release.yml`: macOS emits ad-hoc signed `.app.zip` assets for Apple Silicon and Intel, Windows emits `.msix` plus `.exe`, Linux emits `.AppImage`, and the collector attaches checksums plus manifests per platform/architecture. The workflow now separates `release_mode=package-proof` from `release_mode=public-trust`: manual package-proof runs can refresh ad-hoc/unsigned assets, while public-trust, release-published, and tag-triggered runs fail closed on missing macOS Developer ID/notary or Windows signing credentials, create notarized macOS DMGs before artifact collection, require macOS DMGs in the post-upload public-trust asset check, and require the GitHub release to be published. The `v0.5.0` GitHub release asset backfill completed successfully again on 2026-06-28 in Desktop Native Release run `28321639492` from `main` with `source_ref=main` and `release_mode=package-proof` after the macOS Intel release-target merge; macOS Apple Silicon, macOS Intel, Windows, Linux, and attach jobs passed, and the attach job refreshed 20 release assets. `npm run check:native-release-assets -- --tag v0.5.0 --repo bigdestiny2/pearbrowser-desktop --json` now verifies the live GitHub attachment set and passed with 20 assets, zero warnings, and zero errors. `npm run verify:native-downloads -- --tag v0.5.0 --repo bigdestiny2/pearbrowser-desktop --all --json` downloaded the recommended macOS arm64, macOS x64, Windows x64, and Linux x64 packages and verified all four against their attached `.sha256` sidecars. `npm run resolve:native-release -- --tag v0.5.0 --repo bigdestiny2/pearbrowser-desktop --platform macos --arch arm64` and `--platform macos --arch x64` resolve the current macOS packages and checksum sidecars for user-facing install guidance.
- Live catalogue Hyperbee republished at `hyperbee://f5fb7500bccd60a976d2b1d24246108f4444a210b9ca591533114dffc089934d`; the corrected version 7 catalogue has 14 apps and 5 relay seed requests were accepted.
- Production browser drive fresh-peer verification passed at length `18640`, with `/backend/anongpt-buyer.js` blob fetch proving content blocks are reachable. This is the 2026-06-24 hotfix release that keeps in-page `hyper://` links inside PearBrowser instead of handing them to macOS.
- Production release contents were scanned from a fresh peer at length `18640`: 10,233 metadata entries, and forbidden local/operator paths `/.landing-seed.mjs`, `/pearbrowser-storage`, `/docs`, `/scripts`, `/examples`, and `/test` were absent.
- Live catalogue fresh-peer verification passed at Hyperbee core length `273`, with signed meta present and Peercord/peerit/HiveWorm rows matching expected release metadata, including Peercord `type: "standalone"`, Peercord source/licence metadata, and peerit `type: "hypersite"`.
- Desktop GUI runtime has a repeatable diagnostic smoke path: `node scripts/runtime-rpc-smoke.mjs` connects to the app's `/status-smoke` WebSocket path, sends `CMD_GET_STATUS`, and asserts DHT, proxy, relay, peer-count, and storage readiness without becoming the renderer or closing the app. Latest 2026-06-28 smoke passed against the production PearBrowser link: RPC `9876`, proxy `18788`, DHT connected, peerCount `7`, HiveRelays `7`, storage `114%` on this local profile. The strict demo gate `--max-storage-percent 100` was added and correctly fails this profile (`storagePercent` `113`, error `storagePercent exceeds 100`) while the backend readiness fields remain healthy. Clean or reset the profile before a screenshot/demo pass. `node scripts/release-rpc-story-smoke.mjs --local-stories --site-story` now adds a nonvisual story preflight that fetches the homepage through the local proxy, validates the live release catalogues/featured rows, proves local search first-paint, curated/petname naming, bookmark/session round-trips, and creates/publishes/fetches/deletes a temporary site without launching third-party apps or approving trust. Latest live run passed with homepage HTTP `200`, `90770` bytes, two catalogues, 14 apps, all five featured rows, Peercord `standalone`/window-only, local search doc `e6736e752c935f0c`, curated `peerit` plus temporary petname naming evidence, and temporary site `hyper://44e2cf9d3aaddc219debf702364c68b946fafd763d0bc57d8994876bf9f85711` fetched HTTP `200` before HiveRelay unseed cleanup. The temporary site pin accepted `3` relays but did not reach durable status before timeout, so this is publish/reload evidence, not relay-durability evidence.
- Real-DHT relay health passed again after the latest doc/native fix push, with 1 unique HiveRelay reachable and 8 live relay connections. A restricted/sandboxed network run can false-negative DHT discovery, so release checks should run with real network access.
- PearBrowser homepage and Keet bundle drives were fresh-peer sampled again without executing third-party code on 2026-06-28; both returned peers, file listings, and zero missing sampled blobs. Latest samples: PearBrowser homepage peers `2`, entries `3`, sampled `3/3`; Keet peers `9`, entries `7449`, sampled `12/12`.
- Peercord's 2026-06-23 bundle proof remains historical, not current release evidence. The 2026-06-28 fresh-peer rerun timed out twice with `0` peers; a read-only HiveRelay repin attempt opened version `1` with `0` files and received `7` relay acceptances, then matching unseed cleanup was broadcast to `7` relays. Post-cleanup verification still saw peers `1`, meta length `0`, entries `0`, and the Linux/Windows contract checks could not fetch `pear.json` or `index.js`. A source-side repair audit found upstream Peercord reachable at `ea260a3bfba279769acfbfe0a436140c87a0fa15` with package version `1.0.8`, the same decoded public key (`a2ea4d769d5e2b90caca4fbcb7f4b7b43caf43f2555b81201d3463ef89b55c26`), and the same desktop/window launch contract, but the canonical `pear stage`/`pear seed` flow requires Peercord publisher authority. Peercord therefore needs upstream/operator reseed, complete publisher storage, or relay cleanup plus complete canonical seed before its bundle availability can be treated as current PASS evidence. Details: `docs/PEERCORD_BUNDLE_REPAIR_2026-06-28.md`.
- Native simulator/device smoke is mostly cleared: the generated Expo iOS project exposed a real missing native module (`ExpoLinking`), the tracked dependency is now added and autolinked, and the tracked SwiftUI `ios-native` shell now builds, installs, launches, recovers from stale Corestore layout, and reaches a green `Connected` worklet state on the iPhone 17 simulator. Generated Expo iOS Debug and Release simulator builds now pass; the Release helper pins `HERMES_CLI_PATH` to the Pods `hermesc` as an Xcode build setting so the bundle phase does not hang on the node_modules compiler path. Android native now builds a fresh debug APK with a verified JDK 17, installs it on a headless `pp_avd` emulator, launches `com.pearbrowser.app/.MainActivity`, loads `libbare-kit.so`, extracts `backend.android.bundle`, starts the local proxy, and reaches a green `Connected` Home screen. Android native release APK/AAB builds also pass with R8/resource shrink, and the env-driven signing path verifies with a disposable test key (`apksigner` for APK, `jarsigner` for AAB). The latest mobile test pass also covers the extracted navigation parser, verified signed-catalog update forwarding, Android native proxy/token bridge guards, and Android Browse share-sheet wiring.

One earlier desktop `npm test` run reported `401/402`; the immediately repeated compact full run passed `402/402`. During the native release asset checker update, one full-suite run also exposed the existing `nostr-index-room` verify-and-drop flake, while the isolated test and immediate full rerun passed. The current release branch now passes `455/455` after the Peercord launch-mode, peerit, catalogue-dedupe, naming-target, runtime-smoke, release-doc, release-evidence checker, live-catalogue provenance, announcement-decision fail-closed coverage, startup landing regression coverage, in-page `hyper://` link bridge coverage, native signing preflight, native release public-trust workflow mode, dual-architecture macOS native packaging, native download verifier, public-trust macOS DMG gate, empty-checkout pin guard, runtime storage gate, release story smoke coverage, native release asset checker/resolver coverage, and vendored HiveRelay standalone source-install coverage landed.

## Fixes In This Pass

- Added Peercord to the featured apps and default catalogue, with tests.
- Kept Peercord on the standalone Pear launch path. Upstream Peercord currently ships as a full Pear desktop app, not a pear-request worker, so surfacing "Run in tab" would create a bad launch experience. It can move to headless tab launch once Peercord publishes a worker/headless entry point.
- Added peerit to the default catalogue, offline seed, Sites discovery ranking, URL-bar curated aliases, and the launch tab set beside the PearBrowser landing page.
- Kept the PearBrowser homepage as the active launch tab even when a previous session saved an app page such as Dealroom as active; restored tabs are preserved behind the landing defaults.
- Fixed in-page `hyper://` anchors inside browsed Hyperdrive pages so they route through PearBrowser tab navigation instead of escaping to the host OS protocol handler.
- Cleaned the HiveWorm catalogue row: explicit `driveKey`, `url` for the Hyperdrive page, and no misleading `pearLink` for a `hyper://` target.
- Added `catalog-source/pearbrowser-network.catalog.json` so the canonical catalogue source is versioned in the desktop GitHub repo.
- Regenerated `backend/catalogue-seed.js` from the versioned catalogue source so the offline seed and live catalogue agree.
- Added `/.landing-seed.mjs` to Pear's stage ignore list, changed production staging to use `pear stage --purge`, and added `scripts/verify-release-contents.js` so local/operator scratch files are removed from already-published append-only release drives and verified absent from a fresh peer.
- Rebuilt the generated schema-sheets bundle with `quickbit-native` and `simdle-native` kept external, preserving native-addon package context during Pear stage validation and reducing the bundle by about 1.6 MB.
- Added mobile `expo-linking@~55.0.15` after the iOS simulator launch exposed `[runtime not ready]: Error: Cannot find native module 'ExpoLinking'`.
- Added `npm run ios:generated:release` in the mobile repo to make the generated Expo iOS Release simulator build use the working Pods Hermes compiler path through an Xcode build setting.
- Added a non-destructive mobile Corestore recovery path in `bigdestiny2/PearBrowser@41a7fb6`: if root app storage belongs to another Corestore, the backend falls back to an identity-scoped `corestore-*` subdirectory instead of failing worklet boot.
- Fixed Android native first-launch Home behavior in the mobile repo: Home now retries bookmark RPCs across the Binder/worklet boot race, so a clean install no longer shows "Bookmarks are unavailable right now" before the backend reports ready.
- Added optional env-driven Android release signing to the native shell and R8 rules for unused React Native adapter classes inside `bare-kit.aar`; release APK/AAB builds and disposable-key signing verification now pass.
- Added mobile `scripts/release-preflight.js`, `npm run release:preflight`, and fixture tests so production mobile signing, bundle IDs, native bundles, BareKit artifacts, and store-distribution validation are a hard gate rather than prose-only release notes.
- Added mobile navigation-parser tests and Android native Browse source-contract coverage for proxy URL/port/token validation, bridge injection lifecycle, verified signed-catalog updates, and system share-sheet wiring.
- Replaced the desktop source-install dependency on a sibling HiveRelay checkout with vendored `p2p-hiverelay`, `p2p-hiverelay-client`, and `p2p-hiverelay-verifier` `0.20.0` package tarballs, plus a preinstall guard that verifies the tarballs and treats the sibling checkout as optional.
- Added a native release asset resolver so README/operator docs can point users to the recommended macOS, Windows, or Linux package plus its SHA-256 sidecar from the attached GitHub release assets.
- Added `release_mode` to the desktop native release workflow so package-proof runs can remain ad-hoc/unsigned, while public-trust/release/tag runs require macOS notarization, Windows signing credentials, and a published release asset set.
- Added an Intel macOS native release target and taught the asset checker to accept multiple architecture bundles per platform, with separate checksum indexes and manifests for each platform/architecture pair.
- Added a native download verifier that streams the recommended GitHub release packages and checks the downloaded bytes against the attached SHA-256 sidecars.
- Added a public-trust macOS DMG packager and release asset gate so public-trust macOS releases must attach DMGs, not only zipped app bundles.

## Catalogue And Launch

The Apps surface is coherent now:

- Featured apps include Keet, PearPass, anonGPT, Paste, and Peercord.
- The default live catalogue and the offline seed both contain 14 entries.
- The catalogue loader accepts Hyperdrive JSON, signed Hyperbee, Autobee, schema-sheets rooms, HiveRelay index rooms, community submissions, and writable personal catalogues.
- App rows distinguish launch behavior:
  - `standalone`: full Pear/file apps open in their own isolated window through `CMD_LAUNCH_PEAR_LINK`.
  - `hypersite`: pear-request/streamed apps use `CMD_RUN_APP_IN_TAB` and render headless in a Browse tab.
  - static Hyperdrive pages open directly in Browse.
- The browser prefetches known Pear bundle keys before standalone launch and surfaces download/peer progress, so a user can run the latest catalogue version without visiting a project page, downloading a package, or applying manual updates.

Peercord specifically:

- Catalogue link: `pear://wmir47w7mai3b1skj66mx7fzso6k6o91kipaney7gtt69npimouy`
- Decoded public key: `a2ea4d769d5e2b90caca4fbcb7f4b7b43caf43f2555b81201d3463ef89b55c26`
- Version: `1.0.8`
- Source: `https://git.churchofmalware.org/mastercodeon/Peercord`
- Latest source commit audited: `ea260a3bfba279769acfbfe0a436140c87a0fa15`
- Launch mode: `standalone`
- Reason: current upstream `pear.json` is `type: "desktop"` with `main: "index.js"`, and the main process constructs an Electron `BrowserWindow`; no pear-request worker bridge or `Pear.worker.pipe()` headless entry is published.

## Search

The search engine is well defended for a release:

- Local-first search returns first-paint results without waiting on federation.
- Queries are NFKC-normalized and capped at 512 chars.
- Limits are clamped to `0..100`.
- Federated search is opt-in and emits a correlated enriched event with `queryId`; stale federations are dropped.
- Personal index records are signed and verifiable by peers.
- Ranking is deterministic, resistant to NaN/negative-score poisoning, and avoids burying strong text matches.
- Fanout is digest-first where possible, bounded by per-query and live-session budgets.
- Completeness anchors detect forged, truncated, or forked peer indexes where the metadata exists.

Remaining improvement: external, multi-peer search performance should still be sampled with real trusted peers after launch traffic exists.

## Naming

The naming layer is ready as an experimental but usable local/social name system:

- URL-bar bare names and `pearname://` resolve through the same typed-name path.
- Local petnames win over registry and curated aliases.
- Registry names are owner-signed, monotonic, and protected against replay, release/reclaim mistakes, and homograph squatting.
- Federated contact claims are accepted only when the contact is verified and the claim owner matches the contact root.
- Provenance is preserved, so a petname, registry record, curated alias, and trusted-contact answer are not falsely equivalent.

Remaining improvement: the UI could make provenance more discoverable in the address bar without adding friction.

## Nostr Bridge

The Nostr bridge is scoped correctly for this release: trusted-contact Nostr, not a public relay client.

- Nostr keys are deterministically derived from the PearBrowser identity seed.
- Binding is dual-signed: the Pear root signs the Nostr key and the Nostr key signs the Pear root.
- Revocation and higher-epoch rebinding are covered.
- Events are verified, deduped, queryable, and partitioned by trust.
- Federated contact feeds only admit events authored by that contact's attested Nostr key.
- Revoked or forged bindings hide/quarantine contact events instead of showing them as trusted.

Remaining improvement: public relay client behavior, relay moderation policy, and large-feed UX are future work.

## Mobile/Native Parity

The mobile app logic is tested, and native simulator/device release smoke is partly cleared:

- TypeScript, backend syntax checks, bridge templates, and native source-contract tests pass.
- Mobile catalogue normalization preserves safe link-only rows and rejects targetless rows.
- iOS and Android bridge constants are mirrored for login, profile, connected apps, trusted origins, and `swarm.v1`.
- Mobile flows cover Home, Browse, Explore, Settings, My Sites, editor, QR scanner, identity backup/restore, and bridge runtime smoke tests.
- The mobile backend now isolates `CMD_NAVIGATE` parsing in `backend/navigation.js`; tests cover hex/z32 drive keys, path/query/hash preservation, proxy-port validation, and fail-closed API-token issuance.
- An installed iOS simulator build launched and exposed `[runtime not ready]: Error: Cannot find native module 'ExpoLinking'`.
- `expo-linking@~55.0.15` is now tracked in `package.json`/`package-lock.json`; `npm ls expo-linking` resolves `expo-linking@55.0.15`, and Expo autolinking resolves the `ExpoLinking` pod/module.
- A follow-up generated Expo iOS Debug simulator build now succeeds with signing disabled and DerivedData under `/private/tmp`; it includes the `ExpoLinking` pod, runs `[Expo] Configure project`, and copies/strips the BareKit xcframework stack. The generated Expo Release simulator path is also release-build-cleared when the build pins `HERMES_CLI_PATH` to `ios/Pods/hermes-engine/destroot/bin/hermesc` as an Xcode build setting. The earlier stalled path invoked `/Users/localllm/Desktop/PearBrowser/node_modules/hermes-compiler/hermesc/osx-bin/hermesc`; the Pods compiler successfully bytecodes the same 7.5 MB JS bundle, and the full generated Expo Release simulator build now succeeds.
- The tracked SwiftUI `ios-native` shell builds, installs, launches, and reaches green `Connected` on the iPhone 17 simulator. The smoke also verified stale-Corestore recovery: the first launch failed with `Another corestore is stored here`, then the fallback build recovered into an identity-scoped subdirectory and booted the worklet.
- Android native Gradle inspection, Kotlin/Java compile, and `:app:assembleDebug` pass with Eclipse Temurin 17; Homebrew OpenJDK 17.0.19 hung in AGP's JDK image transform on this machine. The fresh debug APK (`android-native/app/build/outputs/apk/debug/app-debug.apk`, 169 MB diagnostic build with bare-kit/addons and two ARM ABIs) installed and launched on a headless `pp_avd` emulator. The app reached a green `Connected` Home screen after extracting the bundled worklet and starting the local proxy.
- Android native `:app:assembleRelease` and `:app:bundleRelease` pass with R8/resource shrink after suppressing unused React Native adapter warnings from the local Bare Kit AAR. Env-driven release signing was verified with a disposable test keystore: `app-release.apk` is 142 MB and verifies with certificate `CN=PearBrowserTest, O=PearBrowser, C=US`; `app-release.aab` is 49 MB and passes `jarsigner -verify` with expected self-signed test-certificate warnings.
- `npm run release:preflight -- --soft` now reports 14 passing structural checks and 4 expected blockers: missing production Android signing env/keystore, blank Apple development team, missing TestFlight/App Store Connect validation marker, and missing Play/Firebase validation marker. Mobile Release Preflight run `https://github.com/bigdestiny2/PearBrowser/actions/runs/28316870344` reproduced this in CI and uploaded a verified `mobile-release-preflight` report. The command exits non-zero without `--soft`, making it suitable as the final mobile release gate.
- A local Kotlin compile was attempted with Homebrew OpenJDK 17 and `android/gradlew -p android-native --no-daemon -Dorg.gradle.workers.max=1 -Dkotlin.compiler.execution.strategy=in-process :app:compileDebugKotlin`; it produced no output for more than three minutes and was stopped. Treat Android native compile as still requiring the known-good Temurin/JDK setup before signing/distribution.

Required before native/mobile distribution: clear `npm run release:preflight` with real Apple/Android signing and store validation evidence, then broaden simulator/emulator smoke to real devices. Local Node tests do not prove platform WebView behavior under real OS permissions.

## Release Operations

The release script is in better shape after the recent verify-step fix:

- `scripts/release-prod.sh` stages, releases, pins, and verifies.
- On the publisher box, it avoids false failure from same-NAT/fresh-peer verification by confirming the durable seeder announced the new length and has live remote peers.
- Off the publisher box, `scripts/verify-pin.js --expect <length> --hiverelay` remains the stronger external round trip and captures relay proof evidence when upgraded relays expose storage-proof.
- `scripts/verify-live-catalog.js` fresh-loads the published Hyperbee catalogue and asserts expected app rows plus Peercord launch metadata from the network.
- `scripts/verify-app-full.js` is available for deeper fresh-peer blob sampling across a drive.
- `scripts/verify-release-contents.js` fresh-loads the production drive metadata and asserts ignored/operator paths are absent after purge staging.
- `scripts/runtime-rpc-smoke.mjs` checks a launched desktop runtime through the diagnostic RPC path and fails if the backend has not reached DHT/proxy/relay readiness.
- `scripts/check-appling-release.mjs` checks native wrapper metadata, lockfile-owned CMake tooling, pinned Bare headers, macOS ICNS/ad-hoc signing, and Windows unsigned-package fallback. `scripts/collect-appling-artifacts.mjs` normalizes `.app.zip`, `.msix`, and `.AppImage` outputs with SHA-256 sidecars and manifests.
- `scripts/check-hiverelay-layout.mjs` checks the vendored HiveRelay `0.20.0` tarballs used by standalone source installs and warns, rather than fails, when the optional sibling HiveRelay checkout is absent.
- `scripts/resolve-native-release-asset.mjs` selects the recommended native package and checksum sidecar for the current or requested platform/architecture from the GitHub release assets.
- The live DHT verifiers must run with real network access. In a restricted sandbox, peer discovery can time out even when the same checks pass outside the sandbox.

Required external smoke before a public announcement:

- Launch Peercord and one existing featured Pear app from the catalogue after explicitly approving Pear's trust prompt for Peercord. Automated launch is intentionally not treated as a safe substitute for this gate because it executes third-party code and creates a persistent trust decision for `pear://wmir47w7mai3b1skj66mx7fzso6k6o91kipaney7gtt69npimouy`.
- Clear remaining native mobile smoke before any app-store-style mobile announcement: production Apple/Android signing and store validation plus broader real-device testing.
- Use `docs/MANUAL_RELEASE_SMOKE_2026-06-23.md` as the final operator checklist; record device/machine, commit SHA, screenshots/logs, and pass/fail notes beside each checked item.

## Evidence

Commands run during this pass:

```sh
npm test
node --test --test-reporter=spec test/*.test.js
node --test test/catalog-manager-safety.test.js test/catalog-bee.test.js test/peercord-catalog.test.js test/resolve-name.test.js test/index-room-client.test.js
git diff --check
npm run check:release-evidence # expected non-zero until operator evidence log is filled; latest blank-log run reported 66 incomplete items
npm test # mobile/native
npm test # mobile/native latest CI/local rerun: 139/139
npm run release:preflight -- --soft # mobile/native, 14 pass / 4 expected production blockers
gh run download 28316870344 --repo bigdestiny2/PearBrowser --name mobile-release-preflight --dir /private/tmp/pearbrowser-mobile-preflight-artifact
node scripts/check-release-preflight-report.js /private/tmp/pearbrowser-mobile-preflight-artifact/mobile-release-preflight.json --allow-production-blockers
npm ls expo-linking # mobile/native, resolved expo-linking@55.0.15
npm run bundle-backend-native-ios # mobile/native tracked SwiftUI shell
npm run bundle-backend-native-android # mobile/native tracked Android shell
npm audit --audit-level=high
npm audit fix # mobile/native, non-force only
npm audit --audit-level=high # mobile/native after fix
npm run validate # publisher catalogue
node scripts/gen-catalogue-seed.mjs
node scripts/publish-catalog-bee.js catalog-source/pearbrowser-network.catalog.json --storage /Users/localllm/Projects/pear-ecosystem/03-sites/pearbrowser-publishers/catalog
npm run check:appling-release -- --tag v0.5.0 # desktop native packaging metadata, latest run passed
cd appling && npm ci && npm run generate && npm run build # desktop native local macOS build, latest run produced an ad-hoc signed PearBrowser.app
npm run package:appling -- --tag v0.5.0 # desktop native local macOS collection, produced PearBrowser-0.5.0-macos-arm64.app.zip
gh workflow run desktop-native-release.yml --repo bigdestiny2/pearbrowser-desktop --ref main -f tag=v0.5.0 -f source_ref=main -f release_mode=package-proof # desktop native release backfill, latest run 28321639492 succeeded after the macOS Intel release-target merge; use release_mode=public-trust for announcement-ready signed/notarized assets
npm run check:native-release-assets -- --tag v0.5.0 --repo bigdestiny2/pearbrowser-desktop --json # verified 20 attached native release assets: macOS arm64/x64 app.zips, Windows exe/msix, Linux AppImages, per-artifact sidecars, checksum indexes, and manifests
npm run check:native-release-assets -- --tag v0.5.0 --repo bigdestiny2/pearbrowser-desktop --require-published --require-public-trust # public-trust post-upload gate; requires published release plus macOS DMG assets for every macOS architecture
npm run verify:native-downloads -- --tag v0.5.0 --repo bigdestiny2/pearbrowser-desktop --all --json # downloaded and verified the four recommended packages: macOS arm64/x64 app.zips, Windows x64 exe, and Linux x64 AppImage
npm run resolve:native-release -- --tag v0.5.0 --repo bigdestiny2/pearbrowser-desktop --platform macos --arch arm64 # resolves PearBrowser-0.5.0-macos-arm64.app.zip and its SHA-256 sidecar for user-facing install guidance
npm run resolve:native-release -- --tag v0.5.0 --repo bigdestiny2/pearbrowser-desktop --platform macos --arch x64 # resolves PearBrowser-0.5.0-macos-x64.app.zip and its SHA-256 sidecar for Intel Mac install guidance
npm run check:native-signing -- --require-public-trust # desktop public-trust signing preflight; blocks until real macOS Developer ID/notary and Windows PFX credentials are configured
node scripts/check-hiverelay-layout.mjs # desktop source install guard; verifies vendored HiveRelay 0.20.0 tarballs, sibling checkout optional
npm ci --prefix /private/tmp/pear-standalone-source-install-29arBb # standalone source-install fixture with only package/lock/script/vendor tarballs; passed without ../../00-core/hiverelay
npm view p2p-hiverelay version && npm view p2p-hiverelay-client version && npm view p2p-hiverelay-verifier version # latest npm registry versions are 0.9.2, so vendored 0.20.0 tarballs are retained until compatible packages are published
node scripts/check-relays.js # latest rerun: 1 unique relay reachable, 8 live connections
node scripts/verify-pin.js --expect 18640 --hiverelay # latest rerun: length 18640, peers 1, /backend/anongpt-buyer.js sampled; storage-proof evidence is captured when upgraded relays expose it
node scripts/verify-release-contents.js --expect 18640 --missing /.landing-seed.mjs --missing /pearbrowser-storage --missing /docs --missing /scripts --missing /examples --missing /test # latest rerun: length 18640, entries 10233, forbidden paths absent
node scripts/verify-live-catalog.js --expect-app peercord --expect-app peerit --expect-app hiveworm # latest rerun: length 273, peers 1, 14 apps, Peercord type standalone/source GPL-3.0, peerit type hypersite
node scripts/runtime-rpc-smoke.mjs --timeout 20000 --json # after launching PearBrowser; latest backend-readiness rerun: ok, rpcPort 9876, proxyPort 18788, peerCount 7, hiveRelays 7, storagePercent 114 on the local profile
node scripts/runtime-rpc-smoke.mjs --timeout 20000 --max-storage-percent 100 --json # public demo/screenshot gate; latest local strict run failed only because storagePercent 113 exceeds 100
node scripts/release-rpc-story-smoke.mjs --timeout 60000 --request-timeout 80000 --local-stories --site-story --json # after launching PearBrowser; latest live run passed: homepage HTTP 200/90770 bytes, 2 catalogues, 14 apps, Keet/PearPass/anonGPT/Paste/Peercord present, Peercord standalone/window-only, local search first-paint, curated/petname naming, bookmark/session round-trip, temporary site publish/fetch/delete; no third-party app launched or trust approved
node scripts/verify-app-full.js --key 1868916a7a282ff0f211b11b536e9642828c32d3a817a254e1ef7e602709e25d --name pearbrowser-homepage --samples 12 --timeout 90 # latest rerun: peers 2, entries 3, sampled 3, missing 0
node scripts/verify-app-full.js --key a2ea4d769d5e2b90caca4fbcb7f4b7b43caf43f2555b81201d3463ef89b55c26 --name peercord --samples 12 --timeout 90 # current gate deferred: peers 1, meta length 0, entries 0 after failed empty-checkout repin/cleanup attempt; needs Peercord publisher/operator reseed, complete publisher storage, or relay cleanup plus complete canonical seed
node scripts/verify-app-full.js --key 82110be69e2a531e840bc886dc7b9cab16729c587815295f55035109b45e4ddb --name keet --samples 12 --timeout 90 # latest rerun: peers 9, entries 7449, sampled 12, missing 0
node scripts/verify-pear-bundle-contract.js --key a2ea4d769d5e2b90caca4fbcb7f4b7b43caf43f2555b81201d3463ef89b55c26 --name peercord-linux --app-root by-arch/linux-x64/app/peercord/resources/app --expect-type desktop --expect-main index.js --contains index.js:BrowserWindow --absent index.js:Pear.worker.pipe # current gate deferred: missing pear.json/index.js while drive resolves empty
node scripts/verify-pear-bundle-contract.js --key a2ea4d769d5e2b90caca4fbcb7f4b7b43caf43f2555b81201d3463ef89b55c26 --name peercord-windows --app-root by-arch/win32-x64/app/peercord/resources/app --expect-type desktop --expect-main index.js --contains index.js:BrowserWindow --absent index.js:Pear.worker.pipe # current gate deferred: missing pear.json/index.js while drive resolves empty
xcodebuild -workspace ios/PearBrowser.xcworkspace -list # mobile/native, succeeded
xcrun simctl list devices available # mobile/native, selected booted iPhone 17, OS 26.4.1
./gradlew :app:tasks --all # mobile/native, failed: no Java Runtime
xcodebuild -workspace ios/PearBrowser.xcworkspace -scheme PearBrowser -configuration Debug -destination 'id=13BEE7B5-1283-4DE4-BE38-8B70356E4A5B' -derivedDataPath ios/build/DerivedData CODE_SIGNING_ALLOWED=NO build # mobile/native, failed at final framework embed script after generated Expo path fixes
xcrun simctl install 13BEE7B5-1283-4DE4-BE38-8B70356E4A5B ios/build/DerivedData/Build/Products/Debug-iphonesimulator/PearBrowser.app # mobile/native, succeeded with prior build
xcrun simctl launch 13BEE7B5-1283-4DE4-BE38-8B70356E4A5B com.pearbrowser.app # mobile/native, exposed missing ExpoLinking runtime module
xcodebuild -workspace ios/PearBrowser.xcworkspace -scheme PearBrowser -configuration Debug -destination 'id=13BEE7B5-1283-4DE4-BE38-8B70356E4A5B' -derivedDataPath ios/build/DerivedData CODE_SIGNING_ALLOWED=NO COCOAPODS_PARALLEL_CODE_SIGN=false COMPILER_INDEX_STORE_ENABLE=NO build # mobile/native after expo-linking, blocked by generated shell-script phase hang in this environment
xcodebuild -workspace ios/PearBrowser.xcworkspace -scheme PearBrowser -configuration Debug -sdk iphonesimulator -destination id=13BEE7B5-1283-4DE4-BE38-8B70356E4A5B -derivedDataPath /private/tmp/pearbrowser-generated-ios-dd CODE_SIGNING_ALLOWED=NO COMPILER_INDEX_STORE_ENABLE=NO RCT_NO_LAUNCH_PACKAGER=1 SKIP_BUNDLING=1 build # generated Expo iOS Debug, succeeded; no JS bundle by design
xcodebuild -workspace ios/PearBrowser.xcworkspace -scheme PearBrowser -configuration Release -sdk iphonesimulator -destination id=13BEE7B5-1283-4DE4-BE38-8B70356E4A5B -derivedDataPath /private/tmp/pearbrowser-generated-ios-release-dd CODE_SIGNING_ALLOWED=NO COMPILER_INDEX_STORE_ENABLE=NO RCT_NO_LAUNCH_PACKAGER=1 build # generated Expo iOS Release, interrupted after Hermes bytecode compilation stalled
node_modules/hermes-compiler/hermesc/osx-bin/hermesc -emit-binary -max-diagnostic-width=80 -Og -out /private/tmp/pearbrowser-test-Og.hbc /tmp/pearbrowser-generated-ios-release-dd/Build/Products/Release-iphonesimulator/main.jsbundle # direct repro: stalled for >60s and was interrupted
ios/Pods/hermes-engine/destroot/bin/hermesc -emit-binary -max-diagnostic-width=80 -O -out /private/tmp/pearbrowser-pods-hermes-O.hbc /private/tmp/pearbrowser-generated-ios-release-dd/Build/Products/Release-iphonesimulator/main.jsbundle # generated Expo iOS Release bundle, Pods compiler succeeded
npm run ios:generated:release # generated Expo iOS Release simulator build, succeeded with HERMES_CLI_PATH as an Xcode build setting
xcodebuild -project ios-native/PearBrowser.xcodeproj -scheme PearBrowser -configuration Debug -destination 'id=13BEE7B5-1283-4DE4-BE38-8B70356E4A5B' -derivedDataPath ios-native/build/DerivedData CODE_SIGNING_ALLOWED=NO COMPILER_INDEX_STORE_ENABLE=NO build # tracked SwiftUI iOS shell, succeeded
xcrun simctl install 13BEE7B5-1283-4DE4-BE38-8B70356E4A5B ios-native/build/DerivedData/Build/Products/Debug-iphonesimulator/PearBrowser.app # tracked SwiftUI iOS shell, succeeded
xcrun simctl launch 13BEE7B5-1283-4DE4-BE38-8B70356E4A5B com.pearbrowser.app # tracked SwiftUI iOS shell, reached green Connected after Corestore fallback
JAVA_HOME=/opt/homebrew/Cellar/openjdk@17/17.0.19/libexec/openjdk.jdk/Contents/Home PATH=/opt/homebrew/Cellar/openjdk@17/17.0.19/bin:$PATH android/gradlew -p android-native :app:tasks --all # Android native, succeeded
JAVA_HOME=/opt/homebrew/Cellar/openjdk@17/17.0.19/libexec/openjdk.jdk/Contents/Home PATH=/opt/homebrew/Cellar/openjdk@17/17.0.19/bin:$PATH android/gradlew -p android-native --no-daemon -Dkotlin.compiler.execution.strategy=in-process :app:compileDebugKotlin # Android native, succeeded
JAVA_HOME=/opt/homebrew/Cellar/openjdk@17/17.0.19/libexec/openjdk.jdk/Contents/Home PATH=/opt/homebrew/Cellar/openjdk@17/17.0.19/bin:$PATH android/gradlew -p android-native --no-daemon -Dkotlin.compiler.execution.strategy=in-process :app:assembleDebug # Android native, Homebrew OpenJDK hung in jmod/JDK image transform
JAVA_HOME=/path/to/temurin-17/Contents/Home PATH=/path/to/temurin-17/Contents/Home/bin:$PATH android/gradlew -p android-native --no-daemon -Dorg.gradle.workers.max=1 -Dkotlin.compiler.execution.strategy=in-process :app:compileDebugJavaWithJavac # Android native with Temurin 17, succeeded
JAVA_HOME=/path/to/temurin-17/Contents/Home PATH=/path/to/temurin-17/Contents/Home/bin:$PATH android/gradlew -p android-native --no-daemon -Dorg.gradle.workers.max=1 -Dkotlin.compiler.execution.strategy=in-process :app:assembleDebug # Android native with Temurin 17, succeeded; fresh debug APK installed/launched on pp_avd and reached green Connected
JAVA_HOME=/path/to/temurin-17/Contents/Home PATH=/path/to/temurin-17/Contents/Home/bin:$PATH android/gradlew -p android-native --no-daemon -Dorg.gradle.workers.max=1 -Dkotlin.compiler.execution.strategy=in-process :app:assembleRelease :app:bundleRelease # Android native unsigned release, succeeded after R8 rules
PEARBROWSER_ANDROID_KEYSTORE=/private/tmp/pearbrowser-test-upload.jks PEARBROWSER_ANDROID_STORE_PASSWORD=changeit PEARBROWSER_ANDROID_KEY_ALIAS=pearbrowser PEARBROWSER_ANDROID_KEY_PASSWORD=changeit JAVA_HOME=/path/to/temurin-17/Contents/Home PATH=/path/to/temurin-17/Contents/Home/bin:$PATH android/gradlew -p android-native --no-daemon -Dorg.gradle.workers.max=1 -Dkotlin.compiler.execution.strategy=in-process :app:assembleRelease :app:bundleRelease # Android native disposable-key signed release, succeeded
apksigner verify --print-certs android-native/app/build/outputs/apk/release/app-release.apk # Android native signed APK, verified CN=PearBrowserTest
jarsigner -verify android-native/app/build/outputs/bundle/release/app-release.aab # Android native signed AAB, verified with expected self-signed test-certificate warnings
```

Key live values:

- Production browser link: `pear://tco5k7h38uoxatedp1wongdbhjxow1x7jiwm3t1i9cujbebhsbty`
- Browser homepage drive: `hyper://1868916a7a282ff0f211b11b536e9642828c32d3a817a254e1ef7e602709e25d/`
- PearBrowser Network catalogue: `hyperbee://f5fb7500bccd60a976d2b1d24246108f4444a210b9ca591533114dffc089934d`
- Peercord: `pear://wmir47w7mai3b1skj66mx7fzso6k6o91kipaney7gtt69npimouy`

## Residual Risks

- Live GUI process health was proven for PearBrowser itself, and Keet bundle availability was proven without executing it. Peercord's catalogue row remains correct, but current Peercord bundle availability is deferred until the full-content drive is reachable again. A real Peercord window launch still requires explicit human approval of Pear's trust prompt for that third-party key; automation should not bypass that persistent trust decision.
- Desktop native release assets are packaging-complete but not public-trust-complete: macOS is ad-hoc signed and not notarized, and Windows artifacts are unsigned unless production certificate secrets are configured. Expect OS trust warnings until Developer ID notarization and Windows code signing are wired with real credentials.
- Network replication can vary by relay health and NAT conditions. This pass saw reachable relays, a reachable production drive, and a reachable live catalogue, but a second-network spot check remains useful before a high-visibility announcement.
- Peercord cannot honestly be marketed as headless-in-tab until upstream ships a compatible pear-request worker. The historical live bundle contract and latest source audit confirm the packaged app is desktop/window-class, but the current full-bundle availability gate is deferred until the Peercord drive is reseeded by the publisher/operator or restored from complete publisher storage.
- Public Nostr relay behavior is not part of this release; the shipped feature is the trusted-contact bridge.
- Native mobile is not app-store-release-cleared yet. The JS/test surface is green, the missing `ExpoLinking` dependency is fixed, generated Expo iOS Debug and Release simulator builds pass, the tracked SwiftUI iOS shell reaches `Connected`, Android native debug APK assembly plus emulator launch previously passed, Android release APK/AAB plus disposable-key signing verification previously passed, and `npm run release:preflight -- --soft` now makes the remaining production gates explicit. The latest Android Kotlin compile attempt hung in the local Homebrew JDK environment, so rerun native compile/build with the known-good Temurin setup before distribution. Remaining gates are production Apple/Android signing, TestFlight/App Store Connect or Play/Firebase validation, and broader real-device validation.
- Mobile still reports 15 moderate `npm audit` advisories in Expo/React Native test/tooling transitive dependencies. npm's available fix requires breaking major-version changes, so these should move to the next mobile platform-upgrade lane rather than this release-day hardening pass.
