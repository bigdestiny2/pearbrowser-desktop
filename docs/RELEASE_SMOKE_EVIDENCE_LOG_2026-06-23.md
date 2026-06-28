# Release Smoke Evidence Log - 2026-06-23

Purpose: operator-filled proof log for the final PearBrowser community release
smoke. This file pairs with `docs/MANUAL_RELEASE_SMOKE_2026-06-23.md`.

Do not mark the release ready unless every required row is `PASS`, or the row is
explicitly `DEFER` with a documented scope decision. A screenshot/log path,
terminal excerpt, CI URL, or store validation URL should be recorded for every
manual gate.

## Run Metadata

| Field | Value |
| --- | --- |
| Operator | Codex local release audit |
| Date/time started | 2026-06-23T16:36:00Z |
| Desktop repo/branch/head | `bigdestiny2/pearbrowser-desktop`, `main`, `bd5caa4e9bd16dfa870a42593dd97ca2552aed08` |
| Desktop PR/CI URL | PR #23: `https://github.com/bigdestiny2/pearbrowser-desktop/pull/23`; Desktop CI run `https://github.com/bigdestiny2/pearbrowser-desktop/actions/runs/28319109847`, job `83897696771`, passed |
| Mobile repo/head | `bigdestiny2/PearBrowser`, `main`, `9101200d8bb54ff31b21d6d90154cb2321756a6c` |
| Mobile preflight CI URL | `https://github.com/bigdestiny2/PearBrowser/actions/runs/28316870344` (`mobile-release-preflight` artifact downloaded and verified locally) |
| macOS machine | `Locals-Mac-Studio.local`, macOS 26.4.1 build 25E253 |
| iOS simulator/device(s) | Prior simulator proof in `PearBrowser/ios-native/BUILD.md`: iPhone 17 simulator green `Connected`; not rerun in this loop |
| Android emulator/device(s) | Prior emulator proof in `PearBrowser/android-native/BUILD.md`: headless `pp_avd` green `Connected`; not rerun in this loop |
| Network/location | Local shell in Asia/Dubai timezone; 2026-06-24 Pear hotfix release ran with real network access |
| Notes directory | `pearbrowser-desktop/docs`; `PearBrowser/docs` |

## Desktop Automated Baseline

