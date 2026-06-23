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
| Operator |  |
| Date/time started |  |
| Desktop repo/branch/head |  |
| Desktop PR/CI URL |  |
| Mobile repo/head |  |
| macOS machine |  |
| iOS simulator/device(s) |  |
| Android emulator/device(s) |  |
| Network/location |  |
| Notes directory |  |

## Desktop Automated Baseline

| Gate | Expected | Result | Evidence |
| --- | --- | --- | --- |
| `npm test` | 422/422 pass |  |  |
| `git diff --check` | clean |  |  |
| `npm audit --audit-level=high` | 0 high vulnerabilities |  |  |
| Desktop CI | install/test/audit success |  |  |
| `node scripts/check-relays.js` | real-DHT relay reachable |  |  |
| `node scripts/verify-pin.js --expect 18552` | length >= 18552, sampled blob present |  |  |
| `node scripts/verify-release-contents.js ...` | forbidden paths absent |  |  |
| `node scripts/verify-live-catalog.js --expect-app peercord --expect-app peerit --expect-app hiveworm` | signed catalogue, 14 apps, expected rows |  |  |
| `node scripts/verify-app-full.js` homepage | sampled blobs present |  |  |
| `node scripts/verify-app-full.js` Peercord | sampled blobs present, no execution |  |  |
| `node scripts/verify-app-full.js` Keet | sampled blobs present, no execution |  |  |
| Peercord Linux bundle contract | `type:"desktop"`, `BrowserWindow`, no `Pear.worker.pipe` |  |  |
| Peercord Windows bundle contract | `type:"desktop"`, `BrowserWindow`, no `Pear.worker.pipe` |  |  |

## Desktop GUI And User Stories

| Gate | Expected | Result | Evidence |
| --- | --- | --- | --- |
| Production browser launch | stable `pear://tco5k7...` opens and backend connects |  |  |
| Runtime RPC smoke | `/status-smoke` reports DHT/proxy/relay readiness |  |  |
| Browse story | homepage `hyper://186891...` renders, reloads, site info correct |  |  |
| Fresh-launch peerit story | `peerit` front tab, landing page second tab |  |  |
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
| `npm test` | 136/136 pass |  |  |
| `git diff --check` | clean |  |  |
| `npm audit --audit-level=high` | exit 0 |  |  |
| `npm run release:preflight -- --soft --json` | 14 pass / 0 warn / 4 expected production blockers before credentials |  |  |
| Generated Expo iOS Debug simulator build | succeeds |  |  |
| Generated Expo iOS Release simulator build | succeeds with Pods Hermes compiler path |  |  |
| Tracked SwiftUI iOS shell | build/install/launch reaches green Connected |  |  |
| Android debug build/emulator launch | build/install/launch reaches green Connected with known-good JDK |  |  |
| Android release APK/AAB disposable signing | build/verifies with test key |  |  |

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
