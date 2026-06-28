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
| Desktop repo/branch/head | `bigdestiny2/pearbrowser-desktop`, `feat/p2p-infra-naming`, branch head containing this evidence log |
| Desktop PR/CI URL | PR #5 merged: `https://github.com/bigdestiny2/pearbrowser-desktop/pull/5`; head `a52b3f0`, merge commit `36bafe0`; latest production release length `33841` |
| Mobile repo/head | `bigdestiny2/PearBrowser`, `main`, `01eb8c7fbfada50672ddbb3ec79aec25621229bb` |
| macOS machine | `Locals-Mac-Studio.local`, macOS 26.4.1 build 25E253 |
| iOS simulator/device(s) | Prior simulator proof in `PearBrowser/ios-native/BUILD.md`: iPhone 17 simulator green `Connected`; not rerun in this loop |
| Android emulator/device(s) | Prior emulator proof in `PearBrowser/android-native/BUILD.md`: headless `pp_avd` green `Connected`; not rerun in this loop |
| Network/location | Local shell in Asia/Dubai timezone; 2026-06-24 Pear hotfix release ran with real network access |
| Notes directory | `pearbrowser-desktop/docs`; `PearBrowser/docs` |

## Desktop Automated Baseline

| Gate | Expected | Result | Evidence |
| --- | --- | --- | --- |
| `npm test` | 455/455 pass | PASS | 2026-06-24 local run: `node --test 'test/*.test.js'`, pass `455/455` |
| `git diff --check` | clean | PASS | 2026-06-24 local run exited 0 before evidence-log edits |
| `npm audit --audit-level=high` | 0 high vulnerabilities | PASS | 2026-06-24 local run: `found 0 vulnerabilities` |
| Desktop CI | install/test/audit success | PASS | PR #5 merged with Desktop CI evidence for install/test/audit; `.github/workflows/desktop-ci.yml` now emits `npm run evidence:desktop:ci` after successful `npm ci`, `npm test`, and `npm audit --audit-level=high`; CI URL recorded in Run Metadata |
| `npm run check:appling-release -- --tag v0.5.0` | native wrapper metadata, lockfile, signing defaults, assets in sync | PASS | 2026-06-28 local run: `Appling release metadata ok: PearBrowser 0.5.0 -> pear://tco5k7h38uoxatedp1wongdbhjxow1x7jiwm3t1i9cujbebhsbty` |
| macOS native appling package | ad-hoc signed `.app.zip`, checksum, manifest produced locally | PASS | 2026-06-28 local run: `npm ci --prefix appling`, `npm run --prefix appling generate`, `npm run --prefix appling build`, `node scripts/collect-appling-artifacts.mjs --tag v0.5.0 --platform darwin --arch arm64`; produced `PearBrowser-0.5.0-macos-arm64.app.zip`, SHA-256 `5dcb5045f00b01f8dfb9f15fc4d505a53e04227ae9c35277e939e1aad67f7af6`; extracted app passed `codesign --verify --deep --strict` |
| GitHub native release asset backfill | workflow visible on default branch; macOS, Windows, Linux assets attached to `v0.5.0` with sidecars/manifests |  |  |
| `node scripts/browser-state-sync-smoke.js` | encrypted sync convergence, key gate, restart determinism |  |  |
| `node scripts/check-relays.js` | real-DHT relay reachable | PASS | 2026-06-24 real-DHT run: 1 unique relay reachable, 8 live connections; release collector runs `node scripts/check-relays.js --require-relay --json` so zero relays fails |
| `node scripts/verify-pin.js --expect 33841 --hiverelay` | length >= 33841, sampled blob present, HiveRelay proof captured when available | PASS | 2026-06-24 release-prod fresh-peer run: length `33841`, peers `3`, sampled `/backend/anongpt-buyer.js` `11652` bytes; HiveRelay storage-proof route not yet enabled on fleet |
| `node scripts/verify-release-contents.js --expect 33841 --missing /.landing-seed.mjs --missing /pearbrowser-storage --missing /docs --missing /scripts --missing /examples --missing /test` | forbidden paths absent | PASS | 2026-06-24 fresh-peer scan: length `33841`, 10250 entries, forbidden paths absent |
| `node scripts/verify-live-catalog.js --expect-app peercord --expect-app peerit --expect-app hiveworm` | signed catalogue, 14 apps, expected rows | PASS | 2026-06-24 real-network run: length `273`, peers `1`, 14 apps, Peercord `standalone`, source URL, `GPL-3.0` |
| `node scripts/verify-app-full.js homepage` | sampled blobs present | PASS | 2026-06-24 named-target fresh-peer run: peers `1`, entries `2`, sampled `2/2`, missing `0` |
| `node scripts/verify-app-full.js peercord` | sampled blobs present, no execution | PASS | 2026-06-24 named-target fresh-peer run without execution: peers `1`, entries `14730`, sampled `12/12`, missing `0` |
| `node scripts/verify-app-full.js keet` | sampled blobs present, no execution | PASS | 2026-06-24 named-target fresh-peer run without execution: peers `9`, entries `7449`, sampled `12/12`, missing `0` |
| Peercord Linux bundle contract | `type:"desktop"`, `BrowserWindow`, no `Pear.worker.pipe` | PASS | 2026-06-24 `node scripts/verify-pear-bundle-contract.js peercord-linux`: `pear.json` type `desktop`, main `index.js`, `BrowserWindow` present, `Pear.worker.pipe` absent |
| Peercord Windows bundle contract | `type:"desktop"`, `BrowserWindow`, no `Pear.worker.pipe` | PASS | 2026-06-24 `node scripts/verify-pear-bundle-contract.js peercord-windows`: `pear.json` type `desktop`, main `index.js`, `BrowserWindow` present, `Pear.worker.pipe` absent |

## Desktop GUI And User Stories

| Gate | Expected | Result | Evidence |
| --- | --- | --- | --- |
| Production browser launch | stable `pear://tco5k7...` opens and backend connects |  |  |
| Runtime RPC smoke | `/status-smoke` reports DHT/proxy/relay readiness |  |  |
| Browse story | homepage `hyper://186891...` renders, reloads, site info correct |  |  |
| Fresh-launch landing story | PearBrowser landing front tab, `peerit` second tab |  |  |
| Catalogue story | Apps auto-loads, featured cards visible, search works |  |  |
| Latest-app-without-download story | app launches from catalogue row without project page/download/manual update |  |  |
| Existing featured app regression | Keet or equivalent standalone app still opens |  |  |
| Search story | local results immediate, no stale federation overwrite |  |  |
| Naming story | curated alias and/or petname resolves with provenance |  |  |
| Nostr trusted-contact story | only attested contact events render as trusted |  |  |
| Site publishing story | test site publishes, reloads from copied `hyper://` link |  |  |
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
| `npm test` | 136/136 pass | PASS | 2026-06-23 local run in `PearBrowser`: pass `136/136` |
| `git diff --check` | clean | PASS | 2026-06-23 local run in `PearBrowser` exited 0 |
| `npm audit --audit-level=high` | exit 0 | PASS | 2026-06-23 local run exited 0; full audit still reports 15 moderate Expo/React Native toolchain advisories |
| `npm run release:preflight -- --soft --json` | 14 pass / 0 warn / 4 expected production blockers before credentials | PASS | 2026-06-23 local JSON run: 14 pass, 0 warn, 4 fail for signing/store markers only |
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