| Gate | Expected | Result | Evidence |
| --- | --- | --- | --- |
| `npm test` | 448/448 pass | PASS | 2026-06-28 local rerun after the vendored HiveRelay source-install update: `node --test 'test/*.test.js'`, pass `448/448`; one earlier full-suite run showed the existing `nostr-index-room` verify-and-drop test flake, and the isolated test plus full rerun passed |
| `git diff --check` | clean | PASS | 2026-06-28 local run on `feat/vendor-hiverelay-source-install` exited 0 after the vendored HiveRelay source-install docs refresh |
| `npm audit --audit-level=high` | 0 high vulnerabilities | PASS | 2026-06-28 local run after the vendored HiveRelay lockfile update: `found 0 vulnerabilities` |
| Desktop CI | install/test/audit success | PASS | 2026-06-28 GitHub Actions run `https://github.com/bigdestiny2/pearbrowser-desktop/actions/runs/28319109847`, PR #23 job `83897696771`, passed checkout, HiveRelay layout guard, install, test, and high-severity audit |
| Standalone source install | `npm ci` succeeds without sibling HiveRelay checkout | PASS | 2026-06-28 local fixture `/private/tmp/pear-standalone-source-install-29arBb` contained only `package.json`, `package-lock.json`, `scripts/check-hiverelay-layout.mjs`, and `vendor/hiverelay/*.tgz`; `npm ci --prefix /private/tmp/pear-standalone-source-install-29arBb` installed 353 packages, audited 354, warned only that the optional local HiveRelay checkout was missing, and found 0 vulnerabilities |
| `npm run check:appling-release -- --tag v0.5.0` | native wrapper metadata, lockfile, signing defaults, assets in sync | PASS | 2026-06-28 local run: `Appling release metadata ok: PearBrowser 0.5.0 -> pear://tco5k7h38uoxatedp1wongdbhjxow1x7jiwm3t1i9cujbebhsbty` |
| macOS native appling package | ad-hoc signed `.app.zip`, checksum, manifest produced locally | PASS | 2026-06-28 local run: `npm ci --prefix appling`, `npm run --prefix appling generate`, `npm run --prefix appling build`, `node scripts/collect-appling-artifacts.mjs --tag v0.5.0 --platform darwin --arch arm64`; produced `PearBrowser-0.5.0-macos-arm64.app.zip`, SHA-256 `5dcb5045f00b01f8dfb9f15fc4d505a53e04227ae9c35277e939e1aad67f7af6`; extracted app passed `codesign --verify --deep --strict` |
| GitHub native release asset backfill | workflow visible on default branch; macOS, Windows, Linux assets attached to `v0.5.0` with sidecars/manifests | PASS | 2026-06-28 GitHub Actions run `https://github.com/bigdestiny2/pearbrowser-desktop/actions/runs/28317333414` succeeded from `main` with `tag=v0.5.0` and `source_ref=main` after the native signing credential preflight merge; macOS, Windows, and Linux all passed `Validate release signing configuration`, build, collection, and artifact upload; attach job verified the release asset bundle and refreshed 16 `v0.5.0` assets at about `2026-06-28T09:21Z`; 2026-06-28 `npm run check:native-release-assets -- --tag v0.5.0 --repo bigdestiny2/pearbrowser-desktop --json` verified the live GitHub release is not draft/prerelease and has 16 assets, zero warnings, zero errors, macOS arm64 `.app.zip`, Windows x64 `.exe`/`.msix`, Linux x64 `.AppImage` assets, per-artifact `.sha256` sidecars, `SHA256SUMS-*`, and `manifest-*` files |
| `node scripts/check-relays.js` | real-DHT relay reachable | PASS | 2026-06-28 real-network rerun: `1` unique HiveRelay reachable via DHT and `8` live connections in `client.relays` |
| `node scripts/verify-pin.js --expect 18640 --hiverelay` | length >= 18640, sampled blob present, HiveRelay proof captured when available | PASS | 2026-06-24 release-prod fresh-peer run: length `18640`, peers `1`, sampled `/backend/anongpt-buyer.js` `11652` bytes; HiveRelay storage-proof route not yet enabled on fleet |
| `node scripts/verify-release-contents.js ...` | forbidden paths absent | PASS | 2026-06-24 fresh-peer scan: length `18640`, `10233` entries, forbidden paths absent |
| `node scripts/verify-live-catalog.js --expect-app peercord --expect-app peerit --expect-app hiveworm` | signed catalogue, 14 apps, expected rows | PASS | 2026-06-28 real-network rerun: length `273`, peers `2`, 14 apps, Peercord `standalone`, source URL, `GPL-3.0`, expected apps present |
| `node scripts/verify-app-full.js` homepage | sampled blobs present | PASS | 2026-06-28 fresh-peer rerun: peers `2`, meta length `9`, entries `3`, sampled `3/3`, missing `0`, bytes `155917` |
| `node scripts/verify-app-full.js` Peercord | sampled blobs present, no execution | DEFER | 2026-06-23 real-network proof in `docs/RELEASE_READINESS_2026-06-23.md` passed with peers `1`, entries `14730`, sampled `12/12`, missing `0`; 2026-06-28 fresh-peer rerun timed out twice with `0` peers; a read-only HiveRelay repin attempt opened version `1` with `0` files and received `7` relay acceptances, then matching unseed cleanup was broadcast to `7` relays; post-cleanup verification still saw peers `1`, meta length `0`, entries `0`; upstream source audit found reachable commit `ea260a3bfba279769acfbfe0a436140c87a0fa15`, but staging/seeding the canonical key requires Peercord publisher authority, so this needs upstream/operator reseed before current PASS evidence; see `docs/PEERCORD_BUNDLE_REPAIR_2026-06-28.md` |
| `node scripts/verify-app-full.js` Keet | sampled blobs present, no execution | PASS | 2026-06-28 fresh-peer rerun: peers `9`, meta length `54244`, entries `7449`, sampled `12/12`, missing `0`, bytes `179225` |
| Peercord Linux bundle contract | `type:"desktop"`, `BrowserWindow`, no `Pear.worker.pipe` | DEFER | 2026-06-23 real-network proof in `docs/RELEASE_READINESS_2026-06-23.md` passed for `by-arch/linux-x64/app/peercord/resources/app`; 2026-06-28 fresh-peer contract rerun timed out with `0` peers before the repair attempt, then post-repin verification saw peers `1` but meta length `0` and missing `pear.json`/`index.js`; upstream source commit `ea260a3bfba279769acfbfe0a436140c87a0fa15` still declares desktop `pear.json`, Electron `BrowserWindow`, and no `Pear.worker.pipe`, but this proof remains historical until the full Peercord bundle drive is reachable again |
| Peercord Windows bundle contract | `type:"desktop"`, `BrowserWindow`, no `Pear.worker.pipe` | DEFER | 2026-06-23 real-network proof in `docs/RELEASE_READINESS_2026-06-23.md` passed for `by-arch/win32-x64/app/peercord/resources/app`; 2026-06-28 fresh-peer contract rerun timed out with `0` peers before the repair attempt, then post-repin verification saw peers `1` but meta length `0` and missing `pear.json`/`index.js`; upstream source commit `ea260a3bfba279769acfbfe0a436140c87a0fa15` still declares desktop `pear.json`, Electron `BrowserWindow`, and no `Pear.worker.pipe`, but this proof remains historical until the full Peercord bundle drive is reachable again |

