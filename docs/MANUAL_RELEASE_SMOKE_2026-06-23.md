# Manual Release Smoke - 2026-06-23

Purpose: final human-run smoke checklist for the PearBrowser community release.
Automated tests and fresh-peer verifiers prove most protocol and catalogue
behavior, but these checks cover UI flows, third-party trust decisions, and
mobile distribution gates that should not be faked by automation.

Record the operator, date, machine/device, commit SHA, and any screenshots or
logs in `docs/RELEASE_SMOKE_EVIDENCE_LOG_2026-06-23.md` before public
announcement.

## Desktop Release Candidate

- [ ] Confirm branch/head:
  - Desktop repo: `bigdestiny2/pearbrowser-desktop`, PR #5 head recorded for
    this release pass.
  - Mobile repo evidence:
    `bigdestiny2/PearBrowser@c98f329521f10257372ef38f8b750e84f3b2580a`
    or newer; runtime checks in the evidence docs use source baseline
    `de85d420c942d433905324c3e098acc34458a23a`.
  - Desktop CI for the head is green.
- [ ] Run local desktop smoke commands with real network access:
  - `npm test`
  - `git diff --check`
  - `npm audit --audit-level=high`
  - `node scripts/check-relays.js`
  - `node scripts/verify-pin.js --expect 18614 --hiverelay`
  - `node scripts/verify-release-contents.js --expect 18614 --missing /.landing-seed.mjs --missing /pearbrowser-storage --missing /docs --missing /scripts --missing /examples --missing /test`
  - `node scripts/verify-live-catalog.js --expect-app peercord --expect-app peerit --expect-app hiveworm`
- [ ] After filling `docs/RELEASE_SMOKE_EVIDENCE_LOG_2026-06-23.md`, run
  `npm run check:release-evidence`.
  - Expected before manual gates are filled: non-zero with blank/incomplete
    rows listed.
  - Expected before announcement: exit `0`.
- [ ] Launch the production browser link:
  - `pear://tco5k7h38uoxatedp1wongdbhjxow1x7jiwm3t1i9cujbebhsbty`
  - Expected: browser opens, backend RPC connects, default page loads.
  - In a terminal, run `node scripts/runtime-rpc-smoke.mjs`.
  - Expected: diagnostic RPC reports `dhtConnected: true`, a non-zero
    `proxyPort`, and at least one configured HiveRelay without becoming the
    renderer or closing the app.
- [ ] Browse user story:
  - Open `hyper://1868916a7a282ff0f211b536e9642828c32d3a817a254e1ef7e602709e25d/`.
  - Expected: page renders, About-this-site shows the drive key, reload works.
- [ ] Fresh-launch landing story:
  - Start with no saved tab/session state or a clean browser profile.
  - Expected: the PearBrowser landing page opens as the active front Browse tab,
    `peerit` is still available as the second tab, and Sites discovery pins
    `peerit` first.
- [ ] Catalogue user story:
  - Open Apps.
  - Expected: PearBrowser Network catalogue auto-loads.
  - Confirm featured cards: Keet, PearPass, anonGPT, Paste, Peercord.
  - Search for `peercord`, `peerit`, `keet`, and `paste`.
  - Expected: each result is discoverable, metadata is readable, launch action
    matches the catalogue type.
- [ ] Latest-app-without-download user story:
  - From the catalogue, launch a known Pear app without visiting its project
    page or downloading an installer.
  - Expected: launch progress appears and the app opens from the stable
    catalogue row/link.
- [ ] Peercord trust-prompt gate:
  - Launch Peercord from the featured Apps row:
    `pear://wmir47w7mai3b1skj66mx7fzso6k6o91kipaney7gtt69npimouy`
  - Explicitly review and approve Pear's persistent third-party trust prompt.
  - Expected: Peercord opens in its own window.
  - Do not automate this approval. It executes third-party code and creates a
    persistent trust decision.
- [ ] Peercord launch-mode gate:
  - Confirm Peercord does not show a `Run in tab` action.
  - Expected: it is marked window-only/standalone until upstream publishes a
    pear-request worker/headless entry.
- [ ] Existing featured app regression:
  - Launch Keet or another already-known featured Pear app.
  - Expected: standalone launch still works after the Peercord catalogue change.