## Desktop GUI And User Stories

| Gate | Expected | Result | Evidence |
| --- | --- | --- | --- |
| Production browser launch | stable `pear://tco5k7...` opens and backend connects | PASS | 2026-06-28 local `pear run pear://tco5k7h38uoxatedp1wongdbhjxow1x7jiwm3t1i9cujbebhsbty` launched PearBrowser, emitted `Sending READY event`, connected the renderer, opened RPC `:9876`, started HTTP proxy `18788`, and connected HiveRelay peers; no Peercord or other third-party app was launched |
| Runtime RPC smoke | `/status-smoke` reports DHT/proxy/relay readiness | PASS | 2026-06-28 local run while production PearBrowser was launched: `node scripts/runtime-rpc-smoke.mjs --timeout 20000 --json` returned `ok:true`, `port:9876`, `dhtConnected:true`, `peerCount:7`, `proxyPort:18788`, `hiveRelays:7`, `storagePercent:114`; the strict public demo gate `node scripts/runtime-rpc-smoke.mjs --timeout 20000 --max-storage-percent 100 --json` correctly failed this over-quota local profile with `storagePercent:113` and `storagePercent exceeds 100`, proving clean-profile demo runs now fail closed |
| Release RPC story smoke | nonvisual homepage/catalogue/local-story/site-publish preflight, no third-party app launch | PASS | 2026-06-28 local run while production PearBrowser was launched: `node scripts/release-rpc-story-smoke.mjs --timeout 60000 --request-timeout 80000 --local-stories --site-story --json` returned `ok:true`, RPC `9876`, proxy `18788`, peerCount `7`, HiveRelays `7`, storage `115%`, homepage HTTP `200`, `90770` bytes, title `PearBrowser — the desktop for the peer-to-peer web`, catalogues `2`, apps `14`, featured rows Keet, PearPass, anonGPT, Paste, Peercord, Peercord `standalone`/window-only with GPL-3.0 source metadata, local search doc `e6736e752c935f0c` at `phase:"first-paint"` with `federating:false`, curated `peerit` naming plus temporary petname provenance, bookmark/session round-trips, and temporary site publish/fetch/delete evidence; no `CMD_LAUNCH_PEAR_LINK`, `CMD_RUN_APP_IN_TAB`, or trust approval was invoked |
| Browse story | homepage `hyper://186891...` renders, reloads, site info correct |  |  |
| Fresh-launch landing story | PearBrowser landing front tab, `peerit` second tab |  |  |
| Catalogue story | Apps auto-loads, featured cards visible, search works |  |  |
| Latest-app-without-download story | app launches from catalogue row without project page/download/manual update |  |  |
| Existing featured app regression | Keet or equivalent standalone app still opens |  |  |
| Search story | local results immediate, no stale federation overwrite | PASS | 2026-06-28 release RPC local-story smoke indexed unique token `releaseprobemqxnpr8a5dd648`, then `CMD_SEARCH` returned doc `8fe6dffaa7ca2f97` as `phase:"first-paint"` with `federating:false`; focused search contract coverage includes stale federation suppression in `test/cmd-search-contract.test.js` |
| Naming story | curated alias and/or petname resolves with provenance | PASS | 2026-06-28 release RPC local-story smoke temporarily enabled naming, resolved curated `peerit` to `hyper://ec6e2d6d9d22b9d6b40e11a9ca3042be3197e4bdca9e9a7f079be6ee830761b4/`, created temporary petname `smokepr8a5dd648` to the PearBrowser homepage, verified `petname` provenance, removed it, and restored the naming flag |
| Nostr trusted-contact story | only attested contact events render as trusted |  |  |
| Site publishing story | test site publishes, reloads from copied `hyper://` link | PASS | 2026-06-28 release RPC site-story smoke created temporary site `44e2cf9d3aaddc21`, published `hyper://44e2cf9d3aaddc219debf702364c68b946fafd763d0bc57d8994876bf9f85711`, navigated/fetched it through `http://127.0.0.1:18788/hyper/44e2cf9d3aaddc219debf702364c68b946fafd763d0bc57d8994876bf9f85711/`, received HTTP `200` with `8978` bytes and token `releaseprobemqxo25q1fcf2af`, then deleted the site and got HiveRelay unseed cleanup from `8` relays; pin accepted `3` relays but durability timed out, so this proves publish/reload/cleanup, not durable relay replication |
| Library/session story | bookmark/tab/session survives relaunch |  |  |