- [ ] Search user story:
  - Use local search with a common term and an empty/non-string edge via UI where
    possible.
  - Expected: immediate local results, no UI lockup, no stale federation result
    overwrites.
- [ ] Naming user story:
  - Resolve a curated alias and a local petname if one exists on the test
    profile.
  - Expected: URL bar resolves through the typed-name path and shows provenance
    rather than pretending every name has the same trust level.
- [ ] Nostr trusted-contact story:
  - If test contacts are configured, open the trusted-contact Nostr view.
  - Expected: only events from attested contact keys show as trusted; revoked or
    forged bindings do not display as trusted.
- [ ] Site publishing story:
  - Create or open a small test site, publish it, copy the `hyper://` URL, reload
    it in Browse, and verify the publish/pin status.
  - Expected: generated site loads from its Hyperdrive and the copied link works
    after a relaunch.
- [ ] Library/session story:
  - Bookmark a site, close/reopen a tab, relaunch the browser.
  - Expected: tabs/bookmarks persist and reload without losing history.

## Mobile Native Release Candidate

- [ ] Run local mobile smoke commands:
  - `npm test`
  - `git diff --check`
  - `npm audit --audit-level=high`
  - `npm run release:preflight -- --soft`
- [ ] Confirm `npm run release:preflight` is the hard gate:
  - Expected before production credentials: it fails for Android signing, Apple
    team signing, iOS store validation, and Android store validation only.
  - Expected before announcement: it passes without `--soft` using real signing
    and store/distribution evidence.
- [ ] iOS simulator/device smoke:
  - Build/install/launch the tracked SwiftUI shell.
  - Expected: Home reaches green `Connected`, stale-Corestore recovery does not
    block worklet boot, Browse can load a `hyper://` page.
- [ ] Android emulator/device smoke:
  - Build/install/launch the native Android shell with Temurin 17 or a known-good
    JDK.
  - Expected: Home reaches green `Connected`, no first-launch bookmark-error
    banner, Browse can load a `hyper://` page.
- [ ] Mobile share user story:
  - Open a page in Android Browse and trigger `window.pear.share(url)` from the
    injected bridge or a fixture page.
  - Expected: Android system share sheet opens with the URL as plain text.
- [ ] Mobile app catalogue story:
  - Open Explore/App Store, fetch a catalogue, search/filter entries, open a
    link-only safe row.
  - Expected: safe `hyper://`, `pear://`, and `file://` targets are preserved;
    targetless or unsafe rows are dropped.
- [ ] Mobile identity story:
  - Backup phrase screen reveals only after user action; restore flow rejects a
    bad phrase and accepts a valid test phrase only after confirmation.
- [ ] Mobile direct P2P API story:
  - Run the `examples/echo-peer` / `swarm.v1` fixture against a relay or paired
    device.
  - Expected: consent appears, topic join succeeds, send/receive/leave events
    behave as documented.
- [ ] Android production distribution:
  - Build signed release APK/AAB with the real upload/release keystore.
  - Validate in Play Console or Firebase App Distribution.
  - Set `PEARBROWSER_PLAY_CONSOLE_VALIDATED=1` or
    `PEARBROWSER_FIREBASE_APP_DISTRIBUTION_VALIDATED=1` and rerun
    `npm run release:preflight`.
- [ ] iOS production distribution:
  - Archive with the real Apple development team.
  - Validate/upload in App Store Connect or TestFlight.
  - Set `PEARBROWSER_APP_STORE_CONNECT_VALIDATED=1` or
    `PEARBROWSER_TESTFLIGHT_VALIDATED=1` and rerun
    `npm run release:preflight`.

## Announcement Hold Criteria

Do not announce the release if any of these remain unchecked:

- Peercord trust prompt was not manually reviewed and approved.
- Peercord opens incorrectly as a headless/in-tab app.
- Live catalogue or production browser drive cannot be fetched from a fresh peer
  with real network access.
- Desktop app launch from catalogue requires visiting a project page, manual
  download, or manual update.
- Mobile `npm run release:preflight` fails for anything other than intentionally
  deferred mobile-store distribution.
- A real-device/mobile smoke test exposes WebView bridge, permission, or worklet
  boot failures that are not documented as mobile-only follow-up.
- `npm run check:release-evidence` exits non-zero after the operator evidence
  log is supposed to be complete.