## Peercord Trust Gate

This gate executes third-party code and can create a persistent Pear trust
decision. Do not automate approval.

| Gate | Expected | Result | Evidence |
| --- | --- | --- | --- |
| Trust prompt reviewed | operator reads Pear prompt for `pear://wmir47w7...` |  |  |
| Trust prompt approved intentionally | approval is a human action, not a script |  |  |
| Standalone window launch | Peercord opens in its own window |  |  |
| Launch-mode check | Peercord does not expose `Run in tab` |  |  |

## Mobile Automated Baseline

| Gate | Expected | Result | Evidence |
| --- | --- | --- | --- |
| `npm test` | 139/139 pass | PASS | 2026-06-28 Mobile Release Preflight run `https://github.com/bigdestiny2/PearBrowser/actions/runs/28316870344` passed `npm test`; local PR validation for the workflow also passed `139/139` |
| `git diff --check` | clean | PASS | 2026-06-23 local run in `PearBrowser` exited 0 |
| `npm audit --audit-level=high` | exit 0 | PASS | 2026-06-28 Mobile Release Preflight run `https://github.com/bigdestiny2/PearBrowser/actions/runs/28316870344` passed the high-severity audit; full audit still reports 15 moderate Expo/React Native toolchain advisories |
| `npm run release:preflight -- --soft --json` | 14 pass / 0 warn / 4 expected production blockers before credentials | PASS | 2026-06-28 Mobile Release Preflight run `https://github.com/bigdestiny2/PearBrowser/actions/runs/28316870344` uploaded `mobile-release-preflight`; downloaded report verified with `scripts/check-release-preflight-report.js --allow-production-blockers`: 14 pass, 0 warn, 4 expected blockers, 0 unexpected blockers/warnings |
| Generated Expo iOS Debug simulator build | succeeds | PASS | Recorded in `docs/RELEASE_READINESS_2026-06-23.md`; generated Expo iOS Debug simulator build passes with `ExpoLinking` autolinked |
| Generated Expo iOS Release simulator build | succeeds with Pods Hermes compiler path | PASS | Recorded in `docs/RELEASE_READINESS_2026-06-23.md`; Release simulator build passes with Pods `hermesc` path |
| Tracked SwiftUI iOS shell | build/install/launch reaches green Connected | PASS | `PearBrowser/ios-native/BUILD.md` latest smoke: build/install/launch on iPhone 17 simulator reached green `Connected` |
| Android debug build/emulator launch | build/install/launch reaches green Connected with known-good JDK | PASS | `PearBrowser/android-native/BUILD.md` latest smoke: Temurin 17 debug APK installed on `pp_avd`, green `Connected` |
| Android release APK/AAB disposable signing | build/verifies with test key | PASS | `PearBrowser/android-native/BUILD.md` release signing section: APK `apksigner` and AAB `jarsigner` verified with disposable test key |

## Mobile Manual And Distribution Gates

| Gate | Expected | Result | Evidence |
| --- | --- | --- | --- |
| iOS real-device smoke | Home Connected, Browse loads `hyper://`, backup/restore behaves |  |  |
| Android real-device smoke | Home Connected, Browse loads `hyper://`, no first-launch bookmark banner |  |  |
| Android share story | `window.pear.share(url)` opens system share sheet |  |  |
| Mobile catalogue story | safe rows preserved, unsafe/targetless rows dropped |  |  |
| Mobile direct P2P API story | consent, join, send/receive, leave behave |  |  |
| Android production signing | real keystore env configured, signed APK/AAB built |  |  |
| Android store validation | Play Console or Firebase validation marker recorded |  |  |
| iOS production signing | real Apple development team/archive configured |  |  |
| iOS store validation | App Store Connect or TestFlight validation marker recorded |  |  |
| Strict mobile preflight | `npm run release:preflight` passes without `--soft` |  |  |

## Announcement Decision

| Question | Answer |
| --- | --- |
| Are all required desktop automated gates `PASS`? |  |
| Are all required desktop GUI/user-story gates `PASS`? |  |
| Was Peercord trust approved manually and did the standalone window open? |  |
| Are all required mobile automated gates `PASS`? |  |
| Are production mobile signing/store gates `PASS`, or explicitly out of announcement scope? |  |
| Are residual risks documented in release notes? |  |
| Final decision (`GO`, `NO-GO`, or `GO desktop only`) |  |
